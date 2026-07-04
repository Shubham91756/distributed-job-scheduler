import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";

export const getDeadLetterJobs = asyncHandler(async (req: Request, res: Response) => {
	const page = parseInt((req.query as any).page as string) || 1;
	const limit = parseInt((req.query as any).limit as string) || 20;
	
	const { queueId, workerId, search } = req.query as any;

	const where: any = {
		recoveredAt: null, // Only show active DLQ jobs
	};

	if (queueId) where.queueId = queueId;
	if (workerId) where.workerId = workerId;
	if (search) {
		where.OR = [
			{ reason: { contains: search, mode: "insensitive" } },
			{ lastError: { contains: search, mode: "insensitive" } },
			{ jobId: search } // if someone searches by exact job ID
		];
	}

	const [data, total] = await Promise.all([
		prisma.deadLetterJob.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			include: {
				job: {
					select: {
						id: true,
						name: true,
						status: true,
						priority: true,
					},
				},
				// We need to fetch the queue name separately as we added queueId to DeadLetterJob. Let's see if prisma generates a relation for queue. We didn't add the relation, but we can query it or join. Actually, it's easier to just fetch queue name using the job relation.
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.deadLetterJob.count({ where }),
	]);

    // Let's manually inject the queue name by looking up queues if needed, but wait, `job` relation is included, and `job` has `queueId`. We can just query `queue` from `job` in the include.
    
    // Fix include:
	const [fixedData, fixedTotal] = await Promise.all([
		prisma.deadLetterJob.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			include: {
				job: {
					select: {
						id: true,
						name: true,
						status: true,
						priority: true,
						queue: { select: { id: true, name: true } }
					},
				}
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.deadLetterJob.count({ where }),
	]);

	res.status(200).json({
		status: "success",
		data: { deadLetterJobs: fixedData, total: fixedTotal, page, limit },
	});
});

export const getDeadLetterJob = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const dlJob = await prisma.deadLetterJob.findFirst({
		where: { id },
		include: { job: { include: { queue: true } } },
	});

	if (!dlJob) {
		throw new AppError(404, "Dead letter job not found.");
	}

	res.status(200).json({ status: "success", data: { deadLetterJob: dlJob } });
});

export const retryDeadLetterJob = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const dlJob = await prisma.deadLetterJob.findFirst({
		where: { id, recoveredAt: null },
		include: { job: true },
	});

	if (!dlJob) {
		throw new AppError(404, "Dead letter job not found or already recovered.");
	}

	const updated = await prisma.$transaction(async (tx) => {
		// Mark DLQ as recovered
		await tx.deadLetterJob.update({
			where: { id },
			data: { recoveredAt: new Date() }
		});

		// Move job back to QUEUED
		const job = await tx.job.update({
			where: { id: dlJob.jobId },
			data: {
				status: "QUEUED",
				attemptCount: 0,
				failedAt: null,
				deadLetteredAt: null,
				availableAt: new Date(),
			},
		});

		await tx.jobLog.create({
			data: {
				jobId: dlJob.jobId,
				level: "INFO",
				message: "Dead letter job manually retried from DLQ",
				context: { retriedBy: req.user!.id },
			},
		});
		
		await tx.systemEvent.create({
		    data: {
		        eventType: "DLQ_JOB_RECOVERED",
		        jobId: dlJob.jobId,
		        queueId: dlJob.queueId,
		        metadata: { dlqId: id, retriedBy: req.user!.id }
		    }
		});

		await tx.jobRecovery.create({
			data: {
				jobId: dlJob.jobId,
				recoveredBy: req.user!.id,
				status: "PENDING"
			}
		});

		return job;
	});

	res.status(200).json({ status: "success", data: { job: updated } });
});

export const retryAllDeadLetterJobs = asyncHandler(async (req: Request, res: Response) => {
	const { queueId } = req.body;

	const where: any = { recoveredAt: null };
	if (queueId) {
		where.queueId = queueId;
	}

	const dlJobs = await prisma.deadLetterJob.findMany({
		where,
		select: { id: true, jobId: true, queueId: true }
	});

	if (dlJobs.length === 0) {
		return res.status(200).json({ status: "success", message: "No dead letter jobs to retry." });
	}

	let retriedCount = 0;
	
	for (const dlJob of dlJobs) {
		await prisma.$transaction(async (tx) => {
			await tx.deadLetterJob.update({
				where: { id: dlJob.id },
				data: { recoveredAt: new Date() }
			});

			await tx.job.update({
				where: { id: dlJob.jobId },
				data: {
					status: "QUEUED",
					attemptCount: 0,
					failedAt: null,
					deadLetteredAt: null,
					availableAt: new Date(),
				},
			});

			await tx.jobLog.create({
				data: {
					jobId: dlJob.jobId,
					level: "INFO",
					message: "Dead letter job bulk retried from DLQ",
					context: { retriedBy: req.user!.id },
				},
			});

			await tx.systemEvent.create({
				data: {
					eventType: "DLQ_JOB_RECOVERED",
					jobId: dlJob.jobId,
					queueId: dlJob.queueId,
					metadata: { dlqId: dlJob.id, retriedBy: req.user!.id }
				}
			});

			await tx.jobRecovery.create({
				data: {
					jobId: dlJob.jobId,
					recoveredBy: req.user!.id,
					status: "PENDING"
				}
			});
		});
		retriedCount++;
	}

	res.status(200).json({
		status: "success",
		message: `Successfully retried ${retriedCount} dead letter jobs.`,
	});
});

export const purgeDeadLetterQueue = asyncHandler(async (req: Request, res: Response) => {
	const { queueId } = req.query as any;

    const where: any = {};
    if (queueId) {
        where.queueId = queueId;
    }

	const result = await prisma.deadLetterJob.deleteMany({
		where
	});

	await prisma.systemEvent.create({
		data: {
			eventType: "DLQ_PURGE",
			queueId: queueId || null,
			metadata: { purgedCount: result.count, purgedBy: req.user!.id }
		}
	});

	res.status(200).json({
		status: "success",
		message: `Purged ${result.count} dead letter jobs.`,
	});
});

export const deleteDeadLetterJob = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	await prisma.deadLetterJob.delete({
		where: { id },
	});

	res.status(200).json({
		status: "success",
		message: `Deleted dead letter job ${id}.`,
	});
});

export const exportCSV = asyncHandler(async (req: Request, res: Response) => {
	const dlJobs = await prisma.deadLetterJob.findMany({
		include: { job: { select: { name: true, queue: { select: { name: true } } } } }
	});

	let csv = "ID,Job Name,Queue,Reason,Failure Category,Retry Count,Final Attempt,Recovered At\n";
	for (const job of dlJobs) {
		csv += `"${job.id}","${job.job?.name}","${job.job?.queue?.name}","${job.reason}","${job.failureCategory || 'UNKNOWN'}","${job.retryCount}","${job.finalAttemptAt}","${job.recoveredAt || ''}"\n`;
	}

	res.header("Content-Type", "text/csv");
	res.attachment("dlq-export.csv");
	return res.send(csv);
});

export const exportJSON = asyncHandler(async (req: Request, res: Response) => {
	const dlJobs = await prisma.deadLetterJob.findMany({
		include: { job: { select: { name: true, queue: { select: { name: true } } } } }
	});

	res.header("Content-Type", "application/json");
	res.attachment("dlq-export.json");
	return res.send(JSON.stringify(dlJobs, null, 2));
});
