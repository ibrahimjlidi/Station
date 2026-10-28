import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2/promise';
import { insertRecord, query, queryOne, updateRecord } from '../../lib/db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth.js';
import { changePasswordSchema, loginSchema, resetPasswordSchema, userCreateSchema, userUpdateSchema } from './schemas.js';

const router = Router();
export const usersRouter = Router();
const getSecret = () => process.env.JWT_SECRET ?? 'development-secret';
const publicUserFields = 'id, username, nom, prenom, telephone, role, actif, lastLoginAt, magasinId';
type UserRow = RowDataPacket & {
  id: number;
  username: string;
  passwordHash: string;
  nom: string;
  prenom: string;
  telephone: string | null;
  role: 'gerant' | 'caissier' | 'vendeur';
  actif: boolean;
  lastLoginAt: Date | null;
  magasinId: number | null;
};

function createToken(user: { id: number; username: string; role: 'gerant' | 'caissier' | 'vendeur'; magasinId: number | null }) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role, magasinId: user.magasinId }, getSecret(), { expiresIn: '8h' });
}

router.post('/login', async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const user = await queryOne<UserRow>('SELECT * FROM `User` WHERE username = ?', [input.username]);
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      response.status(401).json({ message: 'Identifiants invalides.' });
      return;
    }
    if (!user.actif) { response.status(403).json({ message: 'Compte désactivé, contactez le gérant' }); return; }
    await updateRecord('User', { lastLoginAt: new Date() }, { id: user.id });
    const updated = await queryOne<UserRow>(`SELECT ${publicUserFields} FROM \`User\` WHERE id = ?`, [user.id]);
    if (!updated) throw new Error('User disappeared while updating last login.');
    response.json({ user: updated, token: createToken({ ...user, magasinId: user.magasinId }) });
  } catch (error) { next(error); }
});

usersRouter.get('/users', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try {
    const users = request.user?.magasinId == null
      ? await query<UserRow>(`SELECT ${publicUserFields} FROM \`User\` ORDER BY nom, prenom`)
      : await query<UserRow>(`SELECT ${publicUserFields} FROM \`User\` WHERE magasinId = ? ORDER BY nom, prenom`, [request.user.magasinId]);
    response.json(users);
  } catch (error) { next(error); }
});

usersRouter.post('/users', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try {
    const input = userCreateSchema.parse(request.body);
    const id = await insertRecord('User', {
      username: input.username,
      passwordHash: await bcrypt.hash(input.password, 12),
      nom: input.nom,
      prenom: input.prenom,
      telephone: input.telephone,
      role: input.role,
      magasinId: request.user?.magasinId ?? null,
    });
    const user = await queryOne<UserRow>(`SELECT ${publicUserFields} FROM \`User\` WHERE id = ?`, [id]);
    if (!user) throw new Error('Inserted user could not be loaded.');
    response.status(201).json(user);
  } catch (error) { next(error); }
});

usersRouter.put('/users/:id', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try {
    const id = Number(request.params.id);
    if (request.user?.id === id && request.body.actif === false) {
      response.status(400).json({ message: 'Un gérant ne peut pas désactiver son propre compte.' });
      return;
    }
    const target = request.user?.magasinId == null
      ? await queryOne<UserRow>('SELECT * FROM `User` WHERE id = ?', [id])
      : await queryOne<UserRow>('SELECT * FROM `User` WHERE id = ? AND magasinId = ?', [id, request.user.magasinId]);
    if (!target) { response.status(404).json({ message: 'Utilisateur introuvable.' }); return; }
    const input = userUpdateSchema.parse(request.body);
    await updateRecord('User', input, { id });
    const updated = await queryOne<UserRow>(`SELECT ${publicUserFields} FROM \`User\` WHERE id = ?`, [id]);
    if (!updated) throw new Error('Updated user could not be loaded.');
    response.json(updated);
  } catch (error) { next(error); }
});

usersRouter.patch('/users/:id/reset-password', authMiddleware, requireRole('gerant'), async (request, response, next) => {
  try {
    const input = resetPasswordSchema.parse(request.body);
    const id = Number(request.params.id);
    const target = request.user?.magasinId == null
      ? await queryOne<UserRow>('SELECT id FROM `User` WHERE id = ?', [id])
      : await queryOne<UserRow>('SELECT id FROM `User` WHERE id = ? AND magasinId = ?', [id, request.user.magasinId]);
    if (!target) { response.status(404).json({ message: 'Utilisateur introuvable.' }); return; }
    await updateRecord('User', { passwordHash: await bcrypt.hash(input.newPassword, 12) }, { id });
    response.json({ message: 'Mot de passe réinitialisé.' });
  } catch (error) { next(error); }
});

router.patch('/change-password', authMiddleware, async (request: AuthRequest, response, next) => {
  try {
    const input = changePasswordSchema.parse(request.body);
    const user = await queryOne<UserRow>('SELECT * FROM `User` WHERE id = ?', [request.user!.id]);
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      response.status(400).json({ message: 'Mot de passe actuel incorrect.' });
      return;
    }
    await updateRecord('User', { passwordHash: await bcrypt.hash(input.newPassword, 12) }, { id: user.id });
    response.json({ message: 'Mot de passe modifié.' });
  } catch (error) { next(error); }
});

usersRouter.delete('/users/:id', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try {
    const id = Number(request.params.id);
    if (request.user?.id === id) { response.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' }); return; }
    const target = request.user?.magasinId == null
      ? await queryOne<UserRow>('SELECT id FROM `User` WHERE id = ?', [id])
      : await queryOne<UserRow>('SELECT id FROM `User` WHERE id = ? AND magasinId = ?', [id, request.user.magasinId]);
    if (!target) { response.status(404).json({ message: 'Utilisateur introuvable.' }); return; }
    await updateRecord('User', { actif: false }, { id });
    response.status(204).send();
  } catch (error) { next(error); }
});

export default router;
