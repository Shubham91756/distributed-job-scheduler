import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	PORT: z.coerce.number().int().positive().default(4000),
	DATABASE_URL: z.string().min(1),
	JWT_SECRET: z.string().min(1).default("change-me"),
	JWT_EXPIRES_IN: z.string().min(1).default("15m"),
	REFRESH_TOKEN_SECRET: z.string().min(1).default("refresh-change-me"),
	REFRESH_TOKEN_EXPIRES_IN: z.string().min(1).default("7d"),
	LOG_LEVEL: z.enum(["error", "warn", "info", "http", "debug"]).default("info")
});

export const env = envSchema.parse(process.env);
