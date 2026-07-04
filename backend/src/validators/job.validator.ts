import { z } from "zod";

// ── Base job fields ─────────────────────────────────────────────────────────────
const baseJobFields = {
	name: z.string().min(1, "Name is required").max(150),
	description: z.string().max(2000).optional(),
	payload: z.record(z.unknown()).default({}),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
	maxAttempts: z.coerce.number().int().positive().max(100).default(3),
	idempotencyKey: z.string().max(255).optional(),
	retryPolicyId: z.string().uuid("Invalid retry policy UUID").optional(),
};

// ── Create job validator (with conditional type validation) ──────────────────────
export const createJobValidator = z
	.object({
		...baseJobFields,
		type: z.enum(["immediate", "delayed", "scheduled", "recurring"]),
		delayMs: z.coerce.number().int().positive().optional(),
		runAt: z.coerce.date().optional(),
		cronExpression: z.string().max(120).optional(),
	})
	.refine(
		(data) => {
			if (data.type === "delayed") {
				return data.delayMs !== undefined && data.delayMs > 0;
			}
			return true;
		},
		{
			message: "delayMs is required and must be positive for delayed jobs",
			path: ["delayMs"],
		}
	)
	.refine(
		(data) => {
			if (data.type === "scheduled") {
				return data.runAt !== undefined && data.runAt > new Date();
			}
			return true;
		},
		{
			message: "runAt is required and must be in the future for scheduled jobs",
			path: ["runAt"],
		}
	)
	.refine(
		(data) => {
			if (data.type === "recurring") {
				if (!data.cronExpression || data.cronExpression.trim().length === 0) return false;
				try {
					const parser = require("cron-parser");
					parser.parseExpression(data.cronExpression);
					return true;
				} catch (e) {
					return false;
				}
			}
			return true;
		},
		{
			message: "cronExpression is required and must be a valid cron string for recurring jobs",
			path: ["cronExpression"],
		}
	);

export type CreateJobInput = z.infer<typeof createJobValidator>;

// ── Batch create job validator ──────────────────────────────────────────────────
export const batchCreateJobValidator = z.object({
	jobs: z
		.array(createJobValidator)
		.min(1, "At least one job is required")
		.max(100, "Maximum 100 jobs per batch"),
});

export type BatchCreateJobInput = z.infer<typeof batchCreateJobValidator>;

// ── Job filter query validator ──────────────────────────────────────────────────
export const jobFilterQueryValidator = z.object({
	status: z
		.enum([
			"QUEUED",
			"SCHEDULED",
			"CLAIMED",
			"RUNNING",
			"COMPLETED",
			"FAILED",
			"CANCELLED",
			"DEAD_LETTERED",
		])
		.optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
	search: z.string().max(255).optional(),
});

export type JobFilterQuery = z.infer<typeof jobFilterQueryValidator>;

// ── Update job validator ────────────────────────────────────────────────────────
export const updateJobValidator = z
	.object({
		name: z.string().min(1, "Name is required").max(150).optional(),
		description: z.string().max(2000).optional(),
		payload: z.record(z.unknown()).optional(),
		priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
		maxAttempts: z.coerce.number().int().positive().max(100).optional(),
		retryPolicyId: z.string().uuid("Invalid retry policy UUID").optional().nullable(),
		type: z.enum(["immediate", "delayed", "scheduled", "recurring"]).optional(),
		delayMs: z.coerce.number().int().positive().optional(),
		runAt: z.coerce.date().optional(),
		cronExpression: z.string().max(120).optional(),
	})
	.refine(
		(data) => {
			if (data.type === "delayed") {
				return data.delayMs !== undefined && data.delayMs > 0;
			}
			return true;
		},
		{
			message: "delayMs is required and must be positive for delayed jobs",
			path: ["delayMs"],
		}
	)
	.refine(
		(data) => {
			if (data.type === "scheduled") {
				return data.runAt !== undefined && data.runAt > new Date();
			}
			return true;
		},
		{
			message: "runAt is required and must be in the future for scheduled jobs",
			path: ["runAt"],
		}
	)
	.refine(
		(data) => {
			if (data.type === "recurring") {
				if (!data.cronExpression || data.cronExpression.trim().length === 0) return false;
				try {
					const parser = require("cron-parser");
					parser.parseExpression(data.cronExpression);
					return true;
				} catch (e) {
					return false;
				}
			}
			return true;
		},
		{
			message: "cronExpression is required and must be a valid cron string for recurring jobs",
			path: ["cronExpression"],
		}
	);

export type UpdateJobInput = z.infer<typeof updateJobValidator>;
