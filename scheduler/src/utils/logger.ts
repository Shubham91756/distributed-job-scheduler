import winston from "winston";

const logFormat = winston.format.combine(
	winston.format.timestamp(),
	winston.format.json()
);

const winstonLogger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: logFormat,
	defaultMeta: { service: "scheduler" },
	transports: [
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
					return `[${timestamp}] ${level} [${service}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ""}`;
				})
			)
		})
	]
});

export class SchedulerLogger {
	info(message: string, meta?: any) {
		winstonLogger.info(message, meta);
	}

	error(message: string, error?: any) {
		winstonLogger.error(message, { error });
	}

	warn(message: string, meta?: any) {
		winstonLogger.warn(message, meta);
	}

	debug(message: string, meta?: any) {
		if (process.env.DEBUG === "true") {
			winstonLogger.debug(message, meta);
		}
	}
}
