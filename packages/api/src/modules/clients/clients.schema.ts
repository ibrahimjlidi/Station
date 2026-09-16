import { z } from 'zod';

const id = z.coerce.number().int().positive();
const money = z.coerce.number().finite().nonnegative();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit etre au format YYYY-MM-DD.');

export const clientSchema = z.object({
  nomClient: z.string().trim().min(2).max(160),
  adresse: z.string().trim().max(255).optional(),
  telephone: z.string().trim().max(30).optional(),
  MF: z.string().trim().max(40).optional(),
  quota: money.default(0),
  soldeAnterieur: z.coerce.number().finite().default(0),
  tva: money.default(0),
});

export const bonLivraisonSchema = z.object({
  date,
  clientId: id,
  lignes: z.array(z.object({
    idProduit: id,
    puHT: money,
    tva: money,
    qte: money.refine((value) => value > 0, 'La quantite doit etre positive.'),
    remise: money.default(0),
  })).min(1),
});

export const reglementSchema = z.object({
  clientId: id,
  equipeId: id,
  caisseId: id,
  date,
  montant: z.coerce.number().finite().positive(),
  modePayment: z.string().trim().min(1).max(80),
  echeance: date.optional(),
  impaye: z.boolean().default(false),
  valide: z.boolean().default(false),
  numCheque: z.string().trim().max(80).optional(),
  numRib: z.string().trim().max(80).optional(),
  nomBanque: z.string().trim().max(120).optional(),
});

export const listFilterSchema = z.object({
  dateFrom: date.optional(),
  dateTo: date.optional(),
  clientId: id.optional(),
});

export type BonLivraisonInput = z.infer<typeof bonLivraisonSchema>;
