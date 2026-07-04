import { Router } from "express";
import { z } from "zod";

import * as jobController from "../controllers/job.controller";
import { authenticate, validate } from "../middleware";
import { uuidParam, paginationQuery } from "../validators/common.validator";
import { createJobValidator, batchCreateJobValidator, jobFilterQueryValidator, updateJobValidator } from "../validators/job.validator";

const router = Router();

router.use(authenticate);

// Queue-scoped operations
router.post(
	"/queue/:queueId",
	validate({
		params: z.object({ queueId: z.string().uuid() }),
		body: createJobValidator,
	}),
	jobController.createJob
);

router.post(
	"/queue/:queueId/batch",
	validate({
		params: z.object({ queueId: z.string().uuid() }),
		body: batchCreateJobValidator,
	}),
	jobController.createBatchJobs
);

router.get(
	"/queue/:queueId",
	validate({
		params: z.object({ queueId: z.string().uuid() }),
		query: paginationQuery.merge(jobFilterQueryValidator),
	}),
	jobController.getJobsByQueue
);

// Project-scoped lists
router.get(
	"/project/:projectId",
	validate({
		params: z.object({ projectId: z.string().uuid() }),
		query: paginationQuery.merge(jobFilterQueryValidator),
	}),
	jobController.getJobsByProject
);

// Individual job routes
router.get("/:id", validate({ params: uuidParam }), jobController.getJob);
router.put(
	"/:id",
	validate({
		params: uuidParam,
		body: updateJobValidator,
	}),
	jobController.updateJob
);
router.delete("/:id", validate({ params: uuidParam }), jobController.deleteJob);
router.post("/:id/retry", validate({ params: uuidParam }), jobController.retryJob);
router.post("/queue/:queueId/retry-all", validate({ params: z.object({ queueId: z.string().uuid() }) }), jobController.retryAllFailedJobs);
router.post("/:id/disable-retry", validate({ params: uuidParam }), jobController.disableRetry);
router.put("/:id/retry-policy", validate({ params: uuidParam, body: z.object({ retryPolicyId: z.string().uuid(), maxAttempts: z.number().int().min(1).optional() }) }), jobController.changeRetryPolicy);
router.post("/:id/cancel", validate({ params: uuidParam }), jobController.cancelJob);
router.get("/:id/executions", validate({ params: uuidParam }), jobController.getJobExecutions);
router.get(
	"/:id/logs",
	validate({
		params: uuidParam,
		query: paginationQuery,
	}),
	jobController.getJobLogs
);

export default router;
