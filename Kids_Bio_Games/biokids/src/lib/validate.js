import { z } from 'zod';

export const AttemptSchema = z.object({
  questionId: z.string(),
  kidId: z.string(),
  msToFirst: z.number().int().nonnegative().nullable().optional(),
  correct: z.boolean().nullable().optional(),
  tries: z.number().int().min(0).default(0),
  details: z.any().optional(),
});
