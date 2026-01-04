// scripts/import-from-index.js
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SRC = process.argv[2] || path.join(process.cwd(), "public", "index.html");

// --- helpers ---
function extractArray(namedConst, text) {
  // Find: const <name> = [ ... ];
  const startDecl = new RegExp(`const\\s+${namedConst}\\s*=\\s*\\[`, "m");
  const m = text.match(startDecl);
  if (!m) return null;
  let i = m.index + m[0].lastIndexOf("["); // position at first '['
  // Scan to the matching closing ']'
  let depth = 0, j = i;
  for (; j < text.length; j++) {
    const ch = text[j];
    if (ch === "[") depth++;
    else if (ch === "]") { depth--; if (depth === 0) { j++; break; } }
  }
  return text.slice(i, j); // NOTE: already includes the outer [ ... ]
}

function toJsonish(src) {
  // Strip block & line comments
  src = src.replace(/\/\*[\s\S]*?\*\//g, "");
  src = src.replace(/(^|[^:])\/\/.*$/gm, "$1");

  // Quote unquoted keys (at any nesting)
  src = src.replace(/([\{\[,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":');

  // Remove trailing commas
  src = src.replace(/,\s*([}\]])/g, "$1");

  return src.trim(); // IMPORTANT: do NOT wrap in [] — src already has [ ... ]
}

function slugify(v) {
  if (!v) return null;
  const s = String(v).normalize("NFKD").toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-").replace(/^-+|-+$/g, "");
  return s || null;
}

// Reuse a media row if the same URL/role already exists
async function getOrCreateMedia(url, role) {
  const existing = await prisma.media.findFirst({ where: { url, role } });
  if (existing) return existing;
  return prisma.media.create({ data: { url, role } });
}

// Map your AU (Australia) code; we’ll also upsert AU as a Continent so FKs pass
const CONTINENT_CODES = new Set(["AF","AN","AS","EU","NA","SA","OC","AU"]);
function normalizeContinentCode(c) {
  return CONTINENT_CODES.has(c) ? c : null;
}

async function upsertAnimal(an, groupNumber) {
  const slug = an.id || an.slug || slugify(an.name?.en || an.name?.nl);
  if (!slug) { console.warn("Skipping animal without id/name:", an); return; }

  const animal = await prisma.animal.upsert({
    where: { slug },
    update: { groupNumber, region: an.region || null, isActive: true },
    create: { slug, groupNumber, region: an.region || null },
  });

  // i18n
  if (an.name?.en || an.fact?.en) {
    await prisma.animalI18n.upsert({
      where: { animalId_langCode: { animalId: animal.id, langCode: "en" } },
      update: { name: an.name?.en, fact: an.fact?.en || null },
      create: { animalId: animal.id, langCode: "en", name: an.name?.en || slug, fact: an.fact?.en || null },
    });
  }
  if (an.name?.nl || an.fact?.nl) {
    await prisma.animalI18n.upsert({
      where: { animalId_langCode: { animalId: animal.id, langCode: "nl" } },
      update: { name: an.name?.nl, fact: an.fact?.nl || null },
      create: { animalId: animal.id, langCode: "nl", name: an.name?.nl || an.name?.en || slug, fact: an.fact?.nl || null },
    });
  }

  // Media (Wikipedia links only, no uploads)
  if (an.photo) {
    const m = await getOrCreateMedia(an.photo, "photo");
    await prisma.animalMedia.upsert({
      where: { animalId_mediaId: { animalId: animal.id, mediaId: m.id } },
      update: { role: "photo", primary: true },
      create: { animalId: animal.id, mediaId: m.id, role: "photo", primary: true },
    });
  }
  if (an.mini) {
    const m2 = await getOrCreateMedia(an.mini, "mini");
    await prisma.animalMedia.upsert({
      where: { animalId_mediaId: { animalId: animal.id, mediaId: m2.id } },
      update: { role: "mini" },
      create: { animalId: animal.id, mediaId: m2.id, role: "mini" },
    });
  }

  // Continents
  for (const raw of (an.continents || [])) {
    const code = normalizeContinentCode(raw);
    if (!code) continue;
    try {
      await prisma.animalContinent.create({ data: { animalId: animal.id, continentCode: code } });
    } catch (_) { /* ignore duplicate */ }
  }
}

async function upsertQuestion(q) {
  const answerKey = q.answerId || q.answer || q.slug;
  const answer = answerKey
    ? await prisma.animal.findUnique({ where: { slug: String(answerKey) } })
    : null;

  const created = await prisma.question.create({
    data: {
      difficulty: 1,
      groupNumber: null,
      isActive: true,
      answerAnimalId: answer?.id || null,
    },
  });

  if (q.prompt?.en) {
    await prisma.questionI18n.upsert({
      where: { questionId_langCode: { questionId: created.id, langCode: "en" } },
      update: { prompt: q.prompt.en },
      create: { questionId: created.id, langCode: "en", prompt: q.prompt.en },
    });
  }
  if (q.prompt?.nl) {
    await prisma.questionI18n.upsert({
      where: { questionId_langCode: { questionId: created.id, langCode: "nl" } },
      update: { prompt: q.prompt.nl },
      create: { questionId: created.id, langCode: "nl", prompt: q.prompt.nl },
    });
  }
}

async function main() {
  const text = fs.readFileSync(SRC, "utf-8");

  // 1) animalGroups
  const groupsSrc = extractArray("animalGroups", text);
  if (!groupsSrc) throw new Error("animalGroups not found in index.html");
  const groupsJson = JSON.parse(toJsonish(groupsSrc)); // correct: already "[ ... ]"

  // If someone wrapped again (rare), unwrap one level
  const groups = (groupsJson.length === 1 && Array.isArray(groupsJson[0])) ? groupsJson[0] : groupsJson;

  // 2) ensure continents (including AU)
  const need = ["AF","AN","AS","EU","NA","SA","OC","AU"];
  for (const code of need) {
    await prisma.continent.upsert({ where: { code }, update: {}, create: { code } });
  }

  // 3) import animals by group
  let imported = 0;
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    if (!Array.isArray(group)) continue;
    for (const an of group) {
      await upsertAnimal(an, gi + 1);
      imported++;
    }
  }

  // 4) animalQuestions
  const qSrc = extractArray("animalQuestions", text);
  if (qSrc) {
    const qJson = JSON.parse(toJsonish(qSrc));
    for (const q of qJson) await upsertQuestion(q);
  }

  console.log(`Imported ${imported} animals and ${qSrc ? JSON.parse(toJsonish(qSrc)).length : 0} questions from index.html`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
