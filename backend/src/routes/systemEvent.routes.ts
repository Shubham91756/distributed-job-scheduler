import { Router } from "express";
import { getSystemEvents } from "../controllers/systemEvent.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.get("/", getSystemEvents);

export default router;
