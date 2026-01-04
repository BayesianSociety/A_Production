Perfect—now that you’re DB-driven, you have two clean ways to add or change content:

* **GUI (fast & manual):** Prisma Studio
* **CLI scripts (repeatable & safe):** small `node` utilities you run with JSON

Below I give you both, plus ready-to-drop scripts for **adding/updating animals** (with EN/NL text and Wikipedia links) and **adding questions**. At the end: what to run to make the frontend pick up your changes.

---

# Option 1 — Prisma Studio (no code)

1. Start the GUI:

```bash
npx prisma studio
```

2. Add content:

   * **Animal**

     * `Animal`: create a row (`slug` = e.g. `hippo`, `groupNumber` = group index starting at 1, `region` optional, `isActive = true`).
     * `AnimalI18n`: two rows for the same `animalId`:

       * (`langCode = 'en'`, `name`, `fact`)
       * (`langCode = 'nl'`, `name`, `fact`)
     * **Links (Wikipedia)**

       * `Media`: create two rows per animal:

         * `url` = full image URL, `role = 'photo'`
         * `url` = mini/thumb URL, `role = 'mini'`
       * `AnimalMedia`: link each `Media` row to your `Animal` (set `role` accordingly; mark the photo as `primary = true`)
     * **Continents**

       * `AnimalContinent`: one row per continent (codes like `AF, EU, AS, NA, SA, OC, AN, AU`).
         If a code isn’t in the `Continent` table yet, add it once in `Continent` (e.g., `AU`).
   * **Question**

     * `Question`: make a row (`isActive = true`, `answerAnimalId` = the animal’s `id` FK if you want it linked).
     * `QuestionI18n`: two rows with `prompt` for `en` and `nl`.

3. Rebuild the frontend globals (see “Make the frontend see your changes” below).

---

# Option 2 — CLI scripts (ready to use)

Add these two files to your repo.

### A) `scripts/upsert-animal.js`

Upserts one or more animals (reads JSON). Supports EN/NL, Wikipedia links, continents, and group number.

```js
// scripts/upsert-animal.js
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function readJson(p) {
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  return JSON.parse(fs.readFileSync(abs, "utf-8"));
}

function slugify(v) {
  if (!v) return null;
  const s = String(v).normalize("NFKD").toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "");
  return s || null;
}

const CONTINENT_CODES = new Set(["AF","AN","AS","EU","NA","SA","OC","AU"]);
async function ensureContinents(codes){
  const need = Array.from(new Set(codes.filter(c => CONTINENT_CODES.has(c))));
  for (const code of need) {
    await prisma.continent.upsert({ where: { code }, update: {}, create: { code } });
  }
}

async function getOrCreateMedia(url, role) {
  if (!url) return null;
  const found = await prisma.media.findFirst({ where: { url, role } });
  if (found) return found;
  return prisma.media.create({ data: { url, role } });
}

async function upsertAnimal(payload) {
  const slug = payload.id || payload.slug || slugify(payload?.name?.en || payload?.name?.nl);
  if (!slug) throw new Error("Animal needs id/slug or at least name.en/nl to derive one.");

  // base animal
  const animal = await prisma.animal.upsert({
    where: { slug },
    update: {
      groupNumber: payload.groupNumber ?? 1,
      region: payload.region ?? null,
      isActive: true
    },
    create: {
      slug,
      groupNumber: payload.groupNumber ?? 1,
      region: payload.region ?? null,
      isActive: true
    }
  });

  // i18n
  if (payload?.name?.en || payload?.fact?.en) {
    await prisma.animalI18n.upsert({
      where: { animalId_langCode: { animalId: animal.id, langCode: "en" } },
      update: { name: payload?.name?.en, fact: payload?.fact?.en ?? null },
      create: { animalId: animal.id, langCode: "en", name: payload?.name?.en || slug, fact: payload?.fact?.en ?? null }
    });
  }
  if (payload?.name?.nl || payload?.fact?.nl) {
    await prisma.animalI18n.upsert({
      where: { animalId_langCode: { animalId: animal.id, langCode: "nl" } },
      update: { name: payload?.name?.nl, fact: payload?.fact?.nl ?? null },
      create: { animalId: animal.id, langCode: "nl", name: payload?.name?.nl || payload?.name?.en || slug, fact: payload?.fact?.nl ?? null }
    });
  }

  // continents
  const continents = Array.isArray(payload.continents) ? payload.continents : [];
  await ensureContinents(continents);
  for (const code of continents) {
    try {
      await prisma.animalContinent.create({ data: { animalId: animal.id, continentCode: code } });
    } catch { /* ignore duplicate */ }
  }

  // wikipedia links as Media
  const photo = await getOrCreateMedia(payload.photo, "photo");
  const mini  = await getOrCreateMedia(payload.mini,  "mini");

  if (photo) {
    try {
      await prisma.animalMedia.upsert({
        where: { animalId_mediaId: { animalId: animal.id, mediaId: photo.id } },
        update: { role: "photo", primary: true },
        create: { animalId: animal.id, mediaId: photo.id, role: "photo", primary: true }
      });
    } catch {}
  }
  if (mini) {
    try {
      await prisma.animalMedia.upsert({
        where: { animalId_mediaId: { animalId: animal.id, mediaId: mini.id } },
        update: { role: "mini" },
        create: { animalId: animal.id, mediaId: mini.id, role: "mini" }
      });
    } catch {}
  }

  return animal.slug;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: node scripts/upsert-animal.js ./content/animal.json");

  const data = readJson(file);
  const items = Array.isArray(data) ? data : [data];

  let ok = 0;
  for (const an of items) {
    const slug = await upsertAnimal(an);
    console.log("Upserted animal:", slug);
    ok++;
  }
  console.log(`Done. ${ok} animal(s) upserted.`);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); })
       .finally(async () => { await prisma.$disconnect(); });
```

