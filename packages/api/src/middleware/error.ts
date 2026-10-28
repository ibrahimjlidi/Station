import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({ message: 'Donnees invalides.', issues: error.issues });
    return;
  }

  const databaseCode = typeof error?.code === 'string' ? error.code : undefined;
  if (databaseCode === 'ER_DUP_ENTRY') {
    response.status(409).json({ message: 'Une ressource avec ces valeurs existe deja.' });
    return;
  }
  if (databaseCode === 'ER_NO_REFERENCED_ROW_2' || databaseCode === 'ER_ROW_IS_REFERENCED_2') {
    response.status(409).json({ message: 'Cette operation est liee a une autre ressource.' });
    return;
  }
  if (databaseCode?.startsWith('ECONN') || databaseCode === 'PROTOCOL_CONNECTION_LOST' || databaseCode === 'ER_ACCESS_DENIED_ERROR' || databaseCode === 'ER_BAD_DB_ERROR') {
    console.error('MySQL connection failed.', error);
    response.status(503).json({ message: 'La base de donnees est indisponible.' });
    return;
  }

  const status = typeof error?.statusCode === 'number' ? error.statusCode : 500;
  const message = error instanceof Error ? error.message : 'Erreur interne du serveur.';
  console.error(error);
  response.status(status).json({ message });
};
