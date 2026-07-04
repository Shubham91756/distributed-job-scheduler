import { prisma } from "../db/prisma";
import { WorkerLogger } from "../utils";
import os from "os";

export class HeartbeatService {
	public workerId: string = "";
	private workerName: string;
	private interval: NodeJS.Timeout | null = null;
	private logger = new WorkerLogger();
	
	// Metrics state
	private metrics = {
		jobsCompleted: 0,
		jobsFailed: 0,
		totalDurationMs: 0
	};
	
	private currentStatus: any = "STARTING";

	constructor() {
		// Use a consistent name to avoid duplicates on restart
		this.workerName = `Worker-${os.hostname()}`;
	}
	
	public recordJobOutcome(success: boolean, durationMs: number) {
		if (success) {
			this.metrics.jobsCompleted++;
		} else {
			this.metrics.jobsFailed++;
		}
		this.metrics.totalDurationMs += durationMs;
	}
	
	public async setStatus(status: "STARTING" | "ONLINE" | "DRAINING" | "STOPPED" | "OFFLINE" | "DEAD") {
		this.currentStatus = status;
		this.logger.info(`Worker status changed to ${status}`);
		
		if (this.workerId) {
			await prisma.worker.update({
				where: { id: this.workerId },
				data: { status }
			});

			if (status === "ONLINE" || status === "OFFLINE") {
				await prisma.systemEvent.create({
					data: {
						eventType: status === "ONLINE" ? "Worker Started" : "Worker Offline",
						message: `Worker ${this.workerName} changed status to ${status}`,
						severity: "INFO",
						service: "WORKER",
						workerId: this.workerId,
						metadata: { status }
					}
				});
			}
		}
	}

	async start() {
		this.logger.info(`Registering worker ${this.workerName}...`);
		
		const capacity = parseInt(process.env.WORKER_CAPACITY || "5");
		
		// Find existing worker by name or create a new one
		let worker = await prisma.worker.findFirst({
			where: { name: this.workerName }
		});

		if (worker) {
			worker = await prisma.worker.update({
				where: { id: worker.id },
				data: {
					status: "STARTING",
					capacity,
					lastHeartbeatAt: new Date(),
					deletedAt: null // Restore if it was soft-deleted
				}
			});
		} else {
			worker = await prisma.worker.create({
				data: {
					name: this.workerName,
					capacity,
					status: "STARTING",
					lastHeartbeatAt: new Date(),
				},
			});
		}
		
		this.workerId = worker.id;
		
		await this.setStatus("ONLINE");

		this.interval = setInterval(async () => {
			try {
				const totalJobs = this.metrics.jobsCompleted + this.metrics.jobsFailed;
				const successRate = totalJobs > 0 ? ((this.metrics.jobsCompleted / totalJobs) * 100).toFixed(1) + "%" : "0%";
				const averageRuntime = totalJobs > 0 ? Math.round(this.metrics.totalDurationMs / totalJobs) : 0;
				
				await prisma.$transaction([
					// Record heartbeat with metrics
					prisma.workerHeartbeat.create({
						data: {
							workerId: this.workerId,
							metadata: { 
								load: os.loadavg(), 
								pid: process.pid,
								uptime: process.uptime(),
								metrics: {
									jobsCompleted: this.metrics.jobsCompleted,
									jobsFailed: this.metrics.jobsFailed,
									successRate,
									averageRuntime
								}
							},
						},
					}),
					// Update worker heartbeat timestamp
					prisma.worker.update({
						where: { id: this.workerId },
						data: { lastHeartbeatAt: new Date(), status: this.currentStatus },
					}),
					// Renew leases for currently running jobs claimed by this worker
					prisma.$executeRaw`
						UPDATE jobs
						SET "leaseExpiresAt" = NOW() + INTERVAL '5 minutes'
						WHERE "workerId" = ${this.workerId}::uuid AND status = 'RUNNING'
					`
				]);
			} catch (error) {
				this.logger.error("Failed to send heartbeat", error);
			}
		}, 10000); // 10 seconds heartbeat
	}

	async stop() {
		if (this.interval) {
			clearInterval(this.interval);
			this.interval = null;
		}
		
		if (!this.workerId) return;

		try {
			await this.setStatus("OFFLINE");
			this.logger.info("Worker marked as OFFLINE.");
		} catch (error) {
			this.logger.error("Failed to update worker status to OFFLINE", error);
		}
	}
}