**Example JSON (`content/hippo.json`):**

```json
{
  "id": "hippo",
  "groupNumber": 2,
  "region": "Africa",
  "continents": ["AF"],
  "name": { "en": "Hippopotamus", "nl": "Nijlpaard" },
  "fact": { "en": "Hippos spend a lot of time in water.", "nl": "Nijlpaarden brengen veel tijd door in het water." },
  "photo": "https://upload.wikimedia.org/hippo.jpg",
  "mini":  "https://upload.wikimedia.org/hippo.jpg"
}
```

Run:

```bash
node scripts/upsert-animal.js ./content/hippo.json
```

---

### B) `scripts/upsert-question.js`

Creates questions (EN/NL) tied to an `answerId` = animal slug.

```js
// scripts/upsert-question.js
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function readJson(p) {
  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  return JSON.parse(fs.readFileSync(abs, "utf-8"));
}

async function upsertQuestion(q) {
  const answer = q.answerId
    ? await prisma.animal.findUnique({ where: { slug: String(q.answerId) } })
    : null;

  const created = await prisma.question.create({
    data: {
      difficulty: q.difficulty ?? 1,
      groupNumber: q.groupNumber ?? null,
      isActive: q.isActive ?? true,
      answerAnimalId: answer?.id || null
    }
  });

  if (q.prompt?.en) {
    await prisma.questionI18n.upsert({
      where: { questionId_langCode: { questionId: created.id, langCode: "en" } },
      update: { prompt: q.prompt.en },
      create: { questionId: created.id, langCode: "en", prompt: q.prompt.en }
    });
  }
  if (q.prompt?.nl) {
    await prisma.questionI18n.upsert({
      where: { questionId_langCode: { questionId: created.id, langCode: "nl" } },
      update: { prompt: q.prompt.nl },
      create: { questionId: created.id, langCode: "nl", prompt: q.prompt.nl }
    });
  }

  return created.id;
}

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: node scripts/upsert-question.js ./content/questions.json");

  const data = readJson(file);
  const items = Array.isArray(data) ? data : [data];

  let ok = 0;
  for (const q of items) {
    const id = await upsertQuestion(q);
    console.log("Inserted question id:", id);
    ok++;
  }
  console.log(`Done. ${ok} question(s) inserted.`);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); })
       .finally(async () => { await prisma.$disconnect(); });
```

**Example JSON (`content/questions.json`):**

```json
[
  { "prompt": { "en": "Which animal yawns with huge jaws?", "nl": "Welk dier gaapt met enorme kaken?" }, "answerId": "hippo" },
  { "prompt": { "en": "Which one has stripes?", "nl": "Welke heeft strepen?" }, "answerId": "tiger" }
]
```

Run:

```bash
node scripts/upsert-question.js ./content/questions.json
```

---

## Add npm scripts (optional sugar)

In `package.json`:

```json
"scripts": {
  "db:studio": "npx prisma studio",
  "db:add:animal": "node scripts/upsert-animal.js",
  "db:add:question": "node scripts/upsert-question.js",
  "build:globals": "node scripts/build-globals-from-db.js"
}
```

Usage:

```bash
npm run db:add:animal -- ./content/hippo.json
npm run db:add:question -- ./content/questions.json
```

---

## Make the frontend see your changes

Because your page reads from **`public/data/generated-data.js`**, regenerate it after any DB change:

```bash
npm run build:globals
```

Then **hard refresh** the browser (Ctrl/Cmd+Shift+R). Quick console checks:

```js
animalGroups.flat().map(a => a.id)   // includes new slug(s)
animalQuestions.map(q => q.answerId) // includes new answers
```

> If you later switch the frontend to **fetch** from `/api` instead of the generated file, you won’t need the build step—your changes will appear immediately.

---

## Editing / Deleting

* **Edit:** run `npx prisma studio` and change fields; or re-run `upsert-animal.js` with the same `id/slug` & updated fields.
* **Delete:** in Prisma Studio delete rows in order:

  * `QuestionI18n` → `Question`
  * `AnimalMedia` & `AnimalContinent` → `AnimalI18n` → `Animal`
    (Prisma will complain if dependent rows exist—remove them first.)
* After edits/deletes: `npm run build:globals` again.

---

If you paste one example animal you want to add next (EN/NL names, facts, continent codes, and two Wikipedia URLs), I’ll output a ready-to-use JSON file for it—and a matching question—so you can drop it into `content/` and run the scripts immediately.
