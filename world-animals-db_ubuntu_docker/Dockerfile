FROM node:20-bookworm-slim AS base

ENV NODE_ENV=production
WORKDIR /app

# Install required system dependencies
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install production dependencies first for better caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY prisma ./prisma
COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY content ./content

# Generate Prisma client for the container OS
RUN npx prisma generate

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
