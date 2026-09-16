import { z } from 'zod';
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const journalSchema = z.object({ date, equipeId: z.coerce.number().int().positive(), caisseId: z.coerce.number().int().positive() });
export const monthSchema = z.object({ mois: z.coerce.number().int().min(1).max(12), annee: z.coerce.number().int().min(2000).max(2200) });
export const rangeSchema = z.object({ dateFrom: date.optional(), dateTo: date.optional() });
