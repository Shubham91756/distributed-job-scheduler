import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";
import { SystemEventServiceLogger } from "../services/systemEvent.service";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

const signToken = (user: { id: string; email: string }): string => {
	return jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, {
		expiresIn: env.JWT_EXPIRES_IN,
	} as jwt.SignOptions);
};

const signRefreshToken = (user: { id: string }): string => {
	// We generate a random token instead of JWT for refresh tokens so we can easily revoke them in DB
	return crypto.randomBytes(40).toString("hex");
};

export const register = asyncHandler(async (req: Request, res: Response) => {
	const { email, password, name } = req.body;

	const existing = await prisma.user.findUnique({ where: { email } });
	if (existing) {
		throw new AppError(409, "An account with this email already exists.");
	}

	const passwordHash = await bcrypt.hash(password, 12);

	const user = await prisma.user.create({
		data: { email, passwordHash, name },
		select: { id: true, email: true, name: true, createdAt: true },
	});

	const token = signToken(user);
	const refreshToken = signRefreshToken(user);

	// Calculate expiration based on env (simple parsing for days/hours can be complex, assuming '7d' logic)
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7);

	await prisma.refreshToken.create({
		data: {
			userId: user.id,
			token: refreshToken,
			expiresAt,
		}
	});

	await SystemEventServiceLogger.log({
		eventType: "User Registered",
		message: `User ${user.email} registered`,
		severity: "INFO",
		service: "API",
		correlationId: (req as any).correlationId,
	});

	res.status(201).json({
		status: "success",
		data: { user, token, refreshToken },
	});
});

export const login = asyncHandler(async (req: Request, res: Response) => {
	const { email, password } = req.body;

	const user = await prisma.user.findFirst({
		where: { email, deletedAt: null },
	});

	if (!user) {
		throw new AppError(401, "Invalid email or password.");
	}

	// Check if account is locked
	if (user.lockedUntil && user.lockedUntil > new Date()) {
		await SystemEventServiceLogger.log({
			eventType: "Account Locked Login Attempt",
			message: `User ${user.email} attempted to login while locked`,
			severity: "WARN",
			service: "API",
			correlationId: (req as any).correlationId,
		});
		throw new AppError(403, "Account is temporarily locked due to multiple failed login attempts. Try again later.");
	}

	if (!(await bcrypt.compare(password, user.passwordHash))) {
		// Increment login attempts
		const newAttempts = user.loginAttempts + 1;
		let lockedUntil = null;
		
		if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
			lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
			await SystemEventServiceLogger.log({
				eventType: "Account Lockout",
				message: `User ${user.email} locked out due to failed attempts`,
				severity: "WARN",
				service: "API",
				correlationId: (req as any).correlationId,
			});
		}

		await prisma.user.update({
			where: { id: user.id },
			data: { loginAttempts: newAttempts, lockedUntil }
		});

		throw new AppError(401, "Invalid email or password.");
	}

	// Reset login attempts on success
	if (user.loginAttempts > 0 || user.lockedUntil) {
		await prisma.user.update({
			where: { id: user.id },
			data: { loginAttempts: 0, lockedUntil: null }
		});
	}

	const token = signToken(user);
	const refreshToken = signRefreshToken(user);
	
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7);

	await prisma.refreshToken.create({
		data: {
			userId: user.id,
			token: refreshToken,
			expiresAt,
		}
	});

	await SystemEventServiceLogger.log({
		eventType: "User Login",
		message: `User ${user.email} logged in`,
		severity: "INFO",
		service: "API",
		correlationId: (req as any).correlationId,
	});

	res.status(200).json({
		status: "success",
		data: {
			user: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt },
			token,
			refreshToken
		},
	});
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
	const { refreshToken } = req.body;
	
	if (!refreshToken) {
		throw new AppError(400, "Refresh token is required.");
	}

	const tokenRecord = await prisma.refreshToken.findUnique({
		where: { token: refreshToken },
		include: { user: true }
	});

	if (!tokenRecord || tokenRecord.revokedAt || tokenRecord.expiresAt < new Date()) {
		throw new AppError(401, "Invalid or expired refresh token.");
	}

	// Revoke old token and issue a new one (Token Rotation)
	await prisma.refreshToken.update({
		where: { id: tokenRecord.id },
		data: { revokedAt: new Date() }
	});

	const token = signToken(tokenRecord.user);
	const newRefreshToken = signRefreshToken(tokenRecord.user);
	
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 7);

	await prisma.refreshToken.create({
		data: {
			userId: tokenRecord.user.id,
			token: newRefreshToken,
			expiresAt,
		}
	});

	res.status(200).json({
		status: "success",
		data: { token, refreshToken: newRefreshToken },
	});
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
	const { refreshToken } = req.body;

	if (refreshToken) {
		await prisma.refreshToken.updateMany({
			where: { token: refreshToken, userId: req.user!.id, revokedAt: null },
			data: { revokedAt: new Date() }
		});
	}

	await SystemEventServiceLogger.log({
		eventType: "User Logout",
		message: `User ${req.user!.email} logged out`,
		severity: "INFO",
		service: "API",
		correlationId: (req as any).correlationId,
	});

	res.status(200).json({
		status: "success",
		message: "Logged out successfully"
	});
});

export const logoutEverywhere = asyncHandler(async (req: Request, res: Response) => {
	await prisma.refreshToken.updateMany({
		where: { userId: req.user!.id, revokedAt: null },
		data: { revokedAt: new Date() }
	});

	await SystemEventServiceLogger.log({
		eventType: "User Logout Everywhere",
		message: `User ${req.user!.email} revoked all sessions`,
		severity: "INFO",
		service: "API",
		correlationId: (req as any).correlationId,
	});

	res.status(200).json({
		status: "success",
		message: "Logged out from all devices successfully"
	});
});

export const me = asyncHandler(async (req: Request, res: Response) => {
	const user = await prisma.user.findFirst({
		where: { id: req.user!.id, deletedAt: null },
		select: { id: true, email: true, name: true, isVerified: true, createdAt: true, updatedAt: true },
	});

	if (!user) {
		throw new AppError(404, "User not found.");
	}

	res.status(200).json({
		status: "success",
		data: { user },
	});
});
