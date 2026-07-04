import { z } from "zod";

// ── Create retry policy validator ───────────────────────────────────────────────
export const createRetryPolicyValidator = z.object({
	name: z.string().min(1, "Name is required").max(150),
	strategy: z
		.enum(["FIXED_DELAY", "LINEAR_BACKOFF", "EXPONENTIAL_BACKOFF"])
		.default("EXPONENTIAL_BACKOFF"),
	maxAttempts: z.coerce.number().int().positive().max(50).default(3),
	delaySeconds: z.coerce.number().int().nonnegative().max(86400).default(10),
	backoffFactor: z.coerce.number().positive().max(10).default(2.0),
	maxDelaySeconds: z.coerce.number().int().positive().max(86400).optional(),
});

export type CreateRetryPolicyInput = z.infer<typeof createRetryPolicyValidator>;

// ── Update retry policy validator ───────────────────────────────────────────────
export const updateRetryPolicyValidator = z.object({
	name: z.string().min(1).max(150).optional(),
	strategy: z
		.enum(["FIXED_DELAY", "LINEAR_BACKOFF", "EXPONENTIAL_BACKOFF"])
		.optional(),
	maxAttempts: z.coerce.number().int().positive().max(50).optional(),
	delaySeconds: z.coerce.number().int().nonnegative().max(86400).optional(),
	backoffFactor: z.coerce.number().positive().max(10).optional(),
	maxDelaySeconds: z.coerce.number().int().positive().max(86400).nullable().optional(),
	isEnabled: z.boolean().optional(),
});

export type UpdateRetryPolicyInput = z.infer<typeof updateRetryPolicyValidator>;
