import winston from "winston";

const logFormat = winston.format.combine(
	winston.format.timestamp(),
	winston.format.json()
);

const winstonLogger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: logFormat,
	defaultMeta: { service: "worker" },
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.printf(({ timestamp, level, message, correlationId, service, ...meta }) => {
					return `[${timestamp}] ${level} [${service}]${correlationId ? ` [${correlationId}]` : ""}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
				})
			)
		})
	]
});

export class WorkerLogger {
	info(message: string, context?: any) {
		winstonLogger.info(message, context);
	}
	error(message: string, context?: any) {
		winstonLogger.error(message, context);
	}
	warn(message: string, context?: any) {
		winstonLogger.warn(message, context);
	}
}

interface WorkerRuntimeConfig {
	logger: WorkerLogger;
	queuePoller: any;
	executor: any;
	heartbeat: any;
	monitor: any;
}

export const createWorkerRuntime = (config: WorkerRuntimeConfig) => {
	let isRunning = false;

	return {
		start: async () => {
			if (isRunning) return;
			isRunning = true;
			
			config.logger.info("Starting Distributed Job Scheduler Worker...");
			
			await config.heartbeat.start();
			await config.monitor.start(config.heartbeat.workerId);
			
			// Start polling and wire up the metrics callback
			config.queuePoller.start(config.executor, config.heartbeat.workerId, (success: boolean, durationMs: number) => {
				config.heartbeat.recordJobOutcome(success, durationMs);
			});
			
			config.logger.info("Worker is running.");
			
			const handleShutdown = async () => {
				if (!isRunning) return;
				isRunning = false;
				
				config.logger.info("Received termination signal. Commencing graceful shutdown...");
				
				// 1. Mark as draining to prevent new external allocations (if routing exists)
				await config.heartbeat.setStatus("DRAINING");
				
				// 2. Stop polling for new jobs. This will wait for currently running jobs to complete
				config.logger.info("Stopping queue poller and waiting for running jobs to complete...");
				await config.queuePoller.stop();
				
				// 3. Mark as stopped internally
				await config.heartbeat.setStatus("STOPPED");
				
				// 4. Stop monitor
				config.logger.info("Stopping monitor service...");
				await config.monitor.stop();

				// 5. Stop heartbeat which marks worker as OFFLINE
				config.logger.info("Stopping heartbeat service...");
				await config.heartbeat.stop();
				
				config.logger.info("Graceful shutdown complete. Exiting process.");
				process.exit(0);
			};

			process.on('SIGINT', handleShutdown);
			process.on('SIGTERM', handleShutdown);
		}
	};
};

export * from './FailureClassifier';