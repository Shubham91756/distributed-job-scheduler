import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";

export const createRetryPolicy = asyncHandler(async (req: Request, res: Response) => {
	const policy = await prisma.retryPolicy.create({
		data: { ...req.body, version: 1 },
	});

	await prisma.systemEvent.create({
		data: {
			eventType: "RETRY_POLICY_CREATED",
			metadata: { policyId: policy.id, name: policy.name },
		},
	});

	res.status(201).json({ status: "success", data: { retryPolicy: policy } });
});

export const getRetryPolicies = asyncHandler(async (_req: Request, res: Response) => {
	const policies = await prisma.retryPolicy.findMany({
		where: { deletedAt: null, isEnabled: true },
		orderBy: { createdAt: "desc" },
	});

	res.status(200).json({
		status: "success",
		data: { retryPolicies: policies },
	});
});

export const getRetryPolicy = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const policy = await prisma.retryPolicy.findFirst({
		where: { id, deletedAt: null },
		include: {
			_count: { select: { queues: true, jobs: true } },
		},
	});

	if (!policy) {
		throw new AppError(404, "Retry policy not found.");
	}

	res.status(200).json({ status: "success", data: { retryPolicy: policy } });
});

export const updateRetryPolicy = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const existing = await prisma.retryPolicy.findFirst({ where: { id, deletedAt: null } });
	if (!existing) {
		throw new AppError(404, "Retry policy not found.");
	}

	// Copy on write: Soft delete old, create new
	const updated = await prisma.$transaction(async (tx) => {
		await tx.retryPolicy.update({
			where: { id },
			data: { deletedAt: new Date(), isEnabled: false },
		});

		const newPolicyData = { ...existing, ...req.body, id: undefined, createdAt: undefined, updatedAt: undefined };
		newPolicyData.version = existing.version + 1;
		newPolicyData.parentId = existing.parentId || existing.id;
		newPolicyData.deletedAt = null;

		const newPolicy = await tx.retryPolicy.create({
			data: newPolicyData,
		});

		// Update all queues that were using the old policy to use the new one
		await tx.queue.updateMany({
			where: { retryPolicyId: id },
			data: { retryPolicyId: newPolicy.id },
		});

		await tx.systemEvent.create({
			data: {
				eventType: "RETRY_POLICY_UPDATED",
				metadata: { oldPolicyId: id, newPolicyId: newPolicy.id, newVersion: newPolicy.version },
			},
		});

		return newPolicy;
	});

	res.status(200).json({ status: "success", data: { retryPolicy: updated } });
});

export const deleteRetryPolicy = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const existing = await prisma.retryPolicy.findFirst({ where: { id, deletedAt: null } });
	if (!existing) {
		throw new AppError(404, "Retry policy not found.");
	}

	await prisma.$transaction(async (tx) => {
		await tx.retryPolicy.update({
			where: { id },
			data: { deletedAt: new Date(), isEnabled: false },
		});

		await tx.systemEvent.create({
			data: {
				eventType: "RETRY_POLICY_DISABLED",
				metadata: { policyId: id },
			},
		});
	});

	res.status(200).json({ status: "success", message: "Retry policy deleted." });
});
