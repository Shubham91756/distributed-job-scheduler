import type { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { SystemEventServiceLogger } from "../services/systemEvent.service";

export const createJob = asyncHandler(async (req: Request, res: Response) => {
	const { queueId } = (req.params as any);
	const userId = req.user!.id;
	const { name, description, payload, priority, maxAttempts, retryPolicyId, idempotencyKey, type, delayMs, runAt, cronExpression } = req.body;

	const queue = await prisma.queue.findFirst({ where: { id: queueId, deletedAt: null } });
	if (!queue) {
		throw new AppError(404, "Queue not found.");
	}

	if (queue.status === "PAUSED") {
		throw new AppError(400, "Cannot add jobs to a paused queue.");
	}

	// Check idempotency
	if (idempotencyKey) {
		const existing = await prisma.job.findUnique({ where: { idempotencyKey } });
		if (existing) {
			return res.status(200).json({
				status: "success",
				data: { job: existing },
				message: "Job already exists (idempotent).",
			});
		}
	}

	let availableAt: Date | null = null;
	let status: "QUEUED" | "SCHEDULED" = "QUEUED";

	if (type === "delayed" && delayMs) {
		availableAt = new Date(Date.now() + delayMs);
		status = "SCHEDULED";
	} else if (type === "scheduled" && runAt) {
		availableAt = new Date(runAt);
		status = "SCHEDULED";
	} else if (type === "recurring") {
		status = "SCHEDULED";
	}

	const job = await prisma.$transaction(async (tx) => {
		const correlationId = (req.body as any).correlationId || uuidv4();

		const newJob = await tx.job.create({
			data: {
				name,
				description,
				payload: payload || {},
				priority: priority || "MEDIUM",
				status,
				maxAttempts: maxAttempts || 3,
				availableAt,
				idempotencyKey,
				retryPolicyId: retryPolicyId || queue.retryPolicyId,
				queueId,
				projectId: queue.projectId,
				createdById: userId,
				correlationId,
			},
		});

		// Note: recurring/cron schedules are now handled by ScheduleDefinition.

		// Create job log
		await tx.jobLog.create({
			data: {
				jobId: newJob.id,
				level: "INFO",
				message: `Job created with type: ${type || "immediate"}`,
				correlationId,
				context: { type, createdBy: userId },
			},
		});

		return newJob;
	});

	res.status(201).json({ 
		success: true, 
		data: { job },
		message: "Job created successfully",
		timestamp: new Date().toISOString()
	});
});

export const createBatchJobs = asyncHandler(async (req: Request, res: Response) => {
	const { queueId } = (req.params as any);
	const userId = req.user!.id;
	const { jobs } = req.body;

	const queue = await prisma.queue.findFirst({ where: { id: queueId, deletedAt: null } });
	if (!queue) {
		throw new AppError(404, "Queue not found.");
	}

	const createdJobs = await prisma.$transaction(
		jobs.map((jobData: any) =>
			prisma.job.create({
				data: {
					name: jobData.name,
					description: jobData.description,
					payload: jobData.payload || {},
					priority: jobData.priority || "MEDIUM",
					status: "QUEUED",
					maxAttempts: jobData.maxAttempts || 3,
					idempotencyKey: jobData.idempotencyKey,
					retryPolicyId: jobData.retryPolicyId || queue.retryPolicyId,
					queueId,
					projectId: queue.projectId,
					createdById: userId,
					correlationId: jobData.correlationId || uuidv4(),
				},
			})
		)
	);

	res.status(201).json({
		success: true,
		data: { jobs: createdJobs, count: createdJobs.length },
		message: "Batch jobs created successfully",
		timestamp: new Date().toISOString()
	});
});

export const getJobsByProject = asyncHandler(async (req: Request, res: Response) => {
	const { projectId } = (req.params as any);
	const page = parseInt((req.query as any).page as string) || 1;
	const limit = parseInt((req.query as any).limit as string) || 20;
	const { status, priority, search } = (req.query as any);

	const where: any = { projectId, deletedAt: null };
	if (status) where.status = status;
	if (priority) where.priority = priority;
	if (search) where.name = { contains: search as string, mode: "insensitive" };

	const [data, total] = await Promise.all([
		prisma.job.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			include: {
				queue: { select: { id: true, name: true } },
				_count: { select: { executions: true } },
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.job.count({ where }),
	]);

	res.status(200).json({
		success: true,
		data: { jobs: data, total, page, limit },
		message: "Jobs retrieved successfully",
		timestamp: new Date().toISOString()
	});
});

export const getJobsByQueue = asyncHandler(async (req: Request, res: Response) => {
	const { queueId } = (req.params as any);
	const page = parseInt((req.query as any).page as string) || 1;
	const limit = parseInt((req.query as any).limit as string) || 20;
	const { status, priority, search } = (req.query as any);

	const where: any = { queueId, deletedAt: null };
	if (status) where.status = status;
	if (priority) where.priority = priority;
	if (search) where.name = { contains: search as string, mode: "insensitive" };

	const [data, total] = await Promise.all([
		prisma.job.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			include: {
				_count: { select: { executions: true } },
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.job.count({ where }),
	]);

	res.status(200).json({
		success: true,
		data: { jobs: data, total, page, limit },
		message: "Jobs retrieved successfully",
		timestamp: new Date().toISOString()
	});
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const job = await prisma.job.findFirst({
		where: { id, deletedAt: null },
		include: {
			queue: { select: { id: true, name: true, status: true } },
			project: { select: { id: true, name: true } },
			retryPolicy: true,
			executions: {
				orderBy: { startedAt: "desc" },
				take: 20,
				include: {
					worker: { select: { id: true, name: true } },
				},
			},
			logs: {
				orderBy: { createdAt: "desc" },
				take: 50,
			},
			deadLetter: true,
			createdBy: { select: { id: true, email: true, name: true } },
			recoveries: { orderBy: { recoveredAt: "desc" } }
		},
	});

	if (!job) {
		throw new AppError(404, "Job not found.");
	}

	res.status(200).json({ 
		success: true, 
		data: { job },
		message: "Job retrieved successfully",
		timestamp: new Date().toISOString()
	});
});

export const retryJob = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const job = await prisma.job.findFirst({ where: { id, deletedAt: null } });
	if (!job) {
		throw new AppError(404, "Job not found.");
	}

	if (!["FAILED", "DEAD_LETTERED", "CANCELLED"].includes(job.status)) {
		throw new AppError(400, `Cannot retry a job with status: ${job.status}`);
	}

	const updated = await prisma.$transaction(async (tx) => {
		// Delete dead letter entry if exists
		await tx.deadLetterJob.deleteMany({ where: { jobId: id } });

		const updatedJob = await tx.job.update({
			where: { id },
			data: {
				status: "QUEUED",
				attemptCount: 0,
				failedAt: null,
				deadLetteredAt: null,
				completedAt: null,
				startedAt: null,
				availableAt: new Date(),
			},
		});

		await tx.jobRecovery.create({
			data: { jobId: id, recoveredBy: req.user!.id, status: "SUCCESS" },
		});

		await tx.systemEvent.create({
			data: {
				eventType: "MANUAL_RETRY",
				jobId: id,
				metadata: { userId: req.user!.id, previousStatus: job.status },
				correlationId: job.correlationId,
			}
		});

		await tx.jobLog.create({
			data: {
				jobId: id,
				level: "INFO",
				message: "Job manually retried",
				context: { retriedBy: req.user!.id },
			},
		});

		return updatedJob;
	});

	res.status(200).json({ 
		success: true, 
		data: { job: updated },
		message: "Job retried successfully",
		timestamp: new Date().toISOString()
	});
});

export const cancelJob = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const job = await prisma.job.findFirst({ where: { id, deletedAt: null } });
	if (!job) {
		throw new AppError(404, "Job not found.");
	}

	if (!["QUEUED", "SCHEDULED", "RUNNING"].includes(job.status)) {
		throw new AppError(400, `Cannot cancel a job with status: ${job.status}`);
	}

	let updated;
	if (job.status === "RUNNING") {
		updated = await prisma.job.update({
			where: { id },
			data: { cancellationRequested: true },
		});
	} else {
		updated = await prisma.job.update({
			where: { id },
			data: { status: "CANCELLED" },
		});
	}

	await prisma.jobLog.create({
		data: {
			jobId: id,
			level: "WARN",
			message: "Job cancelled",
			context: { cancelledBy: req.user!.id },
		},
	});

	res.status(200).json({ 
		success: true, 
		data: { job: updated },
		message: "Job cancelled successfully",
		timestamp: new Date().toISOString()
	});
});

