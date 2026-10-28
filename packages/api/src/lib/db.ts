import 'dotenv/config';
import mysql, { type PoolConnection, type ResultSetHeader } from 'mysql2/promise';

function requiredEnv(name: 'DB_HOST' | 'DB_USER' | 'DB_NAME'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required database environment variable: ${name}`);
  }
  return value;
}

const port = Number(process.env.DB_PORT ?? '3306');
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('DB_PORT must be an integer between 1 and 65535.');
}

export const pool = mysql.createPool({
  host: requiredEnv('DB_HOST'),
  user: requiredEnv('DB_USER'),
  password: process.env.DB_PASSWORD ?? '',
  database: requiredEnv('DB_NAME'),
  port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  decimalNumbers: true,
  supportBigNumbers: true,
  bigNumberStrings: true,
  timezone: 'Z',
});

export type SqlValue = string | number | bigint | boolean | Date | Buffer | null;
export type SqlRow = Record<string, any>;

function identifier(value: string): string {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `\`${value}\``;
}

export async function query<T = SqlRow>(
  sql: string,
  values: readonly SqlValue[] = [],
  connection?: PoolConnection,
): Promise<T[]> {
  const [rows] = await (connection ?? pool).execute(sql, [...values]);
  return rows as T[];
}

export async function queryOne<T = SqlRow>(
  sql: string,
  values: readonly SqlValue[] = [],
  connection?: PoolConnection,
): Promise<T | null> {
  return (await query<T>(sql, values, connection))[0] ?? null;
}

export async function execute(
  sql: string,
  values: readonly SqlValue[] = [],
  connection?: PoolConnection,
): Promise<ResultSetHeader> {
  const [result] = await (connection ?? pool).execute(sql, [...values]);
  return result as ResultSetHeader;
}

export async function insertRecord(
  table: string,
  record: Readonly<Record<string, SqlValue | undefined>>,
  connection?: PoolConnection,
): Promise<number> {
  const timestamp = new Date();
  const entries = Object.entries({
    ...record,
    ...(table === 'DetailInventaireCarburant' ? {} : { updatedAt: record.updatedAt ?? timestamp }),
  }).filter(([, value]) => value !== undefined) as [string, SqlValue][];
  if (entries.length === 0) {
    throw new Error('Cannot insert an empty database record.');
  }
  const columns = entries.map(([column]) => identifier(column)).join(', ');
  const placeholders = entries.map(() => '?').join(', ');
  const result = await execute(
    `INSERT INTO ${identifier(table)} (${columns}) VALUES (${placeholders})`,
    entries.map(([, value]) => value),
    connection,
  );
  return result.insertId;
}

export async function updateRecord(
  table: string,
  record: Readonly<Record<string, SqlValue | undefined>>,
  where: Readonly<Record<string, SqlValue>>,
  connection?: PoolConnection,
): Promise<ResultSetHeader> {
  const entries = Object.entries({
    ...record,
    updatedAt: record.updatedAt ?? new Date(),
  }).filter(([, value]) => value !== undefined) as [string, SqlValue][];
  const predicates = Object.entries(where);
  if (entries.length === 0 || predicates.length === 0) {
    throw new Error('Database updates require fields and a condition.');
  }
  const assignments = entries.map(([column]) => `${identifier(column)} = ?`).join(', ');
  const conditions = predicates.map(([column]) => `${identifier(column)} = ?`).join(' AND ');
  return execute(
    `UPDATE ${identifier(table)} SET ${assignments} WHERE ${conditions}`,
    [...entries.map(([, value]) => value), ...predicates.map(([, value]) => value)],
    connection,
  );
}

export async function withTransaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Database transaction rollback failed.', rollbackError);
    }
    throw error;
  } finally {
    connection.release();
  }
}