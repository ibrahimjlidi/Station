import { z } from 'zod';
const money = z.coerce.number().finite().nonnegative();
export const paramSchema = z.object({ nomStation: z.string().trim().min(2).max(160), adresse: z.string().trim().max(255).optional(), tel: z.string().trim().max(30).optional(), mf: z.string().trim().max(40).optional(), rc: z.string().trim().max(40).optional(), logoUrl: z.string().max(1000000).optional(), timbre: money, tauxTVADefaut: money, devise: z.string().trim().min(1).max(10) });
export const stationSchema = z.object({ code: z.string().trim().min(2).max(30), nom: z.string().trim().min(2).max(160) });
