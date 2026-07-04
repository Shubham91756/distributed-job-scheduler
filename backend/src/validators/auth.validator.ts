import { z } from "zod";

// ── Register validator ──────────────────────────────────────────────────────────
export const registerValidator = z.object({
	email: z.string().email("Invalid email address"),
	password: z
		.string()
		.min(8, "Password must be at least 8 characters")
		.regex(/[A-Z]/, "Password must contain at least one uppercase letter")
		.regex(/[a-z]/, "Password must contain at least one lowercase letter")
		.regex(/[0-9]/, "Password must contain at least one number")
		.regex(/[\W_]/, "Password must contain at least one special character"),
	name: z.string().min(1).max(255).optional(),
});

export type RegisterInput = z.infer<typeof registerValidator>;

// ── Login validator ─────────────────────────────────────────────────────────────
export const loginValidator = z.object({
	email: z.string().email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginValidator>;
