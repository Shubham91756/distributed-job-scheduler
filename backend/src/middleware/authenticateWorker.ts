import type { RequestHandler } from "express";
import crypto from "crypto";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { SystemEventServiceLogger } from "../services/systemEvent.service";

export const authenticateWorker: RequestHandler = async (req, _res, next) => {
	try {
		const apiKey = req.headers["x-api-key"] as string;

		if (!apiKey) {
			throw new AppError(401, "Worker authentication required. Provide x-api-key header.");
		}

		// Hash the provided API key to compare with the database
		const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");

		const workerKey = await prisma.workerApiKey.findFirst({
			where: { keyHash, isActive: true, deletedAt: null }
		});

		if (!workerKey) {
			await SystemEventServiceLogger.log({
				eventType: "Unauthorized Worker Access",
				message: `Attempted access with invalid API key`,
				severity: "WARN",
				service: "API",
				correlationId: (req as any).correlationId,
			});
			throw new AppError(401, "Invalid or inactive API key.");
		}

		// Attach to request
		req.user = { id: workerKey.id, email: "worker@system", role: "WORKER" } as any;

		next();
	} catch (error) {
		next(error);
	}
};
