import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { 
	createBatch,
	getBatches,
	getBatch,
	getBatchJobs,
	cancelBatch,
	retryBatch,
	deleteBatch
} from "../controllers/batch.controller";

const router = Router();

router.use(authenticate);

router.post("/", createBatch);
router.get("/", getBatches);
router.get("/:id", getBatch);
router.get("/:id/jobs", getBatchJobs);
router.post("/:id/cancel", cancelBatch);
router.post("/:id/retry", retryBatch);
router.delete("/:id", deleteBatch);

export default router;
