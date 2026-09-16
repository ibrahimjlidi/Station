import { z } from 'zod';

const positiveDecimal = z.coerce.number().finite().nonnegative();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit etre au format YYYY-MM-DD.');

export const releverSchema = z.object({
  date: isoDate,
  equipeId: z.coerce.number().int().positive(),
  caisseId: z.coerce.number().int().positive(),
  pompeId: z.coerce.number().int().positive(),
  vendeurId: z.coerce.number().int().positive(),
  indexOuverture: positiveDecimal,
});

export const fermerSchema = z.object({
  indexFermeture: positiveDecimal,
});

const code = z.string().trim().min(1).max(30);
const label = z.string().trim().min(1).max(100);

export const equipeSchema = z.object({ code, libelle: label });
export const caisseSchema = z.object({ code, libelle: label });
export const cuveSchema = z.object({
  code,
  libelle: label,
  carburant: z.string().trim().min(1).max(60),
  volumeTotal: positiveDecimal,
  stockInitial: positiveDecimal.default(0),
  seuilAlerte: positiveDecimal.default(0),
});
export const pompeSchema = z.object({
  code,
  libelle: label,
  active: z.boolean().default(true),
  prixVente: positiveDecimal,
  cuveId: z.coerce.number().int().positive(),
});

export const retourSchema = z.object({
  date: isoDate,
  equipeId: z.coerce.number().int().positive(),
  caisseId: z.coerce.number().int().positive(),
  vendeurId: z.coerce.number().int().positive(),
  lignes: z.array(z.object({ pompeId: z.coerce.number().int().positive(), volume: positiveDecimal, tauxTVA: positiveDecimal })).min(1),
});

export const inventaireCarburantSchema = z.object({
  date: isoDate,
  operateur: z.string().trim().min(1).max(100),
  lignes: z.array(z.object({ cuveId: z.coerce.number().int().positive(), stockPhysique: positiveDecimal })).min(1),
});

export const jaugeageSchema = z.object({
  date: isoDate,
  cuveId: z.coerce.number().int().positive(),
  quantite: positiveDecimal,
  equipeId: z.coerce.number().int().positive().optional(),
  caisseId: z.coerce.number().int().positive().optional(),
});

export const jaugeagesSchema = z.object({
  date: isoDate,
  lignes: z.array(z.object({ cuveId: z.coerce.number().int().positive(), quantite: positiveDecimal })).min(1),
  equipeId: z.coerce.number().int().positive().optional(),
  caisseId: z.coerce.number().int().positive().optional(),
});

export const jaugeageFilterSchema = z.object({ date: isoDate.optional(), dateFrom: isoDate.optional(), dateTo: isoDate.optional(), cuveId: z.coerce.number().int().positive().optional() });
