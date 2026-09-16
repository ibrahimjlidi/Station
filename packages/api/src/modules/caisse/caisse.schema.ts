import { z } from 'zod';

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit etre au format YYYY-MM-DD.');
const positiveId = z.coerce.number().int().positive();
const money = z.coerce.number().finite().positive();

export const sessionSchema = z.object({
  date: dateSchema,
  equipeId: positiveId,
  caisseId: positiveId,
  vendeurId: positiveId,
});

export const recetteLineSchema = z.object({
  modePaymentId: positiveId,
  montant: money,
  numero: z.string().trim().max(80).optional(),
  idCuve: positiveId.optional(),
});

export const depenseLineSchema = z.object({
  codeDepense: positiveId,
  montant: money,
  libelle: z.string().trim().max(255).optional(),
});

export const creditLineSchema = z.object({
  clientId: positiveId,
  montant: money,
  libelle: z.string().trim().max(255).optional(),
  modePayment: z.string().trim().max(80).optional(),
});

export const clotureSchema = z.object({
  date: dateSchema,
  equipeId: positiveId,
  caisseId: positiveId,
  forcer: z.boolean().default(false),
  commentaire: z.string().trim().max(1000).optional(),
});

export const summaryParamsSchema = z.object({
  date: dateSchema,
  equipeId: positiveId,
  caisseId: positiveId,
});

export type SessionInput = z.infer<typeof sessionSchema>;