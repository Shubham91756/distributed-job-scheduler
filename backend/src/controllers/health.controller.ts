import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const liveCheck = (req: Request, res: Response) => {
	res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
};

export const readyCheck = asyncHandler(async (req: Request, res: Response) => {
	try {
		await prisma.$queryRaw`SELECT 1`;
		res.status(200).json({ status: "OK", db: "connected" });
	} catch (error) {
		res.status(503).json({ status: "ERROR", db: "disconnected" });
	}
});

export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
	let dbStatus = "connected";
	try {
		await prisma.$queryRaw`SELECT 1`;
	} catch (error) {
		dbStatus = "disconnected";
	}

	const onlineWorkers = await prisma.worker.count({
		where: { status: "ONLINE" }
	});

	const response = {
		status: dbStatus === "connected" ? "OK" : "ERROR",
		timestamp: new Date().toISOString(),
		services: {
			database: dbStatus,
			workers: {
				online: onlineWorkers
			}
		}
	};

	res.status(dbStatus === "connected" ? 200 : 503).json(response);
});
