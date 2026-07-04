import type { RequestHandler } from "express";

import { logger } from "../config/logger";

export const requestLogger: RequestHandler = (req, _res, next) => {
	const log = (req as any).logger || logger;
	log.info(`${req.method} ${req.originalUrl}`);
	next();
};
