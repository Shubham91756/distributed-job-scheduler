import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";

export const registerWorker = asyncHandler(async (req: Request, res: Response) => {
	const { name, capacity } = req.body;

	const worker = await prisma.worker.create({
		data: {
			name,
			capacity: capacity || 5,
			status: "ONLINE",
			lastHeartbeatAt: new Date(),
		},
	});

	res.status(201).json({ success: true, data: { worker }, message: "Worker registered", timestamp: new Date().toISOString() });
});

export const getWorkers = asyncHandler(async (req: Request, res: Response) => {
	const { status } = (req.query as any);

	const where: any = { deletedAt: null };
	if (status) where.status = status;

	const workers = await prisma.worker.findMany({
		where,
		include: {
			_count: {
				select: {
					executions: { where: { status: "STARTED" } },
				},
			},
			heartbeats: {
				take: 1,
				orderBy: { heartbeatAt: 'desc' }
			}
		},
		orderBy: { createdAt: "desc" },
	});

	const workersWithDetails = workers.map((w) => {
		const activeJobs = w._count.executions;
		let healthScore = "Healthy";
		
		const hb = w.heartbeats[0]?.metadata as any;
		
		if (w.status === "OFFLINE" || w.status === "DEAD") {
			healthScore = "Critical";
		} else if (w.lastHeartbeatAt && new Date().getTime() - new Date(w.lastHeartbeatAt).getTime() > 60000) {
			healthScore = "Critical";
		} else if (w.status === "DRAINING" || w.status === "STOPPED") {
			healthScore = "Warning";
		} else if (hb?.metrics?.successRate) {
			const sr = parseFloat(hb.metrics.successRate);
			if (sr < 80) healthScore = "Warning";
			if (sr < 50) healthScore = "Critical";
		}

		return {
			...w,
			activeJobs,
			healthScore
		};
	});

	res.status(200).json({
		success: true,
		data: { workers: workersWithDetails },
		message: "Workers retrieved successfully",
		timestamp: new Date().toISOString()
	});
});

export const getWorker = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const worker = await prisma.worker.findFirst({
		where: { id, deletedAt: null },
		include: {
			heartbeats: {
				orderBy: { heartbeatAt: "desc" },
				take: 10,
			},
			executions: {
				where: { status: "STARTED" },
				include: {
					job: { select: { id: true, name: true, status: true } },
				},
				orderBy: { startedAt: "desc" },
				take: 20,
			},
			_count: {
				select: { executions: true, heartbeats: true },
			},
		},
	});

	if (!worker) {
		throw new AppError(404, "Worker not found.");
	}

	res.status(200).json({ success: true, data: { worker }, message: "Worker retrieved successfully", timestamp: new Date().toISOString() });
});

export const recordHeartbeat = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);
	const { metadata } = req.body;

	const worker = await prisma.worker.findFirst({ where: { id, deletedAt: null } });
	if (!worker) {
		throw new AppError(404, "Worker not found.");
	}

	await prisma.$transaction([
		prisma.workerHeartbeat.create({
			data: {
				workerId: id,
				metadata,
			},
		}),
		prisma.worker.update({
			where: { id },
			data: { lastHeartbeatAt: new Date(), status: "ONLINE" },
		}),
	]);

	res.status(200).json({ success: true, data: null, message: "Heartbeat recorded.", timestamp: new Date().toISOString() });
});
