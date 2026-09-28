import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { db } from '../../lib/db.js';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth.ts';
import { changePasswordSchema, loginSchema, resetPasswordSchema, userCreateSchema, userUpdateSchema } from './schemas.js';

const router = Router();
export const usersRouter = Router();
const getSecret = () => process.env.JWT_SECRET ?? 'development-secret';

const PUBLIC_COLS = `id, username, nom, prenom, telephone, role, actif, last_login_at AS lastLoginAt, magasin_id AS magasinId`;
const toUser = (row: RowDataPacket) => ({ ...row, actif: Boolean(row.actif) });

async function findPublicUser(id: number) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ? LIMIT 1`, [id]);
  return rows[0] ? toUser(rows[0]) : null;
}

function createToken(user: { id: number; username: string; role: 'gerant' | 'caissier' | 'vendeur'; magasinId: number | null }) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role, magasinId: user.magasinId }, getSecret(), { expiresIn: '8h' });
}

router.post('/login', async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, username, password_hash AS passwordHash, role, actif, magasin_id AS magasinId FROM users WHERE username = ? LIMIT 1',
      [input.username],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      response.status(401).json({ message: 'Identifiants invalides.' });
      return;
    }
    if (!user.actif) {
      response.status(403).json({ message: 'Compte désactivé, contactez le gérant' });
      return;
    }
    await db.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [user.id]);
    const updated = await findPublicUser(user.id);
    response.json({
      user: updated,
      token: createToken({ id: user.id, username: user.username, role: user.role, magasinId: user.magasinId }),
    });
  } catch (error) { next(error); }
});

usersRouter.get('/users', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try {
    const f = magasinFilter(request);
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT ${PUBLIC_COLS} FROM users WHERE 1=1${f.sql} ORDER BY nom ASC, prenom ASC`,
      f.params,
    );
    response.json(rows.map(toUser));
  } catch (error) { next(error); }
});

usersRouter.post('/users', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try {
    const input = userCreateSchema.parse(request.body);
    const hash = await bcrypt.hash(input.password, 12);
    const [result] = await db.query<ResultSetHeader>(
      'INSERT INTO users (username, password_hash, nom, prenom, telephone, role, magasin_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [input.username, hash, input.nom, input.prenom, input.telephone ?? null, input.role, request.user?.magasinId ?? null],
    );
    response.status(201).json(await findPublicUser(result.insertId));
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') {
      response.status(409).json({ message: "Ce nom d'utilisateur existe déjà." });
      return;
    }
    next(error);
  }
});

usersRouter.put('/users/:id', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try {
    const id = Number(request.params.id);
    if (request.user?.id === id && request.body.actif === false) {
      response.status(400).json({ message: 'Un gérant ne peut pas désactiver son propre compte.' });
      return;
    }
    const f = magasinFilter(request);
    const [found] = await db.query<RowDataPacket[]>(`SELECT id FROM users WHERE id = ?${f.sql} LIMIT 1`, [id, ...f.params]);
    if (!found[0]) {
      response.status(404).json({ message: 'Utilisateur introuvable.' });
      return;
    }

    const data = userUpdateSchema.parse(request.body) as Record<string, unknown>;
    const allowed: Record<string, string> = { nom: 'nom', prenom: 'prenom', telephone: 'telephone', role: 'role', actif: 'actif' };
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const [key, column] of Object.entries(allowed)) {
      if (data[key] !== undefined) {
        sets.push(`${column} = ?`);
        values.push(key === 'actif' ? (data[key] ? 1 : 0) : data[key]);
      }
    }
    if (sets.length > 0) {
      await db.query(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
    }
    response.json(await findPublicUser(id));
  } catch (error) { next(error); }
});

usersRouter.patch('/users/:id/reset-password', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try {
    const input = resetPasswordSchema.parse(request.body);
    const id = Number(request.params.id);
    const f = magasinFilter(request);
    const [found] = await db.query<RowDataPacket[]>(`SELECT id FROM users WHERE id = ?${f.sql} LIMIT 1`, [id, ...f.params]);
    if (!found[0]) {
      response.status(404).json({ message: 'Utilisateur introuvable.' });
      return;
    }
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(input.newPassword, 12), id]);
    response.json({ message: 'Mot de passe réinitialisé.' });
  } catch (error) { next(error); }
});

router.patch('/change-password', authMiddleware, async (request: AuthRequest, response, next) => {
  try {
    const input = changePasswordSchema.parse(request.body);
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id, password_hash AS passwordHash FROM users WHERE id = ? LIMIT 1',
      [request.user!.id],
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      response.status(400).json({ message: 'Mot de passe actuel incorrect.' });
      return;
    }
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [await bcrypt.hash(input.newPassword, 12), user.id]);
    response.json({ message: 'Mot de passe modifié.' });
  } catch (error) { next(error); }
});

usersRouter.delete('/users/:id', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try {
    const id = Number(request.params.id);
    if (request.user?.id === id) {
      response.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' });
      return;
    }
    const f = magasinFilter(request);
    const [found] = await db.query<RowDataPacket[]>(`SELECT id FROM users WHERE id = ?${f.sql} LIMIT 1`, [id, ...f.params]);
    if (!found[0]) {
      response.status(404).json({ message: 'Utilisateur introuvable.' });
      return;
    }
    await db.query('UPDATE users SET actif = 0 WHERE id = ?', [id]);
    response.status(204).send();
  } catch (error) { next(error); }
});

export default router;