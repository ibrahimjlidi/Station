import { z } from 'zod';

export const tauxTvaSchema = z.object({ taux: z.coerce.number().finite().nonnegative(), libelle: z.string().trim().min(1).max(50), actif: z.boolean().default(true) });
export const familleDepenseSchema = z.object({ libelle: z.string().trim().min(1).max(100), cpt: z.string().trim().min(1).max(8) });