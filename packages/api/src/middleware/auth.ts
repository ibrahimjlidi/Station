import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { Role } from '@prisma/client';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
  magasinId: number | null;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const getSecret = () => process.env.JWT_SECRET ?? 'development-secret';

export function authMiddleware(request: AuthRequest, response: Response, next: NextFunction) {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    response.status(401).json({ message: 'Authentification requise.' });
    return;
  }

  try {
    request.user = jwt.verify(token, getSecret()) as AuthUser;
    next();
  } catch {
    response.status(401).json({ message: 'Jeton invalide ou expire.' });
  }
}

export const requireAuth = authMiddleware;

export function scopeToMagasin<T extends Record<string, unknown>>(request: AuthRequest, where: T): T & { magasinId?: number } {
  return request.user?.magasinId == null ? where : { ...where, magasinId: request.user.magasinId };
}

export function requireRole(...roles: Role[]) {
  return (request: AuthRequest, response: Response, next: NextFunction) => {
    if (!request.user || !roles.includes(request.user.role)) {
      response.status(403).json({ message: 'Acces refuse pour ce role.' });
      return;
    }
    next();
  };
}
