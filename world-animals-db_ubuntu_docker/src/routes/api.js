// src/routes/api.js
import { Router } from "express";
import prisma from "../lib/prisma.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));

router.get("/langs", async (_req, res) => {
  const langs = await prisma.language.findMany({ orderBy: { code: "asc" } });
  res.json(langs);
});

router.get("/ui", async (req, res) => {
  const lang = (req.query.lang || "en").toString();
  const rows = await prisma.uIString.findMany({ where: { langCode: lang } });
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  res.json(map);
});

router.get("/continents", async (req, res) => {
  const lang = (req.query.lang || "en").toString();
  const conts = await prisma.continent.findMany({ orderBy: { code: "asc" } });
  const labels = Object.fromEntries((await prisma.uIString.findMany({
    where: { langCode: lang, key: { startsWith: "continent." } }
  })).map(r => [r.key.split(".")[1], r.value]));
  res.json(conts.map(c => ({ code: c.code, name: labels[c.code] || c.code })));
});

router.get("/animals", async (req, res) => {
  const lang = (req.query.lang || "en").toString();
  const group = req.query.group ? parseInt(req.query.group) : undefined;

  const animals = await prisma.animal.findMany({
    where: { isActive: true, ...(group ? { groupNumber: group } : {}) },
    orderBy: [{ groupNumber: "asc" }, { slug: "asc" }],
    include: {
      i18n: { where: { langCode: lang } },
      mediaLink: { include: { media: true } },
      habitats: { include: { continent: true } },
    },
  });

  const shaped = animals.map(a => ({
    id: a.slug,
    groupNumber: a.groupNumber,
    region: a.region,
    name: a.i18n[0]?.name || a.slug,
    fact: a.i18n[0]?.fact || null,
    photos: a.mediaLink
      .filter(m => m.media.role === "photo")
      .map(m => m.media.url || m.media.localPath),
    mini: a.mediaLink
      .filter(m => m.media.role === "mini")
      .map(m => m.media.url || m.media.localPath)[0] || null,
    continents: a.habitats.map(h => h.continent.code),
  }));

  res.json(shaped);
});

router.get("/animals/:slug", async (req, res) => {
  const lang = (req.query.lang || "en").toString();
  const { slug } = req.params;
  const a = await prisma.animal.findUnique({
    where: { slug },
    include: {
      i18n: { where: { langCode: lang } },
      mediaLink: { include: { media: true } },
      habitats: { include: { continent: true } },
    },
  });
  if (!a) return res.status(404).json({ error: "Not found" });
  res.json({
    id: a.slug,
    groupNumber: a.groupNumber,
    region: a.region,
    name: a.i18n[0]?.name || a.slug,
    fact: a.i18n[0]?.fact || null,
    photos: a.mediaLink.filter(m => m.media.role === "photo").map(m => m.media.url || m.media.localPath),
    mini: a.mediaLink.filter(m => m.media.role === "mini").map(m => m.media.url || m.media.localPath)[0] || null,
    continents: a.habitats.map(h => h.continent.code),
  });
});

router.get("/questions/random", async (req, res) => {
  const lang = (req.query.lang || "en").toString();
  const difficulty = req.query.difficulty ? parseInt(req.query.difficulty) : undefined;
  const group = req.query.group ? parseInt(req.query.group) : undefined;

  const where = { isActive: true, ...(difficulty ? { difficulty } : {}), ...(group ? { groupNumber: group } : {}) };
  const total = await prisma.question.count({ where });
  if (!total) return res.status(404).json({ error: "No questions" });
  const skip = Math.floor(Math.random() * total);
  const q = await prisma.question.findFirst({
    where,
    skip,
    include: { i18n: { where: { langCode: lang } }, answerAnimal: true }
  });
  res.json({ id: q.id, prompt: q.i18n[0]?.prompt || "", answerId: q.answerAnimal?.slug || null });
});

export default router;
