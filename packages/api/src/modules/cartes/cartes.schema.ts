import { z } from 'zod';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.coerce.number().finite().nonnegative();
export const carteSchema = z.object({ numTicket: z.string().trim().max(80).optional(), numCession: z.string().trim().max(80).optional(), date, montant: money, numFacture: z.string().trim().max(80).optional(), typeCarte: z.string().trim().min(1).max(40) });
export const bonSchema = z.object({ numBord: z.string().trim().max(80).optional(), bonStationId: z.string().trim().max(80).optional(), date, montant: money, numFacture: z.string().trim().max(80).optional() });
export const importRowSchema = z.object({ terminal: z.string().optional(), shift: z.string().optional(), date: z.string().optional(), receipt: z.string().trim().min(1), card: z.string().optional(), product: z.string().optional(), customerName: z.string().optional(), transactionType: z.string().optional(), quantity: money.optional(), amount: money.optional(), numCN: z.string().optional(), dateAvoir: z.string().optional() });
