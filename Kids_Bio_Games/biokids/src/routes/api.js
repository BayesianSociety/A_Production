import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { AttemptSchema } from '../lib/validate.js';

const prisma = new PrismaClient();
const r = Router();

r.get('/questions', async (req, res) => {
  try {
    const { topic, ageBand, limit = 20 } = req.query;
    const where = {};
    if (topic) where.topic = topic;
    if (ageBand) where.ageBand = ageBand;

    const items = await prisma.question.findMany({
      where,
      take: Number(limit),
      include: { answers: true, media: true },
      orderBy: { id: 'asc' },
    });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

r.get('/bodyparts', async (_req, res) => {
  try {
    const parts = await prisma.bodyPart.findMany({
      include: { image: true, placements: true, functions: true },
      orderBy: { name: 'asc' },
    });
    res.json(parts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch body parts' });
  }
});

r.post('/attempts', async (req, res) => {
  try {
    const parsed = AttemptSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues });
    }
    const attempt = await prisma.attempt.create({ data: parsed.data });
    res.status(201).json(attempt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save attempt' });
  }
});

export default r;
