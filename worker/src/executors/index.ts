import { prisma } from "../db/prisma";
import { WorkerLogger, FailureClassifier } from "../utils";
import { RetryEngine } from "../retry";

export class JobExecutor {
	private logger = new WorkerLogger();

	async execute(jobRaw: any, workerId: string): Promise<{ success: boolean; durationMs: number }> {
		this.logger.info(`Executing job: ${jobRaw.id} (${jobRaw.name})`);
		
		const startTime = Date.now();
		let success = false;
		let errorMessage = "";
		let metrics = {};
		let stackTrace = "";
		let statusOutcome = "FAILED";

		const attemptNumber = (jobRaw.attemptCount || 0) + 1;
		const maxExecutionTimeS = jobRaw.timeoutSeconds || 300;

		const execution = await prisma.jobExecution.create({
			data: {
				jobId: jobRaw.id,
				workerId,
				attemptNumber,
				status: "STARTED",
				correlationId: jobRaw.correlationId
			}
		});

		try {
			const startOps: any[] = [
				prisma.job.update({
					where: { id: jobRaw.id },
					data: { 
						status: "RUNNING", 
						attemptCount: { increment: 1 } 
					}
				})
			];

			if (jobRaw.batchId) {
				startOps.push(prisma.batch.update({
					where: { id: jobRaw.batchId },
					data: { runningJobs: { increment: 1 }, status: "RUNNING" }
				}));
			}

			await prisma.$transaction(startOps);

			await prisma.jobLog.create({
				data: {
					jobId: jobRaw.id,
					level: "INFO",
					message: `Job ${jobRaw.id} started`,
					correlationId: jobRaw.correlationId,
					context: { worker: workerId, job: jobRaw.id, queue: jobRaw.queueId, status: "started" }
				}
			});

			// --- SIMULATE EXECUTION (Chunked + Cancellable + Timeout) ---
			// We will simulate a job taking between 1 to 10 seconds.
			const durationMs = Math.floor(Math.random() * 9000) + 1000;
			const chunkMs = 500; // Check DB every 500ms
			const startExecution = Date.now();
			
			let isCancelled = false;
			let isTimedOut = false;

			while (Date.now() - startExecution < durationMs) {
				// Enforce timeout
				if ((Date.now() - startTime) > (maxExecutionTimeS * 1000)) {
					isTimedOut = true;
					break;
				}

				// Enforce cooperative cancellation
				const currentJobState = await prisma.job.findUnique({
					where: { id: jobRaw.id },
					select: { cancellationRequested: true }
				});

				if (currentJobState?.cancellationRequested) {
					isCancelled = true;
					break;
				}

				await new Promise(resolve => setTimeout(resolve, Math.min(chunkMs, durationMs - (Date.now() - startExecution))));
			}

			if (isTimedOut) {
				throw new Error(`Job Execution Timed Out after ${maxExecutionTimeS}s`);
			}

			if (isCancelled) {
				statusOutcome = "CANCELLED";
				throw new Error("Job execution was cooperatively cancelled.");
			}
			
			// Fail ~20% of the time (if not cancelled/timeout)
			const shouldFail = Math.random() < 0.2;
			
			if (shouldFail) {
				throw new Error("Simulated job failure (20% chance hit)");
			}
			
			metrics = { 
				durationMs: Date.now() - startTime,
				memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
			};
			success = true;
			statusOutcome = "COMPLETED";
			
		} catch (error: any) {
			success = false;
			errorMessage = error.message || "Unknown error during execution";
			stackTrace = error.stack || "";
			this.logger.error(`Job ${jobRaw.id} execution aborted: ${errorMessage}`);
		}

		const actualDurationMs = Date.now() - startTime;
		metrics = { ...metrics, actualDurationMs };

		// Handle outcome
		if (success) {
			const successTxOps: any[] = [
				prisma.jobExecution.update({
					where: { id: execution.id },
					data: { status: "SUCCEEDED", finishedAt: new Date(), metrics }
				}),
				prisma.job.update({
					where: { id: jobRaw.id },
					data: { status: "COMPLETED", completedAt: new Date() }
				}),
				prisma.jobLog.create({
					data: { 
						jobId: jobRaw.id, 
						level: "INFO", 
						message: `Job ${jobRaw.id} completed`,
						correlationId: jobRaw.correlationId,
						context: { worker: workerId, job: jobRaw.id, queue: jobRaw.queueId, actualDurationMs, status: "completed", metrics }
					}
				}),
				prisma.jobRecovery.updateMany({
					where: { jobId: jobRaw.id, status: "PENDING" },
					data: { status: "SUCCESS" }
				})
			];

			if (jobRaw.batchId) {
				successTxOps.push(prisma.$executeRaw`
					UPDATE batches
					SET 
						"completedJobs" = "completedJobs" + 1,
						"runningJobs" = GREATEST(0, "runningJobs" - 1),
						"progress" = (("completedJobs" + 1 + "failedJobs" + "cancelledJobs")::float / "totalJobs") * 100,
						"status" = CASE 
							WHEN ("completedJobs" + 1 + "failedJobs" + "cancelledJobs") >= "totalJobs" THEN 
								CASE WHEN "failedJobs" > 0 OR "cancelledJobs" > 0 THEN 'PARTIALLY_COMPLETED'::"BatchStatus" ELSE 'COMPLETED'::"BatchStatus" END
							ELSE status
						END
					WHERE id = ${jobRaw.batchId}::uuid
				`);
			}

			await prisma.$transaction(successTxOps);
			this.logger.info(`Job ${jobRaw.id} completed successfully`);
		} else {
			const finalExecutionStatus = statusOutcome === "CANCELLED" ? "CANCELLED" : "FAILED";
			let finalJobStatus = statusOutcome === "CANCELLED" ? "CANCELLED" : "FAILED";
			let nextAvailableAt: Date | null = null;
			let isDeadLetter = false;
			let retryDelayMs: number | undefined;
			let failureCategory = undefined;

			// Handle Retries if it's a real failure
			if (statusOutcome === "FAILED") {
				failureCategory = FailureClassifier.classify(errorMessage);
				if (jobRaw.attemptCount < jobRaw.maxAttempts) {
					// We can retry! Fetch the policy
					let policy = null;
					if (jobRaw.retryPolicyId) {
						policy = await prisma.retryPolicy.findUnique({ where: { id: jobRaw.retryPolicyId } });
					}
					
					// Default policy if none found
					if (!policy) {
						policy = {
							strategy: "FIXED_DELAY",
							delaySeconds: 10,
							backoffFactor: 2,
							maxDelaySeconds: 60
						};
					}

					retryDelayMs = RetryEngine.calculateNextRetryDelay(policy, jobRaw.attemptCount, true);
					nextAvailableAt = new Date(Date.now() + retryDelayMs);
					finalJobStatus = "RETRYING";
					this.logger.info(`Job ${jobRaw.id} failed (attempt ${jobRaw.attemptCount}/${jobRaw.maxAttempts}). Retrying in ${Math.round(retryDelayMs/1000)}s.`);
				} else {
					// Exhausted retries
					finalJobStatus = "DEAD_LETTERED"; // Transition directly to DLQ
					isDeadLetter = true;
					this.logger.error(`Job ${jobRaw.id} exhausted all ${jobRaw.maxAttempts} attempts. Moving to DEAD_LETTERED.`);
				}
			}

			const txOps: any[] = [
				prisma.jobExecution.update({
					where: { id: execution.id },
					data: { status: finalExecutionStatus, finishedAt: new Date(), error: errorMessage, metrics, retryDelayMs, failureCategory }
				}),
				prisma.job.update({
					where: { id: jobRaw.id },
					data: { 
						status: finalJobStatus as any,
						failedAt: statusOutcome === "FAILED" ? new Date() : null,
						availableAt: nextAvailableAt || jobRaw.availableAt
					}
				}),
				prisma.jobLog.create({
					data: { 
						jobId: jobRaw.id, 
						level: statusOutcome === "CANCELLED" ? "WARN" : "ERROR", 
						message: `Job ${jobRaw.id} aborted: ${errorMessage}`, 
						correlationId: jobRaw.correlationId,
						context: { worker: workerId, job: jobRaw.id, queue: jobRaw.queueId, actualDurationMs, status: finalJobStatus.toLowerCase(), stackTrace, metrics, nextAvailableAt, failureCategory } 
					}
				})
			];

			if (isDeadLetter) {
				txOps.push(prisma.deadLetterJob.upsert({
					where: { jobId: jobRaw.id },
					update: {
						queueId: jobRaw.queueId,
						projectId: jobRaw.projectId,
						workerId: workerId,
						reason: "Max retries exhausted",
						lastError: errorMessage,
						stackTrace: stackTrace,
						retryCount: jobRaw.attemptCount,
						finalAttemptAt: new Date(),
						failureCategory: failureCategory as any,
						failureData: { lastExecutionMetrics: metrics }
					},
					create: {
						jobId: jobRaw.id,
						queueId: jobRaw.queueId,
						projectId: jobRaw.projectId,
						workerId: workerId,
						reason: "Max retries exhausted",
						lastError: errorMessage,
						stackTrace: stackTrace,
						retryCount: jobRaw.attemptCount,
						finalAttemptAt: new Date(),
						originalPayload: jobRaw.payload as any,
						correlationId: jobRaw.correlationId,
						failureCategory: failureCategory as any,
						failureData: {
							lastExecutionMetrics: metrics
						}
					}
				}));
				txOps.push(prisma.jobRecovery.updateMany({
					where: { jobId: jobRaw.id, status: "PENDING" },
					data: { status: "FAILED" }
				}));
				txOps.push(prisma.systemEvent.create({
					data: {
						eventType: "DLQ_JOB_ADDED",
						workerId,
						jobId: jobRaw.id,
						queueId: jobRaw.queueId,
						correlationId: jobRaw.correlationId,
						metadata: { reason: "Max attempts reached", failureCategory }
					}
				}));
			}

			if (jobRaw.batchId) {
				if (finalJobStatus === "CANCELLED") {
					txOps.push(prisma.$executeRaw`
						UPDATE batches
						SET 
							"cancelledJobs" = "cancelledJobs" + 1,
							"runningJobs" = GREATEST(0, "runningJobs" - 1),
							"progress" = (("completedJobs" + "failedJobs" + "cancelledJobs" + 1)::float / "totalJobs") * 100,
							"status" = CASE 
								WHEN ("completedJobs" + "failedJobs" + "cancelledJobs" + 1) >= "totalJobs" THEN 
									CASE WHEN "completedJobs" = 0 THEN 'FAILED'::"BatchStatus" ELSE 'PARTIALLY_COMPLETED'::"BatchStatus" END
								ELSE status
							END
						WHERE id = ${jobRaw.batchId}::uuid
					`);
				} else if (finalJobStatus === "DEAD_LETTERED") {
					txOps.push(prisma.$executeRaw`
						UPDATE batches
						SET 
							"failedJobs" = "failedJobs" + 1,
							"runningJobs" = GREATEST(0, "runningJobs" - 1),
							"progress" = (("completedJobs" + "failedJobs" + "cancelledJobs" + 1)::float / "totalJobs") * 100,
							"status" = CASE 
								WHEN ("completedJobs" + "failedJobs" + "cancelledJobs" + 1) >= "totalJobs" THEN 
									CASE WHEN "completedJobs" = 0 THEN 'FAILED'::"BatchStatus" ELSE 'PARTIALLY_COMPLETED'::"BatchStatus" END
								ELSE status
							END
						WHERE id = ${jobRaw.batchId}::uuid
					`);
				} else {
					txOps.push(prisma.$executeRaw`
						UPDATE batches
						SET "runningJobs" = GREATEST(0, "runningJobs" - 1)
						WHERE id = ${jobRaw.batchId}::uuid
					`);
				}
			}

			await prisma.$transaction(txOps);

			if (statusOutcome === "CANCELLED") {
				await prisma.systemEvent.create({
					data: {
						eventType: "Job Cancelled",
						workerId,
						jobId: jobRaw.id,
						queueId: jobRaw.queueId,
						correlationId: jobRaw.correlationId,
						metadata: { reason: errorMessage }
					}
				});
			} else if (errorMessage.includes("Timed Out")) {
				await prisma.systemEvent.create({
					data: {
						eventType: "Job Timed Out",
						workerId,
						jobId: jobRaw.id,
						queueId: jobRaw.queueId,
						metadata: { actualDurationMs, limit: maxExecutionTimeS }
					}
				});
			}
		}
		
		return { success, durationMs: actualDurationMs };
	}
}