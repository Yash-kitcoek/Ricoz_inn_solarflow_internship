import 'dotenv/config'
import { z } from 'zod'
const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'), PORT: z.coerce.number().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'), JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  SESSION_HOURS: z.coerce.number().min(1).max(168).default(8), CLIENT_ORIGIN: z.string().default('http://localhost:3000'),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'), UPLOAD_DIR: z.string().default('uploads'),
  ADMIN_NAME: z.string().default('Admin'), ADMIN_EMAIL: z.string().optional(), ADMIN_PASSWORD: z.string().optional() })
const parsed = schema.safeParse(process.env)
if (!parsed.success) { console.error('Invalid environment:', parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')); process.exit(1) }
export const env = parsed.data
