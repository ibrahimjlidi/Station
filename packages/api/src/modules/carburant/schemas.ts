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
export const caisseSchema = z.object({ code, libelle: label, type: z.enum(['POS', 'PISTE']).default('PISTE') });
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

const pompeOuvertureSchema = z.object({ pompeId: z.coerce.number().int().positive(), indexOuverture: positiveDecimal });
const jaugeageSessionSchema = z.object({ cuveId: z.coerce.number().int().positive(), stockPhysique: positiveDecimal });

export const suggestedOpeningSchema = z.object({
  caisseId: z.coerce.number().int().positive(),
  equipeId: z.coerce.number().int().positive(),
  date: isoDate,
});

export const ouvrirSessionSchema = z.object({
  date: isoDate,
  equipeId: z.coerce.number().int().positive(),
  caisseId: z.coerce.number().int().positive(),
  vendeurId: z.coerce.number().int().positive(),
  fondsCaisseOuverture: positiveDecimal,
  pompes: z.array(pompeOuvertureSchema).min(1, 'Selectionnez au moins une pompe active pour la session.'),
  jaugeagesOuverture: z.array(jaugeageSessionSchema).min(1),
  commentaireEcart: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  const pumpIds = value.pompes.map((pump) => pump.pompeId);
  const tankIds = value.jaugeagesOuverture.map((reading) => reading.cuveId);
  if (new Set(pumpIds).size !== pumpIds.length) context.addIssue({ code: 'custom', path: ['pompes'], message: 'Une pompe ne peut etre envoyee qu une seule fois.' });
  if (new Set(tankIds).size !== tankIds.length) context.addIssue({ code: 'custom', path: ['jaugeagesOuverture'], message: 'Une cuve ne peut etre envoyee qu une seule fois.' });
});

export const fermerSessionSchema = z.object({
  date: isoDate,
  equipeId: z.coerce.number().int().positive(),
  caisseId: z.coerce.number().int().positive(),
  releveesPompes: z.array(z.object({ pompeId: z.coerce.number().int().positive(), indexFermeture: positiveDecimal, retourVolume: positiveDecimal.default(0) })).min(1),
  especes: positiveDecimal,
  cheques: z.array(z.object({ montant: positiveDecimal, numeroCheque: z.string().trim().min(1).max(80), clientNom: z.string().trim().max(160).optional() })).default([]),
  carteBancaire: positiveDecimal,
  fondsDeCaisseFermeture: positiveDecimal,
  depotBanque: positiveDecimal,
  jaugeagesFermeture: z.array(jaugeageSessionSchema).min(1),
  commentaireEcart: z.string().trim().max(500).optional(),
}).superRefine((value, context) => {
  const pumpIds = value.releveesPompes.map((reading) => reading.pompeId);
  const tankIds = value.jaugeagesFermeture.map((reading) => reading.cuveId);
  if (new Set(pumpIds).size !== pumpIds.length) context.addIssue({ code: 'custom', path: ['releveesPompes'], message: 'Une pompe ne peut etre envoyee qu une seule fois.' });
  if (new Set(tankIds).size !== tankIds.length) context.addIssue({ code: 'custom', path: ['jaugeagesFermeture'], message: 'Une cuve ne peut etre envoyee qu une seule fois.' });
});
