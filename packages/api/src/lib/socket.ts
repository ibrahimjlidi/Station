import type { Server as HttpServer } from 'node:http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config } from './config.js';
import { logger } from './logger.js';
import type { SocketEventName } from './socket-events.js';

let io: Server | undefined;

interface SocketTokenPayload {
  id: number;
  magasinId: number | null;
}

export function initSocket(httpServer: HttpServer) {
  if (io) return io;
  io = new Server(httpServer, { cors: { origin: config.FRONTEND_URL } });
  io.on('connection', (socket) => {
    const token = socket.handshake.auth.token;
    try {
      if (typeof token !== 'string') throw new Error('Missing JWT');
      const payload = jwt.verify(token, config.JWT_SECRET) as SocketTokenPayload;
      if (payload.magasinId != null) socket.join(`magasin:${payload.magasinId}`);
      logger.info('Socket connected', { socketId: socket.id, userId: payload.id, magasinId: payload.magasinId });
    } catch (error) {
      logger.warn('Rejected Socket.IO authentication attempt', { socketId: socket.id, error });
      socket.disconnect(true);
      return;
    }
    socket.on('disconnect', (reason) => logger.info('Socket disconnected', { socketId: socket.id, reason }));
  });
  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket.IO has not been initialized.');
  return io;
}

export function emitSocketEvent<T>(magasinId: number | null | undefined, event: SocketEventName, payload: T) {
  if (magasinId == null) return;
  try {
    getIO().to(`magasin:${magasinId}`).emit(event, payload);
  } catch (error) {
    logger.error(`Socket emission failed for ${event}`, error);
  }
}
