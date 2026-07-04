import { prisma } from "../config/prisma";
import { SystemEventSeverity, SystemEventService } from "@prisma/client";
import { logger } from "../config/logger";

interface CreateSystemEventOptions {
	eventType: string;
	message?: string;
	severity?: SystemEventSeverity;
	service?: SystemEventService;
	workerId?: string;
	jobId?: string;
	queueId?: string;
	correlationId?: string;
	metadata?: any;
}

export class SystemEventServiceLogger {
	static async log(options: CreateSystemEventOptions) {
		try {
			await prisma.systemEvent.create({
				data: {
					eventType: options.eventType,
					message: options.message,
					severity: options.severity || "INFO",
					service: options.service || "API",
					workerId: options.workerId,
					jobId: options.jobId,
					queueId: options.queueId,
					correlationId: options.correlationId,
					metadata: options.metadata || {},
				}
			});
		} catch (error) {
			logger.error("Failed to log system event", { error });
		}
	}
}
