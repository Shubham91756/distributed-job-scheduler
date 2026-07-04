import type { RequestHandler } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import type { MembershipRole } from "@prisma/client";

export const authorize = (...allowedRoles: MembershipRole[]): RequestHandler => {
	return async (req, _res, next) => {
		try {
			if (!req.user) {
				throw new AppError(401, "Authentication required.");
			}

			const orgId = (req.params as any).orgId || (req.params as any).organizationId;
			if (!orgId) {
				return next();
			}

			const membership = await prisma.organizationMember.findFirst({
				where: {
					organizationId: orgId,
					userId: req.user.id,
					deletedAt: null,
				},
			});

			if (!membership) {
				throw new AppError(403, "You are not a member of this organization.");
			}

			if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
				throw new AppError(403, "Insufficient permissions for this action.");
			}

			next();
		} catch (error) {
			next(error);
		}
	};
};
