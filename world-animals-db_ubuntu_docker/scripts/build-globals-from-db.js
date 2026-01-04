// scripts/build-globals-from-db.js
import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";

const prisma = new PrismaClient();

async function main() {
  // Load animals with i18n, media, and continents
  const animals = await prisma.animal.findMany({
    where: { isActive: true },
    orderBy: [{ groupNumber: "asc" }, { slug: "asc" }],
    include: {
      i18n: true,
      mediaLink: { include: { media: true } },
      habitats: true,
    },
  });

  // Group into the exact shape of your original `animalGroups` (array of arrays)
  const byGroup = new Map();
  for (const a of animals) {
    const en = a.i18n.find(x => x.langCode === "en");
    const nl = a.i18n.find(x => x.langCode === "nl");
    const photoRel = a.mediaLink.find(m => m.media.role === "photo" && m.primary) || a.mediaLink.find(m => m.media.role === "photo");
    const miniRel  = a.mediaLink.find(m => m.media.role === "mini");

    const item = {
      id: a.slug,
      region: a.region,
      name: { en: en?.name || a.slug, nl: nl?.name || en?.name || a.slug },
      fact: { en: en?.fact || null, nl: nl?.fact || null },
      photo: photoRel ? (photoRel.media.url || photoRel.media.localPath) : null,
      mini:  miniRel  ? (miniRel.media.url  || miniRel.media.localPath)  : null,
      continents: a.habitats.map(h => h.continentCode),
    };

    const g = a.groupNumber || 1;
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(item);
  }
  const groups = Array.from(byGroup.keys()).sort((a,b)=>a-b).map(k => byGroup.get(k));

  // Questions in your original shape
  const qs = await prisma.question.findMany({
    where: { isActive: true },
    orderBy: { id: "asc" },
    include: { i18n: true, answerAnimal: true },
  });
  const questions = qs.map(q => {
    const en = q.i18n.find(x => x.langCode === "en");
    const nl = q.i18n.find(x => x.langCode === "nl");
    return {
      prompt: { en: en?.prompt || "", nl: nl?.prompt || en?.prompt || "" },
      answerId: q.answerAnimal?.slug || null,
      difficulty: q.difficulty,
      groupNumber: q.groupNumber || null,
    };
  });

  // Build a file that defines real page-globals (exact `const` names),
  // plus `window.*` so you can also access them from devtools if needed.
const out =
  `// generated from DB\n` +
  // MUST be an array; your UI calls LANGUAGES.map(...)
  `window.LANGUAGES = ${JSON.stringify([
    { code: "en", label: "English" },
    { code: "nl", label: "Nederlands" }
  ])};\n` +
  `window.animalGroups = ${JSON.stringify(groups)};\n` +
  `window.animalQuestions = ${JSON.stringify(questions)};\n` +
  // legacy aliases so your inline code “sees” them as globals
  `var LANGUAGES = window.LANGUAGES;\n` +
  `var animalGroups = window.animalGroups;\n` +
  `var animalQuestions = window.animalQuestions;\n`;

  const outDir = path.join(process.cwd(), "public", "data");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "generated-data.js"), out);
  console.log("Wrote public/data/generated-data.js");
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
