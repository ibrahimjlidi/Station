import 'dotenv/config';
import http from 'node:http';
import cors from 'cors';
import express from 'express';
import authRouter, { usersRouter } from './modules/auth/router.js';
import carburantRouter from './modules/carburant/router.js';
import caisseRouter from './modules/caisse/router.js';
import clientsRouter from './modules/clients/router.js';
import fournisseursRouter from './modules/fournisseurs/router.js';
import banqueRouter from './modules/banque/router.js';
import boutiqueRouter from './modules/boutique/router.js';
import cartesRouter from './modules/cartes/router.js';
import entretienRouter from './modules/entretien/router.js';
import parametresRouter from './modules/parametres/router.js';
import rapportsRouter from './modules/rapports/router.js';
import referentielsRouter from './modules/referentiels/router.js';
import posRouter from './modules/pos/router.js';
import { errorHandler } from './middleware/error.js';
import { initSocket } from './lib/socket.js';

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((origin) => origin.trim()) ?? true }));
app.use(express.json());
app.get('/health', (_request, response) => response.json({ status: 'ok' }));
app.use('/auth', authRouter);
app.use('/', usersRouter);
app.use('/', carburantRouter);
app.use('/carburant', carburantRouter);
app.use('/caisse', caisseRouter);
app.use('/pos', posRouter);
app.use('/', banqueRouter);
app.use('/', boutiqueRouter);
app.use('/', cartesRouter);
app.use('/', entretienRouter);
app.use('/entretien', entretienRouter);
app.use('/', parametresRouter);
app.use('/', rapportsRouter);
app.use('/', referentielsRouter);
app.use('/', clientsRouter);
app.use('/', fournisseursRouter);
app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(httpServer);
httpServer.listen(port, () => {
  console.log(`Station Service API running on http://localhost:${port}`);
});
