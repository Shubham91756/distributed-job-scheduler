import { Router } from "express";
import { getAlerts } from "../controllers/alert.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);
router.get("/", getAlerts);

export default router;
