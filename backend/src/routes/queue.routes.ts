import { Router } from "express";

import * as queueController from "../controllers/queue.controller";
import { authenticate, validate } from "../middleware";
import { uuidParam, paginationQuery } from "../validators/common.validator";
import { createQueueValidator, updateQueueValidator } from "../validators/queue.validator";
import { z } from "zod";

const router = Router();

router.use(authenticate);

// Project-scoped routes
router.get(
	"/project/:projectId",
	validate({
		params: z.object({ projectId: z.string().uuid() }),
		query: paginationQuery,
	}),
	queueController.getQueues
);

router.post(
	"/project/:projectId",
	validate({
		params: z.object({ projectId: z.string().uuid() }),
		body: createQueueValidator,
	}),
	queueController.createQueue
);

// Individual queue routes
router.get("/:id", validate({ params: uuidParam }), queueController.getQueue);
router.put("/:id", validate({ params: uuidParam, body: updateQueueValidator }), queueController.updateQueue);

router.post("/:id/pause", validate({ params: uuidParam }), queueController.pauseQueue);
router.post("/:id/resume", validate({ params: uuidParam }), queueController.resumeQueue);
router.post("/:id/archive", validate({ params: uuidParam }), queueController.archiveQueue);
router.get("/:id/stats", validate({ params: uuidParam }), queueController.getQueueStats);
router.delete("/:id", validate({ params: uuidParam }), queueController.deleteQueue);

export default router;
