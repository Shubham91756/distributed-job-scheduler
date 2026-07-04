import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { logger } from "../config/logger";

declare global {
	namespace Express {
		interface Request {
			correlationId?: string;
		}
	}
}

export const correlationIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const correlationId = (req.headers["x-correlation-id"] as string) || uuidv4();
	req.correlationId = correlationId;
	res.setHeader("x-correlation-id", correlationId);

	// Create a child logger for the request
	(req as any).logger = logger.child({ correlationId });

	next();
};
