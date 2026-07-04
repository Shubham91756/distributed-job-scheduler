import { z } from "zod";

export const uuidParam = z.object({
	id: z.string().uuid()
});

export const paginationQuery = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20)
});

export const dateRangeQuery = z.object({
	from: z.coerce.date().optional(),
	to: z.coerce.date().optional()
});

export type PaginationQuery = z.infer<typeof paginationQuery>;
export type DateRangeQuery = z.infer<typeof dateRangeQuery>;
