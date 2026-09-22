import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  DIRECT_DATABASE_URL: z.string().optional(),
  NEON_BRANCH: z.string().optional(),

  REDIS_URL: z.string().default('redis://localhost:6379'),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),

  LIVEKIT_URL: z.string().default('wss://livekit.cloud'),
  LIVEKIT_API_KEY: z.string().default('devkey'),
  LIVEKIT_API_SECRET: z.string().default('secret'),

  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('zylo'),

  R2_ACCOUNT_ID: z.string().default(''),
  R2_ACCESS_KEY_ID: z.string().default(''),
  R2_SECRET_ACCESS_KEY: z.string().default(''),
  R2_BUCKET_NAME: z.string().default('zylo-media'),
  R2_PUBLIC_BASE_URL: z.string().default(''),
  R2_ENDPOINT: z.string().default(''),

  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  LOG_LEVEL: z.string().default('debug'),
});

function loadEnv() {
  if (process.env.NODE_ENV !== 'test') {
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
    dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }

  return parsed.data;
}

export const env = loadEnv();

export type Env = z.infer<typeof envSchema>;
