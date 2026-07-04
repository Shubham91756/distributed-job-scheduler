import { Router } from "express";
import { z } from "zod";

import * as statsController from "../controllers/stats.controller";
import * as metricsController from "../controllers/metrics.controller";
import { authenticate, validate } from "../middleware";

const router = Router();

router.use(authenticate);

router.get("/dashboard", statsController.getDashboardStats);

router.get(
	"/throughput",
	validate({
		query: z.object({ hours: z.coerce.number().int().positive().max(168).optional() }),
	}),
	statsController.getThroughput
);

router.get("/metrics/time-series", metricsController.getTimeSeriesMetrics);

export default router;
