Awesome—here’s a clear, two-track plan to get your game online for everyone. Pick **A (fastest: static hosting)** if you’re okay rebuilding when content changes, or **B (proper full-stack)** if you want the site to read directly from a database on the server.

---

# A) Fastest path: **static hosting** (no server, no DB online)

### When to choose this

* Your game already works with `public/data/generated-data.js`.
* Images are external (Wikipedia) ✔️
* Only devs add content. You can regenerate & upload when content changes.

### Steps

1. **On your dev machine (current project):**

   ```bash
   # ensure DB is correct (local)
   npm run import:index
   npm run build:globals     # writes public/data/generated-data.js with real data
   npm run dev               # quick smoke test at http://localhost:3000
   ```

   In the browser console:

   ```js
   animalGroups.length > 0
   animalQuestions.length > 0
   ```

2. **Make a deployable folder**
   Your deploy artifact is the **contents of `public/`** (HTML, JS, CSS, map SVGs, generated-data.js).

3. **Upload `public/` to any static host**
   (e.g., Cloudflare Pages / Netlify / GitHub Pages / S3+CloudFront / your company’s static web server).

   * Ensure it serves at the site root so paths like `/lib/svg-world-map.js` and `/data/generated-data.js` work.
   * If you deploy under a subpath (e.g. `/animals/`), change script `src` paths to be **relative** (`./lib/...`, `./data/...`) or set a `<base href="/animals/">`.

4. **Attach a domain + HTTPS**

   * Point your domain (e.g., `animals.yourdomain.com`) to the static host and enable HTTPS (most providers do this automatically).

5. **When content changes**

   ```bash
   npm run import:index
   npm run build:globals
   # re-upload the updated public/ folder (or CI build step)
   ```

🎯 Result: globally accessible, very low maintenance.
Trade-off: not truly “live DB”—updates go through a rebuild step.

---

# B) Full-stack path: **Node API + Postgres** on a server (recommended)

### When to choose this

* You want the site to stay “database-driven” on the internet.
* You’ll add/modify content by running your scripts on the server.
* You’re okay managing a small VPS (or a PaaS).

Below is a **VPS + Docker** recipe that’s provider-agnostic.

---

## 1) Prep your repo for production DB

**Switch Prisma to Postgres** (strongly recommended for a public site).

* In `prisma/schema.prisma`:

  ```prisma
  datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
  }
  ```
* Create `.env.production` (local copy first):

  ```env
  NODE_ENV=production
  PORT=3000
  # will point to your Postgres container in docker-compose
  DATABASE_URL=postgresql://postgres:postgres@db:5432/worldanimals?schema=public
  ```

> We’ll re-import your animals/questions into Postgres, so no tricky DB migration.

---

## 2) Add Docker files

**Dockerfile**

```Dockerfile
# Dockerfile
FROM node:20-slim

WORKDIR /app

# Install deps
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Build Prisma client for linux
RUN npx prisma generate

# Expose port
EXPOSE 3000

# Start: run migrations and server
CMD [ "bash", "-lc", "npx prisma migrate deploy && node src/server.js" ]
```

**docker-compose.yml** (app + Postgres + reverse proxy via Caddy for auto-HTTPS)

```yaml
version: "3.9"
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: worldanimals
    volumes:
      - db_data:/var/lib/postgresql/data
    networks: [web]

  app:
    build: .
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://postgres:postgres@db:5432/worldanimals?schema=public
    depends_on: [db]
    networks: [web]

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on: [app]
    networks: [web]

networks:
  web:

volumes:
  db_data:
  caddy_data:
  caddy_config:
```

**Caddyfile** (replace `animals.example.com` with your domain)

```
animals.example.com {
  encode zstd gzip
  @static path / /index.html /lib/* /data/* /img/* /assets/* /favicon.ico
  handle @static {
    reverse_proxy app:3000
  }
  reverse_proxy app:3000
}
```

> Caddy auto-provisions TLS certificates via Let’s Encrypt. Just point DNS to your server’s IP before starting.

---

## 3) Provision a VPS & point DNS

* Create a small Linux VM (e.g., Ubuntu 22.04).
* Set DNS A-record: `animals.example.com → <server IP>`.
* SSH into the server and install Docker + compose plugin:

  ```bash
  # Ubuntu example
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  ```

---

## 4) Deploy your app

* Copy your repo to the server (git clone or `rsync`).

* On the server root of your project:

  ```bash
  docker compose build
  docker compose up -d
  # first run pulls certs (needs DNS in place)
  ```

* Apply Prisma schema to Postgres **inside the app container**:

  ```bash
  docker compose exec app npx prisma migrate deploy
  ```

* **Import your content** (from your current `public/index.html`):

  ```bash
  docker compose exec app node scripts/import-from-index.js ./public/index.html
  ```

* (If your frontend still uses build-time globals) build them on the server:

  ```bash
  docker compose exec app npm run build:globals
  ```

Visit `https://animals.example.com` 🎉

---

## 5) Keep it DB-driven (two choices)

* **Keep your current pattern (build-time globals):**
  Keep running:

  ```bash
  docker compose exec app node scripts/import-from-index.js ./public/index.html
  docker compose exec app npm run build:globals
  ```

  whenever content changes. The page loads instantly with no API call.

* **Or switch to runtime fetching:**
  Change your `index.html` to fetch `/api/animals/groups` and `/api/questions` (you already have those route examples). This removes the build step and reads straight from Postgres.

---

## 6) Production hygiene

* **Backups:** add a cron on the host:

  ```bash
  # daily at 03:00
  0 3 * * * docker exec $(docker ps -qf name=_db_ ) pg_dump -U postgres worldanimals \
      | gzip > /var/backups/worldanimals-$(date +\%F).sql.gz
  ```
* **Logs:** `docker compose logs -f app` (and `db`, `caddy`).
* **Updates:** `git pull && docker compose build && docker compose up -d`.
* **Env secrets:** move DB password to a `.env` file or Docker secrets in production.

---

## 7) Quick troubleshooting checklist

* **White page / nothing happens:** open DevTools → Console. If `LANGUAGES.map` error, regenerate `generated-data.js` with LANGUAGES as an **array** (we fixed this earlier).
* **Map missing:** ensure `/lib/world-states.svg` and `/lib/world-states-provinces.svg` exist and `libPath: "/lib/"` is set.
* **No animals/questions:**

  * `curl https://animals.example.com/data/generated-data.js` should contain arrays with data; or, for runtime, `curl https://animals.example.com/api/animals/groups`.
  * Re-run `import-from-index.js` and (if using build-time) `build:globals`.

---

## Which path should you pick?

* **Need the simplest global access today?** Choose **A (static)**.
* **Want a true DB-backed site you can grow?** Choose **B (full-stack)**.

If you tell me which route you prefer (and your domain), I’ll tailor the exact `Caddyfile`/`nginx.conf`, env files, and (if you want runtime fetching) the tiny frontend changes to swap from build-time globals to `/api` calls.
