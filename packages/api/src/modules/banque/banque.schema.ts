import { z } from 'zod';

const id = z.coerce.number().int().positive();
const money = z.coerce.number().finite().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide, format attendu YYYY-MM-DD.');

export const banqueSchema = z.object({
  libelle: z.string().trim().min(2).max(120),
  tel: z.string().trim().max(30).optional(),
  rib: z.string().trim().max(80).optional(),
});

export const mouvementSchema = z.object({
  banqueId: id,
  modePaymentId: id,
  date,
  dateEcheance: date.optional(),
  montant: money,
  numMvtBq: z.coerce.number().int().positive().optional(),
  numLigne: z.coerce.number().int().positive().default(1),
});

export const configSchema = z.object({
  banqueId: id,
  modePaymentId: id,
  tauxCommission: z.coerce.number().finite().nonnegative(),
  nbrJoursCompensation: z.coerce.number().int().nonnegative(),
  tvaCom: z.coerce.number().finite().nonnegative(),
});

export const movementFilterSchema = z.object({
  dateFrom: date.optional(),
  dateTo: date.optional(),
  modePaymentId: id.optional(),
  rapproche: z.enum(['true', 'false']).optional(),
});
