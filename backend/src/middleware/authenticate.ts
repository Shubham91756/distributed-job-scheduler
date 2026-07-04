import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

import { env } from "../config/env";
import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import type { AuthenticatedUser } from "../types";

export const authenticate: RequestHandler = async (req, _res, next) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			throw new AppError(401, "Authentication required. Provide a Bearer token.");
		}

		const token = authHeader.split(" ")[1];
		if (!token) {
			throw new AppError(401, "Invalid token format.");
		}

		const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string };

		const user = await prisma.user.findFirst({
			where: { id: decoded.id, deletedAt: null },
			select: { id: true, email: true, name: true },
		});

		if (!user) {
			throw new AppError(401, "User not found or has been deleted.");
		}

		req.user = {
			id: user.id,
			email: user.email,
			role: "MEMBER",
		} as AuthenticatedUser;

		next();
	} catch (error) {
		if (error instanceof AppError) {
			next(error);
		} else if (error instanceof jwt.JsonWebTokenError) {
			next(new AppError(401, "Invalid or expired token."));
		} else {
			next(new AppError(401, "Authentication failed."));
		}
	}
};
