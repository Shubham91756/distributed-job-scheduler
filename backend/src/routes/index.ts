import { Router } from "express";

import authRoutes from "./auth.routes";
import organizationRoutes from "./organization.routes";
import projectRoutes from "./project.routes";
import queueRoutes from "./queue.routes";
import jobRoutes from "./job.routes";
import workerRoutes from "./worker.routes";
import batchRoutes from "./batch.routes";
import retryPolicyRoutes from "./retryPolicy.routes";
import deadLetterRoutes from "./deadLetter.routes";
import statsRoutes from "./stats.routes";
import scheduleRoutes from "./schedule.routes";
import healthRoutes from "./health.routes";
import systemEventRoutes from "./systemEvent.routes";
import alertRoutes from "./alert.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/organizations", organizationRoutes);
router.use("/projects", projectRoutes);
router.use("/queues", queueRoutes);
router.use("/jobs", jobRoutes);
router.use("/workers", workerRoutes);
router.use("/batches", batchRoutes);
router.use("/retry-policies", retryPolicyRoutes);
router.use("/dead-letters", deadLetterRoutes);
router.use("/stats", statsRoutes);
router.use("/schedules", scheduleRoutes);
router.use("/health", healthRoutes);
router.use("/system-events", systemEventRoutes);
router.use("/alerts", alertRoutes);

export default router;
