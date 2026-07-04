import { prisma } from "../db/prisma";
import { WorkerLogger } from "../utils";
const cronParser = require("cron-parser");

export class RetryPlanner {
	private logger = new WorkerLogger();
	private isRunning = false;
	private pollIntervalMs = parseInt(process.env.RETRY_POLL_INTERVAL_MS || "15000"); // 15 seconds default

	async start() {
		this.isRunning = true;
		this.logger.info("Starting Retry and DeadLetter Planner...");
		
		this.pollLoop();
	}

	async stop() {
		this.isRunning = false;
		this.logger.info("Stopping Retry and DeadLetter Planner...");
	}

	private async pollLoop() {
		while (this.isRunning) {
			try {
				// We no longer process retries via polling. JobExecutor evaluates retries synchronously on failure.
				await this.processRetries();
			} catch (error) {
				this.logger.error("Error in retry/scheduled planner", error);
			}

			await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
		}
	}

	private async processRetries() {
		// Find jobs that have failed but have remaining attempts, and calculate next available_at
		const failedJobs = await prisma.job.findMany({
			where: {
				status: "FAILED",
				deletedAt: null,
			},
			include: { retryPolicy: true }
		});

		for (const job of failedJobs) {
			if (job.attemptCount >= job.maxAttempts) {
				// Move to Dead Letter
				await prisma.$transaction([
					prisma.deadLetterJob.upsert({
						where: { jobId: job.id },
						update: {
							queueId: job.queueId,
							projectId: job.projectId,
							workerId: "retry-engine",
							reason: "Max attempts exceeded",
							lastError: "Retries exhausted during polling",
							stackTrace: "",
							retryCount: job.attemptCount,
							finalAttemptAt: new Date(),
							failureData: { lastAttempt: job.attemptCount }
						},
						create: {
							jobId: job.id,
							queueId: job.queueId,
							projectId: job.projectId,
							workerId: "retry-engine",
							reason: "Max attempts exceeded",
							lastError: "Retries exhausted during polling",
							stackTrace: "",
							retryCount: job.attemptCount,
							finalAttemptAt: new Date(),
							originalPayload: job.payload as any,
							correlationId: (job as any).correlationId,
							failureCategory: "UNKNOWN",
							failureData: { lastAttempt: job.attemptCount }
						}
					}),
					prisma.job.update({
						where: { id: job.id },
						data: { status: "DEAD_LETTERED", deadLetteredAt: new Date() }
					}),
					prisma.jobLog.create({
						data: { jobId: job.id, level: "ERROR", message: "Moved to Dead Letter Queue - Max attempts exceeded", correlationId: (job as any).correlationId }
					}),
					prisma.jobRecovery.updateMany({
						where: { jobId: job.id, status: "PENDING" },
						data: { status: "FAILED" }
					})
				]);
				this.logger.info(`Job ${job.id} moved to DLQ.`);
				continue;
			}

			// Schedule next retry
			let delaySecs = 10; // default
			if (job.retryPolicy) {
				const attempts = job.attemptCount;
				const baseDelay = job.retryPolicy.delaySeconds;
				
				if (job.retryPolicy.strategy === "FIXED_DELAY") {
					delaySecs = baseDelay;
				} else if (job.retryPolicy.strategy === "LINEAR_BACKOFF") {
					delaySecs = baseDelay * attempts;
				} else if (job.retryPolicy.strategy === "EXPONENTIAL_BACKOFF") {
					delaySecs = baseDelay * Math.pow(Number(job.retryPolicy.backoffFactor), attempts - 1);
				}

				if (job.retryPolicy.maxDelaySeconds && delaySecs > job.retryPolicy.maxDelaySeconds) {
					delaySecs = job.retryPolicy.maxDelaySeconds;
				}
			}

			const nextAvailableAt = new Date(Date.now() + delaySecs * 1000);

			await prisma.$transaction([
				prisma.job.update({
					where: { id: job.id },
					data: { status: "QUEUED", availableAt: nextAvailableAt }
				}),
				prisma.jobLog.create({
					data: { jobId: job.id, level: "WARN", message: `Scheduled retry in ${delaySecs} seconds` }
				})
			]);
			this.logger.info(`Job ${job.id} scheduled for retry at ${nextAvailableAt.toISOString()}`);
		}
	}
}

export class RetryEngine {
	/**
	 * Calculates the next retry delay in milliseconds based on the policy and attempt count.
	 * @param policy The retry policy
	 * @param attemptCount The current attempt count (1-based)
	 * @param useJitter Whether to apply full jitter to prevent thundering herds
	 * @returns The delay in milliseconds
	 */
	static calculateNextRetryDelay(policy: any, attemptCount: number, useJitter: boolean = true): number {
		let delaySeconds = policy.delaySeconds;
		const backoffFactor = Number(policy.backoffFactor || 2);

		switch (policy.strategy) {
			case "FIXED_DELAY":
				delaySeconds = policy.delaySeconds;
				break;
			case "LINEAR_BACKOFF":
				delaySeconds = policy.delaySeconds * attemptCount;
				break;
			case "EXPONENTIAL_BACKOFF":
				delaySeconds = policy.delaySeconds * Math.pow(backoffFactor, attemptCount - 1);
				break;
		}

		if (policy.maxDelaySeconds && delaySeconds > policy.maxDelaySeconds) {
			delaySeconds = policy.maxDelaySeconds;
		}

		let delayMs = delaySeconds * 1000;

		if (useJitter) {
			delayMs = Math.floor(delayMs * 0.8 + Math.random() * (delayMs * 0.2));
		}

		return delayMs;
	}
}