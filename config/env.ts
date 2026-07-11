import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters long"),
  SESSION_EXPIRY_DAYS: z.coerce.number().int().positive().default(7),
  DEFAULT_ADMIN_EMAIL: z.string().email("DEFAULT_ADMIN_EMAIL must be a valid email"),
  DEFAULT_ADMIN_PASSWORD: z.string().min(8).optional(),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  SESSION_EXPIRY_DAYS: process.env.SESSION_EXPIRY_DAYS,
  DEFAULT_ADMIN_EMAIL: process.env.DEFAULT_ADMIN_EMAIL,
  DEFAULT_ADMIN_PASSWORD: process.env.DEFAULT_ADMIN_PASSWORD,
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  console.error("❌ Invalid environment variables during server initialization:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  throw new Error("Invalid environment configuration. Fix .env issues and restart.");
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
