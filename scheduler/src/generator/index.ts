import { prisma } from "../db/prisma";
import { SchedulerLogger } from "../utils/logger";
const cronParser = require("cron-parser");

export class JobGenerator {
	private logger = new SchedulerLogger();
	private isRunning = false;
	private pollIntervalMs = parseInt(process.env.SCHEDULER_POLL_INTERVAL_MS || "10000");

	async start() {
		this.isRunning = true;
		this.logger.info("Starting Job Generator Daemon...");
		this.pollLoop();
	}

	async stop() {
		this.isRunning = false;
		this.logger.info("Stopping Job Generator Daemon...");
	}

	private async pollLoop() {
		while (this.isRunning) {
			try {
				await this.generateJobs();
			} catch (error) {
				this.logger.error("Error generating jobs", error);
			}
			await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
		}
	}

	private async generateJobs() {
		// Atomic select-for-update to prevent multiple schedulers from processing the same schedules
		const dueSchedules = await prisma.$queryRaw<any[]>`
			SELECT * FROM "schedule_definitions"
			WHERE enabled = true 
			  AND next_run_at <= NOW()
			  AND deleted_at IS NULL
			ORDER BY next_run_at ASC
			LIMIT 50
			FOR UPDATE SKIP LOCKED
		`;

		if (dueSchedules.length === 0) return;

		this.logger.info(`Found ${dueSchedules.length} due schedules to process.`);

		for (const schedule of dueSchedules) {
			await this.processSchedule(schedule);
		}
	}

	private async processSchedule(schedule: any) {
		try {
			// Generate the job based on the template
			const jobData = typeof schedule.job_template === "string" 
				? JSON.parse(schedule.job_template) 
				: schedule.job_template;

			// Handle endAt logic
			if (schedule.end_at && new Date() > new Date(schedule.end_at)) {
				this.logger.info(`Schedule ${schedule.id} reached endAt, disabling.`);
				await prisma.scheduleDefinition.update({
					where: { id: schedule.id },
					data: { enabled: false, nextRunAt: null }
				});
				return;
			}

			// Calculate next run if it's recurring or cron
			let nextRunAt: Date | null = null;
			let isCompleted = false;

			if (schedule.schedule_type === "CRON" || schedule.schedule_type === "RECURRING") {
				if (!schedule.cron_expression) throw new Error("CRON schedule missing cron_expression");
				const interval = cronParser.parseExpression(schedule.cron_expression, {
					tz: schedule.timezone || "UTC",
					startDate: new Date(), // Next run is from now
					endDate: schedule.end_at ? new Date(schedule.end_at) : undefined,
				});
				try {
					if (interval.hasNext()) {
						nextRunAt = interval.next().toDate();
					} else {
						isCompleted = true;
					}
				} catch (e) {
					isCompleted = true;
				}
			} else {
				// Immediate, delayed, or one-off scheduled jobs only run once
				isCompleted = true;
			}

			// Create the Job and Update the Schedule in a Transaction
			await prisma.$transaction([
				prisma.job.create({
					data: {
						name: jobData.name || schedule.name,
						queueId: schedule.queue_id,
						projectId: schedule.project_id,
						status: "QUEUED",
						priority: jobData.priority || "MEDIUM",
						payload: jobData.payload || {},
						maxAttempts: jobData.maxAttempts || 3,
						availableAt: new Date(),
						description: "Generated from schedule: " + schedule.name,
					} as any
				}),
				prisma.scheduleDefinition.update({
					where: { id: schedule.id },
					data: {
						lastRunAt: new Date(),
						nextRunAt: isCompleted ? null : nextRunAt,
						enabled: !isCompleted,
					}
				})
			]);

			this.logger.info(`Generated job for schedule ${schedule.id} (${schedule.name})`);

		} catch (err: any) {
			this.logger.error(`Failed to process schedule ${schedule.id}`, err);
			// Disable schedule if template is fundamentally broken
			if (err instanceof SyntaxError || err.message.includes("missing cron")) {
				await prisma.scheduleDefinition.update({
					where: { id: schedule.id },
					data: { enabled: false }
				});
				this.logger.warn(`Disabled schedule ${schedule.id} due to configuration error.`);
			}
		}
	}
}
