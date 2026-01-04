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