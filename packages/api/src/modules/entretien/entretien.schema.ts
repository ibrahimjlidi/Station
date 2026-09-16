import { z } from 'zod';
const id = z.coerce.number().int().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().finite().nonnegative();
export const entretienSchema = z.object({ dateEnt: date, matricule: z.string().trim().min(1).max(40), clientId: id, vehiculeId: id.optional(), indexKm: money, prochainIndex: money, lignes: z.array(z.object({ idService: id.optional(), serviceId: id.optional(), prixHT: money.optional(), tauxTVA: money.optional() }).refine((line) => line.idService || line.serviceId, 'Un service est requis.')).min(1) });
export const vehiculeSchema = z.object({ clientId: id, matricule: z.string().trim().min(1).max(20), marque: z.string().trim().max(50).optional(), modele: z.string().trim().max(50).optional(), annee: z.coerce.number().int().min(1900).max(2200).optional(), carburantType: z.coerce.number().int().min(1).max(4).optional(), indexKmActuel: z.coerce.number().int().nonnegative().optional() });
export const serviceSchema = z.object({ libelle: z.string().trim().min(1).max(100), prixHT: money, tauxTVA: z.coerce.number().finite().nonnegative(), actif: z.boolean().default(true) });
export const carWashSchema = z.object({ date, indexOuverture: money, indexFermeture: money });
