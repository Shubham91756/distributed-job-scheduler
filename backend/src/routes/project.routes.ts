import { Router } from "express";

import * as projectController from "../controllers/project.controller";
import { authenticate, validate } from "../middleware";
import { uuidParam, paginationQuery } from "../validators/common.validator";
import { createProjectValidator, updateProjectValidator } from "../validators/project.validator";
import { z } from "zod";

const router = Router();

router.use(authenticate);

// Organization-scoped routes (get projects by org, create project in org)
router.get(
	"/organization/:orgId",
	validate({
		params: z.object({ orgId: z.string().uuid() }),
		query: paginationQuery,
	}),
	projectController.getProjects
);

router.post(
	"/organization/:orgId",
	validate({
		params: z.object({ orgId: z.string().uuid() }),
		body: createProjectValidator,
	}),
	projectController.createProject
);

// Individual project routes
router.get("/:id", validate({ params: uuidParam }), projectController.getProject);
router.put("/:id", validate({ params: uuidParam, body: updateProjectValidator }), projectController.updateProject);
router.delete("/:id", validate({ params: uuidParam }), projectController.deleteProject);

export default router;
