import { app } from "./app";
import { env } from "./config";
import { logger } from "./config/logger";

const server = app.listen(env.PORT, () => {
	logger.info(`Backend server listening on port ${env.PORT}`);
});

const shutdown = (): void => {
	server.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
