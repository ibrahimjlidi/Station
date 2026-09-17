import { z } from 'zod';

const envSchema = z.object({
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(1).default('development-secret'),
});

export const config = envSchema.parse({
  FRONTEND_URL: process.env.FRONTEND_URL,
  JWT_SECRET: process.env.JWT_SECRET,
});
