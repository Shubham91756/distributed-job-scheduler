import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { SystemEventServiceLogger } from "../services/systemEvent.service";

function calculateQueueHealthMetrics(stats: Record<string, number>, avgAttempts: number, avgRuntime: number) {
	const total = Object.values(stats).reduce((a, b) => a + b, 0) || 0;
	const completed = stats["COMPLETED"] || 0;
	const failed = stats["FAILED"] || 0;
	const dlq = (stats["DEAD_LETTER_PENDING"] || 0) + (stats["DEAD_LETTERED"] || 0);
	const retrying = stats["RETRYING"] || 0;

	const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;
	const deadLetterRate = total > 0 ? Math.round((dlq / total) * 100) : 0;
	const retryRate = total > 0 ? Math.round((retrying / total) * 100) : 0;

	let healthScore = 100;
	healthScore -= deadLetterRate * 2;
	if (total > 0) healthScore -= (failed / total) * 50;
	healthScore = Math.max(0, Math.round(healthScore));

	let queueHealth = "GOOD";
	if (healthScore < 80) queueHealth = "WARNING";
	if (healthScore < 50) queueHealth = "CRITICAL";

	return { successRate, retryRate, deadLetterRate, avgAttempts: Math.round(avgAttempts * 10) / 10, avgRuntime: Math.round(avgRuntime), healthScore, queueHealth };
}

export const createQueue = asyncHandler(async (req: Request, res: Response) => {
	const { projectId } = (req.params as any);
	const userId = req.user!.id;
	const { name, description, priority, maxConcurrency, retryPolicyId } = req.body;

	const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null } });
	if (!project) {
		throw new AppError(404, "Project not found.");
	}

	const membership = await prisma.organizationMember.findFirst({
		where: { organizationId: project.organizationId, userId, deletedAt: null },
	});
	if (!membership) {
		throw new AppError(403, "You don't have access to this project.");
	}

	const queue = await prisma.queue.create({
		data: {
			name,
			description,
			priority: priority || "MEDIUM",
			maxConcurrency: maxConcurrency || 5,
			retryPolicyId,
			projectId,
			createdById: userId,
		},
	});

	await SystemEventServiceLogger.log({
		eventType: "Queue Created",
		message: `Queue ${queue.id} created`,
		severity: "INFO",
		service: "API",
		queueId: queue.id,
		correlationId: (req as any).correlationId,
	});

	res.status(201).json({ status: "success", data: { queue } });
});

export const getQueues = asyncHandler(async (req: Request, res: Response) => {
	const { projectId } = (req.params as any);
	const page = parseInt((req.query as any).page as string) || 1;
	const limit = parseInt((req.query as any).limit as string) || 20;

	const where = { projectId, deletedAt: null as Date | null };
	const [data, total] = await Promise.all([
		prisma.queue.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			include: {
				retryPolicy: { select: { id: true, name: true, strategy: true } },
				_count: {
					select: {
						jobs: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.queue.count({ where }),
	]);

	// Get job status counts for each queue
	const queuesWithStats = await Promise.all(
		data.map(async (queue) => {
			const statusCounts = await prisma.job.groupBy({
				by: ["status"],
				where: { queueId: queue.id, deletedAt: null },
				_count: true,
			});

			const stats: Record<string, number> = {};
			statusCounts.forEach((sc) => {
				stats[sc.status] = sc._count;
			});

			const dlqCounts = await prisma.deadLetterJob.groupBy({
				by: ["failureCategory"],
				where: { queueId: queue.id },
				_count: true,
			});

			const failuresByCategory: Record<string, number> = {};
			dlqCounts.forEach((sc) => {
				failuresByCategory[sc.failureCategory || "UNKNOWN"] = sc._count;
			});

			const jobAgg = await prisma.job.aggregate({
				where: { queueId: queue.id, deletedAt: null },
				_avg: { attemptCount: true },
			});
			const recentExecs = await prisma.jobExecution.findMany({
				where: { job: { queueId: queue.id, deletedAt: null }, status: "SUCCEEDED", finishedAt: { not: null } },
				select: { startedAt: true, finishedAt: true },
				take: 100,
				orderBy: { startedAt: "desc" },
			});
			let avgDuration = 0;
			if (recentExecs.length > 0) {
				const totalDuration = recentExecs.reduce((acc, exec) => acc + (exec.finishedAt!.getTime() - exec.startedAt.getTime()), 0);
				avgDuration = totalDuration / recentExecs.length;
			}

			const healthMetrics = calculateQueueHealthMetrics(
				stats, 
				jobAgg._avg.attemptCount || 1, 
				avgDuration
			);

			return { ...queue, jobStats: stats, failuresByCategory, healthMetrics };
		})
	);

	res.status(200).json({
		status: "success",
		data: { queues: queuesWithStats, total, page, limit },
	});
});

export const getQueue = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const queue = await prisma.queue.findFirst({
		where: { id, deletedAt: null },
		include: {
			project: { select: { id: true, name: true, slug: true, organizationId: true } },
			retryPolicy: true,
			createdBy: { select: { id: true, email: true, name: true } },
		},
	});

	if (!queue) {
		throw new AppError(404, "Queue not found.");
	}

	const statusCounts = await prisma.job.groupBy({
		by: ["status"],
		where: { queueId: id, deletedAt: null },
		_count: true,
	});

	const jobStats: Record<string, number> = {};
	statusCounts.forEach((sc) => {
		jobStats[sc.status] = sc._count;
	});

	const dlqCounts = await prisma.deadLetterJob.groupBy({
		by: ["failureCategory"],
		where: { queueId: id },
		_count: true,
	});

	const failuresByCategory: Record<string, number> = {};
	dlqCounts.forEach((sc) => {
		failuresByCategory[sc.failureCategory || "UNKNOWN"] = sc._count;
	});

	const jobAgg = await prisma.job.aggregate({
		where: { queueId: id, deletedAt: null },
		_avg: { attemptCount: true },
	});
	const recentExecs = await prisma.jobExecution.findMany({
		where: { job: { queueId: id, deletedAt: null }, status: "SUCCEEDED", finishedAt: { not: null } },
		select: { startedAt: true, finishedAt: true },
		take: 100,
		orderBy: { startedAt: "desc" },
	});
	let avgDuration = 0;
	if (recentExecs.length > 0) {
		const totalDuration = recentExecs.reduce((acc, exec) => acc + (exec.finishedAt!.getTime() - exec.startedAt.getTime()), 0);
		avgDuration = totalDuration / recentExecs.length;
	}

	const healthMetrics = calculateQueueHealthMetrics(
		jobStats, 
		jobAgg._avg.attemptCount || 1, 
		avgDuration
	);

	res.status(200).json({
		status: "success",
		data: { queue: { ...queue, jobStats, failuresByCategory, healthMetrics } },
	});
});

export const updateQueue = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const queue = await prisma.queue.findFirst({ where: { id, deletedAt: null } });
	if (!queue) {
		throw new AppError(404, "Queue not found.");
	}

	const updated = await prisma.queue.update({
		where: { id },
		data: req.body,
	});

	if (req.body.retryPolicyId && req.body.retryPolicyId !== queue.retryPolicyId) {
		await prisma.systemEvent.create({
			data: {
				eventType: "RETRY_POLICY_ASSIGNED",
				metadata: { queueId: id, retryPolicyId: req.body.retryPolicyId, oldRetryPolicyId: queue.retryPolicyId },
				queueId: id,
			},
		});
	}

	res.status(200).json({ status: "success", data: { queue: updated } });
});

