import { prisma } from "../db/prisma";
import { WorkerLogger } from "../utils";
import { JobExecutor } from "../executors";

export class QueuePoller {
	private logger = new WorkerLogger();
	private isRunning = false;
	private currentConcurrency = 0;
	private maxConcurrency = parseInt(process.env.WORKER_CAPACITY || "5");
	
	// Adaptive polling logic with jitter for high concurrency
	private basePollInterval = 1000; // 1s
	private maxPollInterval = 10000; // 10s
	private currentPollInterval = this.basePollInterval;

	async start(executor: JobExecutor, workerId: string, onJobComplete: (success: boolean, durationMs: number) => void) {
		this.isRunning = true;
		this.logger.info(`Starting queue poller (Capacity: ${this.maxConcurrency})...`);
		
		// Run poll loop without awaiting to not block thread
		this.pollLoop(executor, workerId, onJobComplete);
	}

	async stop() {
		this.isRunning = false;
		this.logger.info("Stopping queue poller...");
		
		// Wait for running jobs to finish (drain)
		while (this.currentConcurrency > 0) {
			await new Promise(resolve => setTimeout(resolve, 500));
		}
	}

	private async pollLoop(executor: JobExecutor, workerId: string, onJobComplete: (success: boolean, durationMs: number) => void) {
		while (this.isRunning) {
			if (this.currentConcurrency >= this.maxConcurrency) {
				await new Promise(resolve => setTimeout(resolve, 1000));
				continue;
			}

			let jobFound = false;
			try {
				const job = await this.claimNextJob(workerId);
				
				if (job) {
					jobFound = true;
					this.currentConcurrency++;
					
					// Reset poll interval since we found work
					this.currentPollInterval = this.basePollInterval;
					
					// Execute in background
					executor.execute(job, workerId).then(({ success, durationMs }) => {
						onJobComplete(success, durationMs);
					}).catch(() => {
						// Fallback in case execute throws synchronously
						onJobComplete(false, 0);
					}).finally(() => {
						this.currentConcurrency--;
					});
					
					// Immediately try to fetch another job (greedy)
					continue;
				}
			} catch (error) {
				this.logger.error("Error claiming job", error);
			}

			if (!jobFound) {
				// Adaptive backoff
				this.currentPollInterval = Math.min(this.maxPollInterval, this.currentPollInterval * 2);
				if (this.currentPollInterval >= this.maxPollInterval) {
					// We reached max delay, just stay there
					this.currentPollInterval = this.maxPollInterval;
				}
			}

			// If no job was found or error occurred, wait before polling again
			const jitter = Math.floor(Math.random() * 500); // 0-500ms jitter to prevent thundering herd
			await new Promise(resolve => setTimeout(resolve, this.currentPollInterval + jitter));
		}
	}

	private async claimNextJob(workerId: string) {
		// Atomic claim using FOR UPDATE SKIP LOCKED
		const jobs = await prisma.$queryRaw<any[]>`
			UPDATE jobs 
			SET status = 'CLAIMED', 
			    "workerId" = ${workerId}::uuid, 
			    "claimedAt" = NOW(), 
			    "leaseExpiresAt" = NOW() + INTERVAL '5 minutes',
			    "updatedAt" = NOW() 
			WHERE id = (
				SELECT j.id 
				FROM jobs j
				JOIN queues q ON j."queueId" = q.id
				WHERE j.status IN ('QUEUED', 'RETRYING') 
				  AND j."deletedAt" IS NULL
				  AND (j."availableAt" IS NULL OR j."availableAt" <= NOW())
				  AND q.status = 'ACTIVE'
				ORDER BY 
					CASE j.priority 
						WHEN 'CRITICAL' THEN 0 
						WHEN 'HIGH' THEN 1 
						WHEN 'MEDIUM' THEN 2 
						WHEN 'LOW' THEN 3 
					END ASC, 
					j."createdAt" ASC 
				LIMIT 1 
				FOR UPDATE SKIP LOCKED
			) 
			RETURNING *;
		`;

		return jobs.length > 0 ? jobs[0] : null;
	}
}