export const getJobExecutions = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const executions = await prisma.jobExecution.findMany({
		where: { jobId: id },
		include: {
			worker: { select: { id: true, name: true } },
		},
		orderBy: { startedAt: "desc" },
	});

	res.status(200).json({ 
		success: true, 
		data: { executions },
		message: "Job executions retrieved successfully",
		timestamp: new Date().toISOString()
	});
});

export const getJobLogs = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);
	const page = parseInt((req.query as any).page as string) || 1;
	const limit = parseInt((req.query as any).limit as string) || 50;

	const [data, total] = await Promise.all([
		prisma.jobLog.findMany({
			where: { jobId: id },
			skip: (page - 1) * limit,
			take: limit,
			orderBy: { createdAt: "desc" },
		}),
		prisma.jobLog.count({ where: { jobId: id } }),
	]);

	res.status(200).json({
		success: true,
		data: { logs: data, total, page, limit },
		message: "Job logs retrieved successfully",
		timestamp: new Date().toISOString()
	});
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);
	const { name, description, payload, priority, maxAttempts, retryPolicyId, type, delayMs, runAt, cronExpression } = req.body;

	const job = await prisma.job.findFirst({ where: { id, deletedAt: null } });
	if (!job) {
		throw new AppError(404, "Job not found.");
	}

	if (!["QUEUED", "SCHEDULED"].includes(job.status)) {
		throw new AppError(400, `Cannot update a job with status: ${job.status}`);
	}

	let availableAt = job.availableAt;
	let status = job.status;

	if (type === "delayed" && delayMs) {
		availableAt = new Date(Date.now() + delayMs);
		status = "SCHEDULED";
	} else if (type === "scheduled" && runAt) {
		availableAt = new Date(runAt);
		status = "SCHEDULED";
	} else if (type === "recurring") {
		status = "SCHEDULED";
	} else if (type === "immediate") {
		availableAt = null;
		status = "QUEUED";
	}

	const updated = await prisma.$transaction(async (tx) => {
		const updatedJob = await tx.job.update({
			where: { id },
			data: {
				...(name && { name }),
				...(description !== undefined && { description }),
				...(payload && { payload }),
				...(priority && { priority }),
				...(maxAttempts && { maxAttempts }),
				...(retryPolicyId !== undefined && { retryPolicyId }),
				...(availableAt !== undefined && { availableAt }),
				...(status !== undefined && { status }),
			},
		});

		await tx.jobLog.create({
			data: {
				jobId: id,
				level: "INFO",
				message: "Job updated",
				context: { updatedBy: req.user!.id, type, priority },
			},
		});

		return updatedJob;
	});

	res.status(200).json({ 
		success: true, 
		data: { job: updated },
		message: "Job updated successfully",
		timestamp: new Date().toISOString()
	});
});

export const deleteJob = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const job = await prisma.job.findFirst({ where: { id, deletedAt: null } });
	if (!job) {
		throw new AppError(404, "Job not found.");
	}

	await prisma.job.update({
		where: { id },
		data: { deletedAt: new Date() },
	});

	await prisma.jobLog.create({
		data: {
			jobId: id,
			level: "WARN",
			message: "Job deleted",
			context: { deletedBy: req.user!.id },
		},
	});

	res.status(200).json({ 
		success: true, 
		data: null,
		message: "Job deleted successfully",
		timestamp: new Date().toISOString()
	});
});

export const retryAllFailedJobs = asyncHandler(async (req: Request, res: Response) => {
	const { queueId } = (req.params as any);

	const failedJobs = await prisma.job.findMany({
		where: {
			queueId,
			status: { in: ["FAILED", "DEAD_LETTER_PENDING", "DEAD_LETTERED"] },
			deletedAt: null
		}
	});

	if (failedJobs.length === 0) {
		res.status(200).json({ success: true, message: "No failed jobs to retry", data: { count: 0 } });
		return;
	}

	const jobIds = failedJobs.map((j) => j.id);

	await prisma.$transaction(async (tx) => {
		await tx.job.updateMany({
			where: { id: { in: jobIds } },
			data: {
				status: "QUEUED",
				attemptCount: 0,
				availableAt: new Date(),
				failedAt: null,
				deadLetteredAt: null
			}
		});

		await tx.deadLetterJob.deleteMany({
			where: { jobId: { in: jobIds } }
		});

		await tx.systemEvent.create({
			data: {
				eventType: "BULK_RETRY",
				queueId,
				metadata: { count: jobIds.length, userId: req.user!.id },
			}
		});
	});

	for (const id of jobIds) {
		await prisma.jobLog.create({
			data: { jobId: id, level: "INFO", message: "Bulk retry requested by user", context: { userId: req.user!.id } }
		});
	}

	res.status(200).json({
		success: true,
		message: `Retrying ${jobIds.length} failed jobs`,
		data: { count: jobIds.length }
	});
});

export const disableRetry = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const job = await prisma.job.findFirst({ where: { id, deletedAt: null } });
	if (!job) throw new AppError(404, "Job not found");

	await prisma.job.update({
		where: { id },
		data: { retryPolicyId: null, maxAttempts: 1 }
	});

	await prisma.jobLog.create({
		data: { jobId: id, level: "INFO", message: "Retries disabled by user", context: { userId: req.user!.id } }
	});

	res.status(200).json({ success: true, message: "Retries disabled for job", data: null });
});

export const changeRetryPolicy = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);
	const { retryPolicyId, maxAttempts } = req.body;

	if (!retryPolicyId) throw new AppError(400, "retryPolicyId is required");

	const job = await prisma.job.findFirst({ where: { id, deletedAt: null } });
	if (!job) throw new AppError(404, "Job not found");

	const updated = await prisma.job.update({
		where: { id },
		data: { retryPolicyId, ...(maxAttempts && { maxAttempts }) }
	});

	await prisma.jobLog.create({
		data: { jobId: id, level: "INFO", message: "Retry policy updated", context: { userId: req.user!.id, retryPolicyId } }
	});

	res.status(200).json({ success: true, message: "Retry policy updated", data: { job: updated } });
});
