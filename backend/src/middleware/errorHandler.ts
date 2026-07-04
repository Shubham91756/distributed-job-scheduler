import type { ErrorRequestHandler } from "express";

import { logger } from "../config/logger";
import { AppError } from "../utils/appError";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
	// Handle AppError (our custom errors)
	if (err instanceof AppError) {
		res.status(err.statusCode).json({
			status: "error",
			message: err.message,
		});
		return;
	}

	// Handle validation errors (from validate middleware)
	if (err.statusCode === 400 && err.errors) {
		res.status(400).json({
			status: "error",
			message: err.message || "Validation failed",
			errors: err.errors,
		});
		return;
	}

	// Handle Prisma errors
	if (err.code === "P2002") {
		const target = err.meta?.target;
		res.status(409).json({
			status: "error",
			message: `A record with this ${Array.isArray(target) ? target.join(", ") : "value"} already exists.`,
		});
		return;
	}

	if (err.code === "P2025") {
		res.status(404).json({
			status: "error",
			message: "Record not found.",
		});
		return;
	}

	// Log unexpected errors
	logger.error("Unhandled error:", err);

	res.status(500).json({
		status: "error",
		message: "Internal Server Error",
	});
};
