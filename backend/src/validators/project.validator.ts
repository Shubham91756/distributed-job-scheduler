import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── Create project validator ────────────────────────────────────────────────────
export const createProjectValidator = z.object({
	name: z.string().min(1, "Name is required").max(150),
	slug: z
		.string()
		.min(1, "Slug is required")
		.max(150)
		.regex(
			slugRegex,
			"Slug must be lowercase alphanumeric with hyphens (e.g. my-project)"
		),
	description: z.string().max(2000).optional(),
	organizationId: z.string().uuid("Invalid organization UUID"),
});

export type CreateProjectInput = z.infer<typeof createProjectValidator>;

// ── Update project validator ────────────────────────────────────────────────────
export const updateProjectValidator = z.object({
	name: z.string().min(1).max(150).optional(),
	slug: z
		.string()
		.min(1)
		.max(150)
		.regex(
			slugRegex,
			"Slug must be lowercase alphanumeric with hyphens"
		)
		.optional(),
	description: z.string().max(2000).optional(),
});

export type UpdateProjectInput = z.infer<typeof updateProjectValidator>;
