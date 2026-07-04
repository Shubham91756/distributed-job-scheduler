import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const getSystemEvents = asyncHandler(async (req: Request, res: Response) => {
	const { page = 1, limit = 50, severity, service, search } = req.query;
	const skip = (Number(page) - 1) * Number(limit);

	const where: any = {};
	
	if (severity) where.severity = severity;
	if (service) where.service = service;
	if (search) {
		where.OR = [
			{ message: { contains: search as string, mode: "insensitive" } },
			{ eventType: { contains: search as string, mode: "insensitive" } },
			{ correlationId: { contains: search as string, mode: "insensitive" } },
		];
	}

	const [events, total] = await Promise.all([
		prisma.systemEvent.findMany({
			where,
			skip,
			take: Number(limit),
			orderBy: { timestamp: "desc" },
		}),
		prisma.systemEvent.count({ where }),
	]);

	res.status(200).json({
		status: "success",
		data: { events, total, page: Number(page), limit: Number(limit) },
	});
});
