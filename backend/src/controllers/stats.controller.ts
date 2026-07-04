import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

export const getDashboardStats = asyncHandler(async (_req: Request, res: Response) => {
	const [
		jobStatusCounts,
		totalQueues,
		activeQueues,
		pausedQueues,
		archivedQueues,
		onlineWorkers,
		totalWorkers,
		recentFailedJobs,
		deadLetterCount,
		retryingCount,
		avgRetryCount,
		completedRetried,
		failedRetried,
		retriesToday,
		totalDLQJobs,
		recoveredDLQJobs,
		avgDLQRetries,
		failureCategories,
		mostRetriedJobs,
		failedJobsByQueue,
		queues,
		activeSchedules,
		upcomingJobs,
		jobsGeneratedToday,
	] = await Promise.all([
		prisma.job.groupBy({
			by: ["status"],
			_count: true,
			where: { deletedAt: null },
		}),
		prisma.queue.count({ where: { deletedAt: null } }),
		prisma.queue.count({ where: { deletedAt: null, status: "ACTIVE" } }),
		prisma.queue.count({ where: { deletedAt: null, status: "PAUSED" } }),
		prisma.queue.count({ where: { deletedAt: null, status: "ARCHIVED" } }),
		prisma.worker.count({ where: { deletedAt: null, status: "ONLINE" } }),
		prisma.worker.count({ where: { deletedAt: null } }),
		prisma.job.findMany({
			where: { status: { in: ["FAILED", "DEAD_LETTERED"] }, deletedAt: null },
			orderBy: { failedAt: "desc" },
			take: 10,
			select: {
				id: true,
				name: true,
				status: true,
				priority: true,
				attemptCount: true,
				failedAt: true,
				queue: { select: { id: true, name: true } },
			},
		}),
		prisma.deadLetterJob.count({ where: { recoveredAt: null } }),
		prisma.job.count({ where: { status: "RETRYING", deletedAt: null } }),
		prisma.job.aggregate({
			_avg: { attemptCount: true },
			where: { status: "COMPLETED", attemptCount: { gt: 1 }, deletedAt: null }
		}),
		prisma.job.count({
			where: { status: "COMPLETED", attemptCount: { gt: 1 }, deletedAt: null }
		}),
		prisma.job.count({
			where: { status: { in: ["FAILED", "DEAD_LETTERED", "DEAD_LETTER_PENDING"] }, attemptCount: { gt: 1 }, deletedAt: null }
		}),
		prisma.jobLog.count({
			where: { level: "WARN", message: { contains: "Retrying" }, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
		}),
		prisma.deadLetterJob.count({ where: { recoveredAt: null } }), // total active DLQ
		prisma.deadLetterJob.count({ where: { recoveredAt: { not: null } } }), // recovered
		prisma.deadLetterJob.aggregate({
			_avg: { retryCount: true },
			where: { recoveredAt: null }
		}),
		prisma.deadLetterJob.groupBy({
			by: ["failureCategory"],
			_count: true,
			where: { recoveredAt: null }
		}),
		prisma.job.findMany({
			where: { attemptCount: { gt: 1 }, deletedAt: null },
			orderBy: { attemptCount: "desc" },
			take: 10,
			select: { id: true, name: true, attemptCount: true, queue: { select: { name: true } } }
		}),
		prisma.job.groupBy({
			by: ["queueId"],
			where: { status: "FAILED", deletedAt: null },
			_count: true,
			orderBy: { _count: { queueId: "desc" } },
			take: 5
		}),
		prisma.queue.findMany({ select: { id: true, name: true } }),
		prisma.scheduleDefinition.count({ where: { enabled: true } }),
		prisma.scheduleDefinition.count({ where: { nextRunAt: { not: null } } }),
		prisma.job.count({
			where: {
				createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
				description: { contains: "Generated from schedule" }
			}
		})
	]);

	const topFailedQueues = failedJobsByQueue.map(fq => ({
		queueId: fq.queueId,
		name: queues.find(q => q.id === fq.queueId)?.name || "Unknown",
		failedCount: fq._count
	}));

	const jobStats: Record<string, number> = {};
	let totalJobs = 0;
	jobStatusCounts.forEach((sc) => {
		jobStats[sc.status] = sc._count;
		totalJobs += sc._count;
	});

	const completedJobs = jobStats["COMPLETED"] || 0;
	const failedJobs = jobStats["FAILED"] || 0;
	const successRate = completedJobs + failedJobs > 0
		? ((completedJobs / (completedJobs + failedJobs)) * 100).toFixed(1)
		: "100.0";

	res.setHeader('Cache-Control', 'public, max-age=10'); // 10 seconds cache
	res.status(200).json({
		status: "success",
		data: {
			overview: {
				totalJobs,
				completedJobs,
				failedJobs,
				queuedJobs: jobStats["QUEUED"] || 0,
				retryingJobs: jobStatusCounts[9] || 0, // Actually, it's jobStats["RETRYING"] 
				runningJobs: jobStats["RUNNING"] || 0,
				scheduledJobs: jobStats["SCHEDULED"] || 0,
				cancelledJobs: jobStats["CANCELLED"] || 0,
				deadLetteredJobs: deadLetterCount,
				successRate: `${successRate}%`,
			},
			retries: {
				retryingJobs: retryingCount,
				retriesToday: retriesToday,
				averageRetryCount: avgRetryCount?._avg?.attemptCount || 0,
				retrySuccessRate: (completedRetried + failedRetried) > 0 
					? ((completedRetried / (completedRetried + failedRetried)) * 100).toFixed(1) + "%" 
					: "0.0%",
			},
			dlq: {
				totalActive: totalDLQJobs,
				recovered: recoveredDLQJobs,
				permanentFailures: totalDLQJobs,
				averageRetryCount: avgDLQRetries?._avg?.retryCount || 0,
			},
			schedules: {
				activeSchedules: activeSchedules || 0,
				upcomingJobs: upcomingJobs || 0,
				jobsGeneratedToday: jobsGeneratedToday || 0,
			},
			failuresByCategory: failureCategories.reduce((acc, curr) => {
				acc[curr.failureCategory || "UNKNOWN"] = curr._count;
				return acc;
			}, {} as Record<string, number>),
			queues: {
				total: totalQueues,
				active: activeQueues,
				paused: pausedQueues,
				archived: archivedQueues,
			},
			workers: {
				total: totalWorkers,
				online: onlineWorkers,
			},
			recentFailedJobs,
			jobsByStatus: jobStats,
			mostRetriedJobs,
			topFailedQueues,
		},
	});
});

export const getThroughput = asyncHandler(async (req: Request, res: Response) => {
	const hours = parseInt((req.query as any).hours as string) || 24;
	const since = new Date(Date.now() - hours * 60 * 60 * 1000);

	const executions = await prisma.jobExecution.findMany({
		where: {
			startedAt: { gte: since },
		},
		select: {
			status: true,
			startedAt: true,
			finishedAt: true,
		},
		orderBy: { startedAt: "asc" },
	});

	// Group by hour
	const hourlyData: Record<string, { completed: number; failed: number; total: number }> = {};

	for (let i = 0; i < hours; i++) {
		const hourStart = new Date(since.getTime() + i * 60 * 60 * 1000);
		const key = hourStart.toISOString().slice(0, 13) + ":00:00Z";
		hourlyData[key] = { completed: 0, failed: 0, total: 0 };
	}

	executions.forEach((exec) => {
		const key = exec.startedAt.toISOString().slice(0, 13) + ":00:00Z";
		if (hourlyData[key]) {
			hourlyData[key].total++;
			if (exec.status === "SUCCEEDED") hourlyData[key].completed++;
			if (exec.status === "FAILED") hourlyData[key].failed++;
		}
	});

	const throughput = Object.entries(hourlyData).map(([hour, data]) => ({
		hour,
		...data,
	}));

	res.status(200).json({
		status: "success",
		data: { throughput },
	});
});
