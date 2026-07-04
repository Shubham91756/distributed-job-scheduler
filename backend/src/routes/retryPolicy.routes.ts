import { Router } from "express";

import * as retryPolicyController from "../controllers/retryPolicy.controller";
import { authenticate, validate } from "../middleware";
import { uuidParam } from "../validators/common.validator";
import {
	createRetryPolicyValidator,
	updateRetryPolicyValidator,
} from "../validators/retryPolicy.validator";

const router = Router();

router.use(authenticate);

router.post("/", validate({ body: createRetryPolicyValidator }), retryPolicyController.createRetryPolicy);
router.get("/", retryPolicyController.getRetryPolicies);
router.get("/:id", validate({ params: uuidParam }), retryPolicyController.getRetryPolicy);
router.put("/:id", validate({ params: uuidParam, body: updateRetryPolicyValidator }), retryPolicyController.updateRetryPolicy);
router.delete("/:id", validate({ params: uuidParam }), retryPolicyController.deleteRetryPolicy);

export default router;
