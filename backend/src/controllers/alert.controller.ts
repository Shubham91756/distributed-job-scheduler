import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
	const activeOnly = req.query.active === 'true';

	const where: any = activeOnly ? { status: "ACTIVE" } : {};

	const alerts = await prisma.alert.findMany({
		where,
		orderBy: { createdAt: "desc" }
	});

	res.status(200).json({
		status: "success",
		data: { alerts }
	});
});
