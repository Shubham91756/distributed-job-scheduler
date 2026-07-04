import { z } from "zod";

// ── Register worker validator ───────────────────────────────────────────────────
export const registerWorkerValidator = z.object({
	name: z.string().min(1, "Name is required").max(150),
	capacity: z.coerce.number().int().positive().max(1000).default(5),
});

export type RegisterWorkerInput = z.infer<typeof registerWorkerValidator>;

// ── Heartbeat validator ─────────────────────────────────────────────────────────
export const heartbeatValidator = z.object({
	metadata: z.record(z.unknown()).optional(),
});

export type HeartbeatInput = z.infer<typeof heartbeatValidator>;
