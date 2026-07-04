import "dotenv/config";
import { JobGenerator } from "./generator";
import { SchedulerLogger } from "./utils/logger";

const logger = new SchedulerLogger();
const generator = new JobGenerator();

async function bootstrap() {
	logger.info("Starting Distributed Job Scheduler Daemon...");

	await generator.start();

	// Graceful shutdown
	const shutdown = async () => {
		logger.info("Received shutdown signal. Stopping services...");
		await generator.stop();
		process.exit(0);
	};

	process.on("SIGINT", shutdown);
	process.on("SIGTERM", shutdown);
}

bootstrap().catch((err) => {
	logger.error("Failed to start scheduler daemon", err);
	process.exit(1);
});
