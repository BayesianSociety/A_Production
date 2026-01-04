// scripts/import-country-data.js
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";


const prisma = new PrismaClient();
const FILE = path.join(process.cwd(), "data", "country-data.json");


const CONTINENT_NAMES = {
en: { AF: "Africa", AN: "Antarctica", AS: "Asia", EU: "Europe", NA: "North America", SA: "South America", OC: "Oceania" },
nl: { AF: "Afrika", AN: "Antarctica", AS: "Azië", EU: "Europa", NA: "Noord-Amerika", SA: "Zuid-Amerika", OC: "Oceanië" }
};


async function main() {
const raw = JSON.parse(fs.readFileSync(FILE, "utf-8"));


// Ensure continent rows
for (const code of Object.keys(CONTINENT_NAMES.en)) {
await prisma.continent.upsert({ where: { code }, update: {}, create: { code } });
// Store i18n labels via UIString: keys like continent.AF
for (const [langCode, names] of Object.entries(CONTINENT_NAMES)) {
await prisma.uIString.upsert({
where: { key_langCode: { key: `continent.${code}`, langCode } },
update: { value: names[code] },
create: { key: `continent.${code}`, langCode, value: names[code] },
});
}
}


// Countries (use English name from your JSON; NL name left null unless you provide it later)
for (const [iso2, row] of Object.entries(raw)) {
if (iso2 === "World") continue;
const continentCode = row.region || null; // e.g. 'EU'
if (!continentCode) continue;
await prisma.country.upsert({
where: { iso2 },
update: { name_en: row.name, continentCode },
create: { iso2, name_en: row.name, continentCode },
});
}


console.log("Imported continents & countries.");
}


main()
.then(async () => { await prisma.$disconnect(); })
.catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });