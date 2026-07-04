import { Request, Response } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/appError";
import { Prisma } from "@prisma/client";
import { SystemEventServiceLogger } from "../services/systemEvent.service";

export const createBatch = asyncHandler(async (req: Request, res: Response) => {
	const { name, queueId, projectId, payloads, priority, maxAttempts, retryPolicyId } = req.body;

	if (!name || !queueId || !projectId || !payloads || !Array.isArray(payloads) || payloads.length === 0) {
		throw new AppError(400, "Missing required fields (name, queueId, projectId, payloads[])");
	}

	if (payloads.length > 10000) {
		throw new AppError(400, "Maximum batch size is 10,000 jobs");
	}

	const batch = await prisma.$transaction(async (tx) => {
		// Create the parent batch
		const newBatch = await tx.batch.create({
			data: {
				name,
				queueId,
				projectId,
				createdById: req.user!.id,
				totalJobs: payloads.length,
				status: "QUEUED", // It's queued immediately
			}
		});

		// Prepare jobs
		const jobsData = payloads.map((payload, index) => ({
			name: `${name} - Job ${index + 1}`,
			queueId,
			projectId,
			createdById: req.user!.id,
			batchId: newBatch.id,
			payload: payload as object,
			priority: priority || "MEDIUM",
			maxAttempts: maxAttempts || 3,
			retryPolicyId: retryPolicyId || null,
			status: "QUEUED" as const,
		}));

		// Bulk insert
		await tx.job.createMany({
			data: jobsData
		});

		return newBatch;
	});

	await SystemEventServiceLogger.log({
		eventType: "Batch Created",
		message: `Batch ${batch.id} created with ${payloads.length} jobs`,
		severity: "INFO",
		service: "API",
		queueId,
		correlationId: (req as any).correlationId,
		metadata: { totalJobs: payloads.length }
	});

	res.status(201).json({
		success: true,
		data: { batch },
		message: "Batch created successfully",
		timestamp: new Date().toISOString()
	});
});

export const getBatches = asyncHandler(async (req: Request, res: Response) => {
	const page = parseInt((req.query as any).page as string) || 1;
	const limit = parseInt((req.query as any).limit as string) || 20;
	const projectId = req.query.projectId as string | undefined;

	const where: any = {};
	if (projectId) where.projectId = projectId;

	const [data, total] = await Promise.all([
		prisma.batch.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			include: {
				queue: { select: { id: true, name: true } },
				project: { select: { id: true, name: true } }
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.batch.count({ where }),
	]);

	res.status(200).json({
		success: true,
		data: { batches: data, total, page, limit },
		message: "Batches retrieved successfully",
		timestamp: new Date().toISOString()
	});
});

export const getBatch = asyncHandler(async (req: Request, res: Response) => {
	const id = req.params.id as string;

	const batch = await prisma.batch.findUnique({
		where: { id },
		include: {
			queue: { select: { id: true, name: true } },
			project: { select: { id: true, name: true } },
		},
	});

	if (!batch) {
		throw new AppError(404, "Batch not found");
	}

	res.status(200).json({
		success: true,
		data: { batch },
		message: "Batch retrieved successfully",
		timestamp: new Date().toISOString()
	});
});

export const getBatchJobs = asyncHandler(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const page = parseInt(req.query.page as string) || 1;
	const limit = parseInt(req.query.limit as string) || 50;
	const status = req.query.status as string | undefined;

	const where: any = { batchId: id, deletedAt: null };
	if (status) where.status = status;

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
		message: "Batch jobs retrieved successfully",
		timestamp: new Date().toISOString()
	});
});

export const cancelBatch = asyncHandler(async (req: Request, res: Response) => {
	const id = req.params.id as string;

	const batch = await prisma.batch.findUnique({ where: { id } });
	if (!batch) throw new AppError(404, "Batch not found");

	if (["COMPLETED", "FAILED", "CANCELLED", "PARTIALLY_COMPLETED"].includes(batch.status)) {
		throw new AppError(400, `Cannot cancel batch with status: ${batch.status}`);
	}

	await prisma.$transaction(async (tx) => {
		// Cancel queued jobs
		await tx.job.updateMany({
			where: { batchId: id, status: "QUEUED" },
			data: { status: "CANCELLED" }
		});

		// Request cancellation for running jobs
		await tx.job.updateMany({
			where: { batchId: id, status: "RUNNING" },
			data: { cancellationRequested: true }
		});

		// Re-evaluate batch stats and update
		// In a highly concurrent system, this might be slightly off until workers finish,
		// but it immediately stops new work.
		const queuedCount = await tx.job.count({ where: { batchId: id, status: "QUEUED" } });
		
		await tx.batch.update({
			where: { id },
			data: {
				status: "CANCELLED", // Set to cancelled immediately
				cancelledJobs: { increment: queuedCount } 
				// We don't adjust progress here completely accurately until running jobs finish
			}
		});
	});

	res.status(200).json({
		success: true,
		message: "Batch cancellation requested",
		timestamp: new Date().toISOString()
	});
});

export const retryBatch = asyncHandler(async (req: Request, res: Response) => {
	const id = req.params.id as string;
	const { failedOnly = true } = req.body;

	const batch = await prisma.batch.findUnique({ where: { id } });
	if (!batch) throw new AppError(404, "Batch not found");

	if (!["COMPLETED", "FAILED", "CANCELLED", "PARTIALLY_COMPLETED"].includes(batch.status)) {
		throw new AppError(400, "Can only retry batches that have finished executing");
	}

	await prisma.$transaction(async (tx) => {
		const targetStatuses = failedOnly ? ["FAILED", "DEAD_LETTERED"] : ["FAILED", "DEAD_LETTERED", "COMPLETED", "CANCELLED"];
		
		const jobsToRetry = await tx.job.findMany({
			where: { batchId: id, status: { in: targetStatuses as any } },
			select: { id: true }
		});

		if (jobsToRetry.length === 0) return;

		const jobIds = jobsToRetry.map(j => j.id);

		// Delete dead letter entries if any
		await tx.deadLetterJob.deleteMany({ where: { jobId: { in: jobIds } } });

		// Update jobs to QUEUED
		await tx.job.updateMany({
			where: { id: { in: jobIds } },
			data: {
				status: "QUEUED",
				attemptCount: 0,
				failedAt: null,
				deadLetteredAt: null,
				completedAt: null,
				startedAt: null,
				availableAt: new Date(),
			}
		});

		// Reset batch counters based on what we're retrying
		const updateData: any = {
			status: "QUEUED",
			failedJobs: { decrement: failedOnly ? jobIds.length : batch.failedJobs },
		};

		if (!failedOnly) {
			updateData.completedJobs = 0;
			updateData.cancelledJobs = 0;
			updateData.runningJobs = 0;
			updateData.progress = 0;
		} else {
			// Recalculate progress for partial retry
			const remainingCompleted = batch.completedJobs;
			const remainingCancelled = batch.cancelledJobs;
			const remainingFailed = batch.failedJobs - jobIds.length;
			updateData.progress = ((remainingCompleted + remainingCancelled + remainingFailed) / batch.totalJobs) * 100;
		}

		await tx.batch.update({
			where: { id },
			data: updateData
		});
	});

	res.status(200).json({
		success: true,
		message: "Batch retry initiated",
		timestamp: new Date().toISOString()
	});
});

export const deleteBatch = asyncHandler(async (req: Request, res: Response) => {
	const id = req.params.id as string;

	await prisma.batch.delete({ where: { id } });

	res.status(200).json({
		success: true,
		message: "Batch deleted successfully",
		timestamp: new Date().toISOString()
	});
});
