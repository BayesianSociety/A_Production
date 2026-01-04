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