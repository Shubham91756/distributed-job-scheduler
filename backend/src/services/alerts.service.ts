import { prisma } from "../config/prisma";
import { SystemEventServiceLogger } from "./systemEvent.service";
import { SystemEventSeverity } from "@prisma/client";
import { logger } from "../config/logger";

export class AlertsService {
	static async evaluateHealth() {
		try {
			// 1. Worker Offline Alert
			const offlineWorkersCount = await prisma.worker.count({
				where: { status: "OFFLINE", deletedAt: null }
			});

			if (offlineWorkersCount > 0) {
				await this.createOrUpdateAlert(
					"offline-workers",
					"Offline Workers Detected",
					`${offlineWorkersCount} worker(s) are offline.`,
					"WARN"
				);
			} else {
				await this.resolveAlert("offline-workers");
			}

			// 2. High DLQ Count
			const dlqCount = await prisma.deadLetterJob.count();
			if (dlqCount > 100) {
				await this.createOrUpdateAlert(
					"high-dlq",
					"High DLQ Volume",
					`Dead Letter Queue contains ${dlqCount} jobs.`,
					"ERROR"
				);
			} else {
				await this.resolveAlert("high-dlq");
			}

			// 3. Queue Backlog Alert
			const backlog = await prisma.job.count({
				where: { status: "QUEUED", deletedAt: null }
			});
			if (backlog > 1000) {
				await this.createOrUpdateAlert(
					"queue-backlog",
					"Queue Backlog",
					`Queue backlog is high: ${backlog} queued jobs.`,
					"WARN"
				);
			} else {
				await this.resolveAlert("queue-backlog");
			}

		} catch (error) {
			logger.error("Alert evaluation failed", { error });
		}
	}

	private static async createOrUpdateAlert(idPrefix: string, title: string, description: string, severity: SystemEventSeverity) {
		const existing = await prisma.alert.findFirst({
			where: { title: title, status: "ACTIVE" }
		});

		if (!existing) {
			const alert = await prisma.alert.create({
				data: { title, description, severity, status: "ACTIVE" }
			});
			await SystemEventServiceLogger.log({
				eventType: "Alert Triggered",
				message: description,
				severity,
				service: "API"
			});
		} else if (existing.description !== description) {
			await prisma.alert.update({
				where: { id: existing.id },
				data: { description, severity }
			});
		}
	}

	private static async resolveAlert(idPrefix: string) {
		// resolve all active alerts with matching title prefix (simplified for this exercise)
		const activeAlerts = await prisma.alert.findMany({
			where: { 
				status: "ACTIVE", 
				OR: [
					{ title: "Offline Workers Detected" },
					{ title: "High DLQ Volume" },
					{ title: "Queue Backlog" }
				].filter(c => c.title.toLowerCase().includes(idPrefix.split('-')[1] || idPrefix))
			}
		});

		for (const alert of activeAlerts) {
			await prisma.alert.update({
				where: { id: alert.id },
				data: { status: "RESOLVED", resolvedAt: new Date() }
			});
			
			await SystemEventServiceLogger.log({
				eventType: "Alert Resolved",
				message: `Alert resolved: ${alert.title}`,
				severity: "INFO",
				service: "API"
			});
		}
	}
}
