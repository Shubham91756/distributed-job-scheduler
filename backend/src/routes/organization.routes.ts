import { Router } from "express";

import * as organizationController from "../controllers/organization.controller";
import { authenticate, validate } from "../middleware";
import { uuidParam } from "../validators/common.validator";
import {
	addMemberValidator,
	createOrganizationValidator,
	updateOrganizationValidator,
} from "../validators/organization.validator";
import { z } from "zod";

const router = Router();

// Require authentication for all org routes
router.use(authenticate);

router.post("/", validate({ body: createOrganizationValidator }), organizationController.createOrganization);
router.get("/", organizationController.getOrganizations);
router.get("/:id", validate({ params: uuidParam }), organizationController.getOrganization);
router.put("/:id", validate({ params: uuidParam, body: updateOrganizationValidator }), organizationController.updateOrganization);

router.post("/:id/members", validate({ params: uuidParam, body: addMemberValidator }), organizationController.addMember);
router.get("/:id/members", validate({ params: uuidParam }), organizationController.getMembers);
router.delete(
	"/:id/members/:userId",
	validate({
		params: z.object({
			id: z.string().uuid(),
			userId: z.string().uuid(),
		}),
	}),
	organizationController.removeMember
);

export default router;
