import { z } from 'zod';

const id = z.coerce.number().int().positive();
const money = z.coerce.number().finite().nonnegative();
const quantity = z.coerce.number().finite().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const ticketSchema = z.object({
  caisseId: id,
  equipeId: id,
  vendeurId: id,
  date: date.optional(),
  remise: money.default(0),
  promotionId: id.optional(),
  lignes: z.array(z.object({ produitId: id, quantite: quantity, remise: money.default(0) })).min(1),
  paiements: z.array(z.object({ modePaymentId: id, montant: money })).min(1),
});

export const returnSchema = z.object({
  lignes: z.array(z.object({ ticketLineId: id, quantite: quantity })).min(1),
});

export const promotionSchema = z.object({
  libelle: z.string().trim().min(1).max(160),
  dateDebut: date,
  dateFin: date,
  remise: money,
  actif: z.boolean().default(true),
  produitIds: z.array(id).min(1),
});

export const discountSchema = z.object({
  montant: money,
});

export type TicketInput = z.infer<typeof ticketSchema>;
