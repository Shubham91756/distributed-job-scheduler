import { Router } from "express";
import { healthCheck, liveCheck, readyCheck } from "../controllers/health.controller";

const router = Router();

router.get("/live", liveCheck);
router.get("/ready", readyCheck);
router.get("/", healthCheck);

export default router;
