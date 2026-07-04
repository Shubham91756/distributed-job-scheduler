import { z } from "zod";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ── Create organization validator ───────────────────────────────────────────────
export const createOrganizationValidator = z.object({
	name: z.string().min(1, "Name is required").max(150),
	slug: z
		.string()
		.min(1, "Slug is required")
		.max(150)
		.regex(
			slugRegex,
			"Slug must be lowercase alphanumeric with hyphens (e.g. my-org)"
		),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationValidator>;

// ── Update organization validator ───────────────────────────────────────────────
export const updateOrganizationValidator = z.object({
	name: z.string().min(1).max(150).optional(),
	slug: z
		.string()
		.min(1)
		.max(150)
		.regex(
			slugRegex,
			"Slug must be lowercase alphanumeric with hyphens (e.g. my-org)"
		)
		.optional(),
});

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationValidator>;

// ── Add member validator ────────────────────────────────────────────────────────
export const addMemberValidator = z.object({
	userId: z.string().uuid("Invalid user UUID"),
	role: z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
});

export type AddMemberInput = z.infer<typeof addMemberValidator>;
