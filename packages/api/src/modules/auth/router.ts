import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma.js';
import { authMiddleware, requireRole, type AuthRequest } from '../../middleware/auth.js';
import { changePasswordSchema, loginSchema, resetPasswordSchema, userCreateSchema, userUpdateSchema } from './schemas.js';

const router = Router();
export const usersRouter = Router();
const getSecret = () => process.env.JWT_SECRET ?? 'development-secret';
const publicUser = { id: true, username: true, nom: true, prenom: true, telephone: true, role: true, actif: true, lastLoginAt: true } as const;

function createToken(user: { id: number; username: string; role: 'gerant' | 'caissier' | 'vendeur'; magasinId: number | null }) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role, magasinId: user.magasinId }, getSecret(), { expiresIn: '8h' });
}

router.post('/login', async (request, response, next) => {
  try {
    const input = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { username: input.username }, include: { magasin: true } });
    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      response.status(401).json({ message: 'Identifiants invalides.' });
      return;
    }
    if (!user.actif) { response.status(403).json({ message: 'Compte désactivé, contactez le gérant' }); return; }
    const updated = await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }, select: publicUser });
    response.json({ user: updated, token: createToken({ ...user, magasinId: user.magasinId }) });
  } catch (error) { next(error); }
});

usersRouter.get('/users', authMiddleware, requireRole('gerant'), async (_request, response, next) => {
  try { response.json(await prisma.user.findMany({ select: publicUser, orderBy: [{ nom: 'asc' }, { prenom: 'asc' }] })); } catch (error) { next(error); }
});

usersRouter.post('/users', authMiddleware, requireRole('gerant'), async (request, response, next) => {
  try { const input = userCreateSchema.parse(request.body); const user = await prisma.user.create({ data: { username: input.username, passwordHash: await bcrypt.hash(input.password, 12), nom: input.nom, prenom: input.prenom, telephone: input.telephone, role: input.role }, select: publicUser }); response.status(201).json(user); } catch (error) { next(error); }
});

usersRouter.put('/users/:id', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try { const id = Number(request.params.id); if (request.user?.id === id && request.body.actif === false) { response.status(400).json({ message: 'Un gérant ne peut pas désactiver son propre compte.' }); return; } response.json(await prisma.user.update({ where: { id }, data: userUpdateSchema.parse(request.body), select: publicUser })); } catch (error) { next(error); }
});

usersRouter.patch('/users/:id/reset-password', authMiddleware, requireRole('gerant'), async (request, response, next) => {
  try { const input = resetPasswordSchema.parse(request.body); await prisma.user.update({ where: { id: Number(request.params.id) }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12) } }); response.json({ message: 'Mot de passe réinitialisé.' }); } catch (error) { next(error); }
});

router.patch('/change-password', authMiddleware, async (request: AuthRequest, response, next) => {
  try { const input = changePasswordSchema.parse(request.body); const user = await prisma.user.findUnique({ where: { id: request.user!.id } }); if (!user || !(await bcrypt.compare(input.currentPassword, user.passwordHash))) { response.status(400).json({ message: 'Mot de passe actuel incorrect.' }); return; } await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(input.newPassword, 12) } }); response.json({ message: 'Mot de passe modifié.' }); } catch (error) { next(error); }
});

usersRouter.delete('/users/:id', authMiddleware, requireRole('gerant'), async (request: AuthRequest, response, next) => {
  try { const id = Number(request.params.id); if (request.user?.id === id) { response.status(400).json({ message: 'Vous ne pouvez pas désactiver votre propre compte.' }); return; } await prisma.user.update({ where: { id }, data: { actif: false } }); response.status(204).send(); } catch (error) { next(error); }
});

export default router;
