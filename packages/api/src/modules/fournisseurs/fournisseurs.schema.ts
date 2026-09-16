import { z } from 'zod';

const id = z.coerce.number().int().positive();
const money = z.coerce.number().finite().positive();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La date doit etre au format YYYY-MM-DD.');

export const fournisseurSchema = z.object({
  code: z.string().trim().min(1).max(30),
  raisonSociale: z.string().trim().min(2).max(160),
  matriculeFiscal: z.string().trim().max(40).optional(),
  telephone: z.string().trim().max(30).optional(),
  adresse: z.string().trim().max(255).optional(),
});

export const reglementFournisseurSchema = z.object({
  fournisseurId: id,
  date,
  valide: z.boolean().default(false),
  lignes: z.array(z.object({
    numAchats: id.optional(),
    proEss: z.string().trim().max(160).optional(),
    montant: money,
    modePayment: z.string().trim().min(1).max(80),
    echeance: date.optional(),
    reste: z.coerce.number().finite().nonnegative().default(0),
  })).min(1),
});

export const retenueSourceSchema = z.object({
  dateRas: date,
  fournisseurId: id,
  valide: z.boolean().default(false),
  lignes: z.array(z.object({
    codeRet: id,
    mtBrut: money,
    tauxRetenu: z.coerce.number().finite().nonnegative(),
    fournisseurId: id,
    valide: z.boolean().default(false),
  })).min(1),
});

export const listFilterSchema = z.object({
  dateFrom: date.optional(),
  dateTo: date.optional(),
  fournisseurId: id.optional(),
});

export const avoirSchema = z.object({ fournisseurId: id, dateAchat: date, numFacture: z.string().trim().max(80).optional(), totalTTC: money });
export const imputationSchema = z.object({ montant: money });
