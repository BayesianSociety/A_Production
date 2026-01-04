// scripts/ensure-continents.js
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const codes = ["AF","AN","AS","EU","NA","SA","OC","AU"];
for (const code of codes) {
  await prisma.continent.upsert({ where: { code }, update: {}, create: { code } });
}
console.log("Ensured continents:", codes.join(", "));
await prisma.$disconnect();