export const pauseQueue = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const queue = await prisma.queue.findFirst({ where: { id, deletedAt: null } });
	if (!queue) {
		throw new AppError(404, "Queue not found.");
	}

	if (queue.status === "PAUSED") {
		throw new AppError(400, "Queue is already paused.");
	}

	const updated = await prisma.queue.update({
		where: { id },
		data: { status: "PAUSED" },
	});

	res.status(200).json({ status: "success", data: { queue: updated } });
});

export const resumeQueue = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const queue = await prisma.queue.findFirst({ where: { id, deletedAt: null } });
	if (!queue) {
		throw new AppError(404, "Queue not found.");
	}

	if (queue.status === "ACTIVE") {
		throw new AppError(400, "Queue is already active.");
	}

	const updated = await prisma.queue.update({
		where: { id },
		data: { status: "ACTIVE" },
	});

	res.status(200).json({ status: "success", data: { queue: updated } });
});

export const getQueueStats = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const queue = await prisma.queue.findFirst({ where: { id, deletedAt: null } });
	if (!queue) {
		throw new AppError(404, "Queue not found.");
	}

	const [statusCounts, avgExecutionTime, recentJobs] = await Promise.all([
		prisma.job.groupBy({
			by: ["status"],
			where: { queueId: id, deletedAt: null },
			_count: true,
		}),
		prisma.jobExecution.aggregate({
			where: { job: { queueId: id }, status: "SUCCEEDED", finishedAt: { not: null } },
			_avg: { attemptNumber: true },
		}),
		prisma.job.findMany({
			where: { queueId: id, deletedAt: null },
			orderBy: { createdAt: "desc" },
			take: 5,
			select: { id: true, name: true, status: true, createdAt: true, completedAt: true },
		}),
	]);

	const stats: Record<string, number> = {};
	statusCounts.forEach((sc) => {
		stats[sc.status] = sc._count;
	});

	res.status(200).json({
		status: "success",
		data: {
			queue: { id: queue.id, name: queue.name, status: queue.status },
			jobStats: stats,
			totalJobs: Object.values(stats).reduce((a, b) => a + b, 0),
			recentJobs,
		},
	});
});

export const archiveQueue = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const queue = await prisma.queue.findFirst({ where: { id, deletedAt: null } });
	if (!queue) {
		throw new AppError(404, "Queue not found.");
	}

	if (queue.status === "ARCHIVED") {
		throw new AppError(400, "Queue is already archived.");
	}

	const updated = await prisma.queue.update({
		where: { id },
		data: { status: "ARCHIVED" },
	});

	res.status(200).json({ status: "success", data: { queue: updated } });
});

export const deleteQueue = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const queue = await prisma.queue.findFirst({ where: { id, deletedAt: null } });
	if (!queue) {
		throw new AppError(404, "Queue not found.");
	}

	// Soft delete
	await prisma.queue.update({
		where: { id },
		data: { deletedAt: new Date() },
	});

	res.status(204).send();
});
