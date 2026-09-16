import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().trim().min(2).max(80),
  password: z.string().min(6).max(120),
});

export const userCreateSchema = loginSchema.extend({
  nom: z.string().trim().min(2).max(120),
  prenom: z.string().trim().min(1).max(120),
  telephone: z.string().trim().max(30).optional(),
  role: z.enum(['gerant', 'caissier', 'vendeur']).default('vendeur'),
});

export const userUpdateSchema = z.object({
  nom: z.string().trim().min(2).max(120),
  prenom: z.string().trim().min(1).max(120),
  telephone: z.string().trim().max(30).optional(),
  role: z.enum(['gerant', 'caissier', 'vendeur']),
  actif: z.boolean(),
});

export const resetPasswordSchema = z.object({ newPassword: z.string().min(6).max(120) });
export const changePasswordSchema = z.object({ currentPassword: z.string().min(6).max(120), newPassword: z.string().min(6).max(120) });
