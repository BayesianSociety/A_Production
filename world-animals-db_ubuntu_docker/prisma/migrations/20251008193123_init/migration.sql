-- CreateTable
CREATE TABLE "Language" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "UIString" (
    "key" TEXT NOT NULL,
    "langCode" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("key", "langCode"),
    CONSTRAINT "UIString_langCode_fkey" FOREIGN KEY ("langCode") REFERENCES "Language" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Continent" (
    "code" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "Country" (
    "iso2" TEXT NOT NULL PRIMARY KEY,
    "name_en" TEXT NOT NULL,
    "name_nl" TEXT,
    "continentCode" TEXT NOT NULL,
    CONSTRAINT "Country_continentCode_fkey" FOREIGN KEY ("continentCode") REFERENCES "Continent" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Animal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "groupNumber" INTEGER NOT NULL,
    "region" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "AnimalI18n" (
    "animalId" INTEGER NOT NULL,
    "langCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fact" TEXT,
    "altText" TEXT,

    PRIMARY KEY ("animalId", "langCode"),
    CONSTRAINT "AnimalI18n_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnimalI18n_langCode_fkey" FOREIGN KEY ("langCode") REFERENCES "Language" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Media" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT,
    "localPath" TEXT,
    "role" TEXT NOT NULL,
    "attribution" TEXT,
    "license" TEXT
);

-- CreateTable
CREATE TABLE "AnimalMedia" (
    "animalId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "role" TEXT,
    "primary" BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY ("animalId", "mediaId"),
    CONSTRAINT "AnimalMedia_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnimalMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AnimalContinent" (
    "animalId" INTEGER NOT NULL,
    "continentCode" TEXT NOT NULL,

    PRIMARY KEY ("animalId", "continentCode"),
    CONSTRAINT "AnimalContinent_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "Animal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AnimalContinent_continentCode_fkey" FOREIGN KEY ("continentCode") REFERENCES "Continent" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "groupNumber" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "answerAnimalId" INTEGER,
    CONSTRAINT "Question_answerAnimalId_fkey" FOREIGN KEY ("answerAnimalId") REFERENCES "Animal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuestionI18n" (
    "questionId" INTEGER NOT NULL,
    "langCode" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,

    PRIMARY KEY ("questionId", "langCode"),
    CONSTRAINT "QuestionI18n_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "QuestionI18n_langCode_fkey" FOREIGN KEY ("langCode") REFERENCES "Language" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Level" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "groupNumber" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "goal" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "LevelI18n" (
    "levelId" INTEGER NOT NULL,
    "langCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    PRIMARY KEY ("levelId", "langCode"),
    CONSTRAINT "LevelI18n_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "LevelI18n_langCode_fkey" FOREIGN KEY ("langCode") REFERENCES "Language" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "UIString_langCode_idx" ON "UIString"("langCode");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_slug_key" ON "Animal"("slug");

-- CreateIndex
CREATE INDEX "AnimalI18n_langCode_idx" ON "AnimalI18n"("langCode");

-- CreateIndex
CREATE INDEX "AnimalMedia_mediaId_idx" ON "AnimalMedia"("mediaId");

-- CreateIndex
CREATE INDEX "AnimalContinent_continentCode_idx" ON "AnimalContinent"("continentCode");

-- CreateIndex
CREATE INDEX "QuestionI18n_langCode_idx" ON "QuestionI18n"("langCode");
