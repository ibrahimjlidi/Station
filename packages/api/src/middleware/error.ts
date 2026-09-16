import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ message: 'Donnees invalides.', issues: error.issues });
    return;
  }

  const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : 'Erreur interne du serveur.';
  console.error(error);
  response.status(status).json({ message });
};
