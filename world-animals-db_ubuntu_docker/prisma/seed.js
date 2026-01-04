// prisma/seed.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();


async function main() {
// Languages EN/NL
await prisma.language.upsert({
where: { code: "en" },
update: {},
create: { code: "en", name: "English" },
});
await prisma.language.upsert({
where: { code: "nl" },
update: {},
create: { code: "nl", name: "Nederlands" },
});


// Optional: a couple UI string keys as examples (add more as you move texts into DB)
await prisma.uIString.upsert({
where: { key_langCode: { key: "ui.play", langCode: "en" } },
update: { value: "Play" },
create: { key: "ui.play", langCode: "en", value: "Play" },
});
await prisma.uIString.upsert({
where: { key_langCode: { key: "ui.play", langCode: "nl" } },
update: { value: "Spelen" },
create: { key: "ui.play", langCode: "nl", value: "Spelen" },
});
}


main()
.then(async () => { await prisma.$disconnect(); })
.catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });