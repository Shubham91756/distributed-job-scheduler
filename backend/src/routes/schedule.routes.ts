import { Router } from "express";
import {
	createSchedule,
	getSchedules,
	getSchedule,
	updateSchedule,
	deleteSchedule,
	toggleSchedule,
	previewNextRuns
} from "../controllers/schedule.controller";

const router = Router();

router.post("/preview", previewNextRuns);
router.post("/", createSchedule);
router.get("/", getSchedules);
router.get("/:id", getSchedule);
router.put("/:id", updateSchedule);
router.delete("/:id", deleteSchedule);
router.patch("/:id/toggle", toggleSchedule);

export default router;
