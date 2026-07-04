import { z } from "zod";

// ── Create queue validator ──────────────────────────────────────────────────────
export const createQueueValidator = z.object({
	name: z.string().min(1, "Name is required").max(150),
	description: z.string().max(2000).optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
	maxConcurrency: z.coerce.number().int().positive().max(1000).default(5),
	retryPolicyId: z.string().uuid("Invalid retry policy UUID").optional(),
});

export type CreateQueueInput = z.infer<typeof createQueueValidator>;

// ── Update queue validator ──────────────────────────────────────────────────────
export const updateQueueValidator = z.object({
	name: z.string().min(1).max(150).optional(),
	description: z.string().max(2000).optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
	maxConcurrency: z.coerce.number().int().positive().max(1000).optional(),
	retryPolicyId: z.string().uuid("Invalid retry policy UUID").nullable().optional(),
});

export type UpdateQueueInput = z.infer<typeof updateQueueValidator>;
