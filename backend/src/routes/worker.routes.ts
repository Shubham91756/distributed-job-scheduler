import { Router } from "express";

import * as workerController from "../controllers/worker.controller";
import { authenticate, authenticateWorker, validate } from "../middleware";
import { uuidParam } from "../validators/common.validator";
import { registerWorkerValidator, heartbeatValidator } from "../validators/worker.validator";
import { z } from "zod";

const router = Router();

// Worker API endpoints (Called by the Worker Engine)
router.post("/register", authenticateWorker, validate({ body: registerWorkerValidator }), workerController.registerWorker);
router.post(
	"/:id/heartbeat",
	authenticateWorker,
	validate({ params: uuidParam, body: heartbeatValidator }),
	workerController.recordHeartbeat
);

// Dashboard API endpoints (Called by the UI)
router.use(authenticate);
router.get(
	"/",
	validate({
		query: z.object({ status: z.enum(["ONLINE", "OFFLINE", "DEAD"]).optional() }),
	}),
	workerController.getWorkers
);

router.get("/:id", validate({ params: uuidParam }), workerController.getWorker);

export default router;
