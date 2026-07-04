import { Router } from "express";

import * as authController from "../controllers/auth.controller";
import { authenticate, validate, authLimiter } from "../middleware";
import { loginValidator, registerValidator } from "../validators/auth.validator";

const router = Router();

router.post("/register", authLimiter, validate({ body: registerValidator }), authController.register);
router.post("/login", authLimiter, validate({ body: loginValidator }), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.post("/logout-everywhere", authenticate, authController.logoutEverywhere);
router.get("/me", authenticate, authController.me);

export default router;
