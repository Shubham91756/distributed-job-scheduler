import { prisma } from "../db/prisma";
import { WorkerLogger } from "../utils";
import { config } from "../config/env";

export class MonitorService {
	private logger = new WorkerLogger();
	private interval: NodeJS.Timeout | null = null;
	private workerId: string = "";

	async start(workerId: string) {
		this.workerId = workerId;
		this.logger.info("Starting cluster monitor (Lease & Stale Worker)...");

		this.interval = setInterval(() => {
			this.runChecks();
		}, config.RECOVERY_INTERVAL_MS);
	}

	async stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
			this.logger.info("Stopped cluster monitor.");
		}
	}

	private async runChecks() {
		try {
			await this.detectStaleWorkers();
			await this.recoverExpiredLeases();
		} catch (error) {
			this.logger.error("Error running cluster monitor checks", error);
		}
	}

	private async detectStaleWorkers() {
		const thresholdDate = new Date(Date.now() - config.HEARTBEAT_TIMEOUT_MS);
		
		const staleWorkers = await prisma.worker.findMany({
			where: {
				status: { notIn: ["OFFLINE", "DEAD"] },
				lastHeartbeatAt: { lt: thresholdDate }
			}
		});

		for (const worker of staleWorkers) {
			try {
				await prisma.$transaction(async (tx) => {
					// Double check it's still stale to prevent race conditions
					const current = await tx.worker.findUnique({ where: { id: worker.id } });
					if (!current || (current.lastHeartbeatAt && current.lastHeartbeatAt >= thresholdDate) || ["OFFLINE", "DEAD"].includes(current.status)) {
						return;
					}

					await tx.worker.update({
						where: { id: worker.id },
						data: {
							status: "OFFLINE",
							offlineReason: "Heartbeat timeout exceeded.",
							offlineAt: new Date()
						}
					});

					await tx.systemEvent.create({
						data: {
							eventType: "Worker Offline",
							workerId: worker.id,
							metadata: { reason: "Heartbeat timeout exceeded", missedSince: worker.lastHeartbeatAt }
						}
					});
				});
				this.logger.warn(`Marked stale worker ${worker.name} (${worker.id}) as OFFLINE`);
			} catch (e) {
				this.logger.error(`Failed to mark worker ${worker.id} offline`, e);
			}
		}
	}

	private async recoverExpiredLeases() {
		const now = new Date();
		
		// Find jobs that are RUNNING but their lease has expired
		const expiredJobs = await prisma.job.findMany({
			where: {
				status: "RUNNING",
				leaseExpiresAt: { lt: now },
				deletedAt: null
			}
		});

		for (const job of expiredJobs) {
			try {
				await prisma.$transaction(async (tx) => {
					const current = await tx.job.findUnique({ where: { id: job.id } });
					if (!current || current.status !== "RUNNING" || (current.leaseExpiresAt && current.leaseExpiresAt >= now)) {
						return;
					}

					await tx.job.update({
						where: { id: job.id },
						data: {
							status: "QUEUED",
							workerId: null,
							claimedAt: null,
							leaseExpiresAt: null
						}
					});

					await tx.systemEvent.create({
						data: {
							eventType: "Job Recovered",
							jobId: job.id,
							workerId: job.workerId,
							queueId: job.queueId,
							metadata: { reason: "Lease expired", expiredAt: job.leaseExpiresAt }
						}
					});

					await tx.jobLog.create({
						data: {
							jobId: job.id,
							level: "WARN",
							message: "Job recovered due to lease expiration",
							context: { recoveredBy: this.workerId, previousWorkerId: job.workerId }
						}
					});
				});
				this.logger.info(`Recovered abandoned job ${job.id}`);
			} catch (e) {
				this.logger.error(`Failed to recover job ${job.id}`, e);
			}
		}
	}
}
