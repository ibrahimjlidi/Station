import { execute, queryOne, type SqlValue } from '../../lib/db.js';
import type { PoolConnection } from 'mysql2/promise';

type ClosureError = Error & { statusCode: number };

function closedError(): ClosureError {
  const error = new Error('Cette equipe est deja cloturee pour cette date.') as ClosureError;
  error.statusCode = 409;
  return error;
}

export async function lockShiftClosure(date: Date, equipeId: number, connection: PoolConnection) {
  await execute(
    'INSERT INTO `JoursClotures` (dateJour, equipeId, fait, updatedAt) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)',
    [date, equipeId, false, new Date()],
    connection,
  );
  const closure = await queryOne(
    'SELECT * FROM `JoursClotures` WHERE dateJour = ? AND equipeId = ? FOR UPDATE',
    [date, equipeId],
    connection,
  );
  if (!closure) throw new Error('Shift closure lock could not be loaded.');
  return closure;
}

export async function requireOpenShift(date: Date, equipeId: number, connection: PoolConnection) {
  const closure = await lockShiftClosure(date, equipeId, connection);
  if (closure.fait) throw closedError();
  return closure;
}

export function closureAuditValues(
  actorUserId: number,
  forced: boolean,
  reason?: string,
): Record<string, SqlValue> {
  return {
    closedByUserId: actorUserId,
    closedAt: new Date(),
    forced,
    closureReason: reason?.trim() || null,
  };
}
