import { z } from 'zod';

const id = z.coerce.number().int().positive();
const qty = z.coerce.number().finite().positive();
const money = z.coerce.number().finite().nonnegative();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide, format attendu YYYY-MM-DD.');

export const produitSchema = z.object({
  code: z.string().trim().min(1).max(40),
  codeProduit: z.string().trim().max(40).optional(),
  libelle: z.string().trim().min(2).max(160),
  familleId: id.optional(),
  prixAchatHT: money.default(0),
  prixVenteHT: money.default(0),
  tauxTVA: money.default(0),
  stock: z.coerce.number().finite().nonnegative().default(0),
  fournisseurId: id.optional(),
  actif: z.boolean().default(true),
});

export const familleSchema = z.object({
  libelle: z.string().trim().min(2).max(120),
  cumulOuiNon: z.boolean().default(false),
  typeProd: z.string().trim().max(60).optional(),
  compteCPT: z.string().trim().max(40).optional(),
  compteACH: z.string().trim().max(40).optional(),
});

export const achatSchema = z.object({
  fournisseurId: id,
  dateAchat: date,
  numFacture: z.string().trim().max(80).optional(),
  dateFacture: date.optional(),
  valide: z.boolean().default(false),
  lignes: z.array(z.object({ produitId: id, quantite: qty, prixAchat: money, tauxTVA: money })).min(1),
});

export const inventSchema = z.object({
  date,
  operateur: id,
  lignes: z.array(z.object({ produitId: id, stockInventaire: z.coerce.number().finite().nonnegative() })).min(1),
});

export const transfertSchema = z.object({
  fournisseurId: id,
  dateTransfert: date,
  op: id,
  valide: z.boolean().default(false),
  lignes: z.array(z.object({ produitId: id, quantite: qty, prixUnitaire: money })).min(1),
});

export const filterSchema = z.object({
  dateFrom: date.optional(),
  dateTo: date.optional(),
  fournisseurId: id.optional(),
  familleId: id.optional(),
  equipeId: id.optional(),
});
