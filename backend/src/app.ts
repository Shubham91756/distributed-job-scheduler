import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";

import { errorHandler, notFound, requestLogger, correlationIdMiddleware, globalLimiter, apiLimiter } from "./middleware";
import apiRouter from "./routes";
import { AlertsService } from "./services/alerts.service";

export const createApp = (): express.Express => {
	const app = express();

	// Security Headers
	app.use(helmet());

	// CORS
	app.use(cors({
		origin: ["http://localhost:5173", "http://localhost:3000"],
		credentials: true,
	}));

	// Global Rate Limiting
	app.use(globalLimiter);

	// Compression
	app.use(compression());

	// Body parsing with strict limits to prevent large payload attacks
	app.use(express.json({ limit: "1mb" }));
	app.use(express.urlencoded({ extended: true, limit: "1mb" }));

	// Request logging and correlation
	app.use(correlationIdMiddleware);
	app.use(requestLogger);

	// API routes
	app.use("/api", apiLimiter, apiRouter);

	// Error handling
	app.use(notFound);
	app.use(errorHandler);

	// Start background alert evaluation
	setInterval(() => {
		AlertsService.evaluateHealth();
	}, 60000); // every 1 min

	return app;
};

export const app = createApp();
