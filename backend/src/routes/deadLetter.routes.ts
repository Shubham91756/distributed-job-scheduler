import { Router } from "express";
import { z } from "zod";

import * as deadLetterController from "../controllers/deadLetter.controller";
import { authenticate, validate } from "../middleware";
import { uuidParam, paginationQuery } from "../validators/common.validator";

const router = Router();

router.use(authenticate);

router.get("/export/csv", deadLetterController.exportCSV);
router.get("/export/json", deadLetterController.exportJSON);

router.get(
	"/",
	validate({
		query: z.object({
			page: z.string().optional(),
			limit: z.string().optional(),
			queueId: z.string().uuid().optional(),
			workerId: z.string().uuid().optional(),
			search: z.string().optional(),
		}),
	}),
	deadLetterController.getDeadLetterJobs
);

router.get(
    "/:id", 
    validate({ params: uuidParam }), 
    deadLetterController.getDeadLetterJob
);

router.post(
    "/:id/retry", 
    validate({ params: uuidParam }), 
    deadLetterController.retryDeadLetterJob
);

router.post(
    "/retry-all", 
    validate({ body: z.object({ queueId: z.string().uuid().optional() }) }), 
    deadLetterController.retryAllDeadLetterJobs
);

router.delete(
	"/purge",
	validate({
		query: z.object({ queueId: z.string().uuid().optional() }),
	}),
	deadLetterController.purgeDeadLetterQueue
);

router.delete(
    "/:id",
    validate({ params: uuidParam }),
    deadLetterController.deleteDeadLetterJob
);

export default router;
