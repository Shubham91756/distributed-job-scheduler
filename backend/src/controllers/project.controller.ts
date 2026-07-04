import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";

export const createProject = asyncHandler(async (req: Request, res: Response) => {
	const { orgId } = (req.params as any);
	const { name, slug, description } = req.body;
	const userId = req.user!.id;

	const membership = await prisma.organizationMember.findFirst({
		where: { organizationId: orgId, userId, deletedAt: null },
	});

	if (!membership) {
		throw new AppError(403, "You are not a member of this organization.");
	}

	const existing = await prisma.project.findUnique({ where: { slug } });
	if (existing) {
		throw new AppError(409, "A project with this slug already exists.");
	}

	const project = await prisma.project.create({
		data: {
			name,
			slug,
			description,
			organizationId: orgId,
			ownerId: userId,
		},
	});

	res.status(201).json({
		status: "success",
		data: { project },
	});
});

export const getProjects = asyncHandler(async (req: Request, res: Response) => {
	const { orgId } = (req.params as any);
	const userId = req.user!.id;
	const page = parseInt((req.query as any).page as string) || 1;
	const limit = parseInt((req.query as any).limit as string) || 20;

	const membership = await prisma.organizationMember.findFirst({
		where: { organizationId: orgId, userId, deletedAt: null },
	});

	if (!membership) {
		throw new AppError(403, "You are not a member of this organization.");
	}

	const where = { organizationId: orgId, deletedAt: null };
	const [data, total] = await Promise.all([
		prisma.project.findMany({
			where,
			skip: (page - 1) * limit,
			take: limit,
			include: {
				_count: { select: { queues: { where: { deletedAt: null } } } },
				owner: { select: { id: true, email: true, name: true } },
			},
			orderBy: { createdAt: "desc" },
		}),
		prisma.project.count({ where }),
	]);

	res.status(200).json({
		status: "success",
		data: { projects: data, total, page, limit },
	});
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const project = await prisma.project.findFirst({
		where: { id, deletedAt: null },
		include: {
			organization: { select: { id: true, name: true, slug: true } },
			owner: { select: { id: true, email: true, name: true } },
			_count: { select: { queues: { where: { deletedAt: null } }, jobs: true } },
		},
	});

	if (!project) {
		throw new AppError(404, "Project not found.");
	}

	// Verify access
	const membership = await prisma.organizationMember.findFirst({
		where: { organizationId: project.organizationId, userId: req.user!.id, deletedAt: null },
	});

	if (!membership) {
		throw new AppError(403, "You don't have access to this project.");
	}

	res.status(200).json({
		status: "success",
		data: { project },
	});
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
	if (!project) {
		throw new AppError(404, "Project not found.");
	}

	const membership = await prisma.organizationMember.findFirst({
		where: { organizationId: project.organizationId, userId: req.user!.id, deletedAt: null, role: { in: ["OWNER", "ADMIN"] } },
	});

	if (!membership && project.ownerId !== req.user!.id) {
		throw new AppError(403, "Only project owners and org admins can update projects.");
	}

	const updated = await prisma.project.update({
		where: { id },
		data: req.body,
	});

	res.status(200).json({
		status: "success",
		data: { project: updated },
	});
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);

	const project = await prisma.project.findFirst({ where: { id, deletedAt: null } });
	if (!project) {
		throw new AppError(404, "Project not found.");
	}

	await prisma.project.update({
		where: { id },
		data: { deletedAt: new Date(), isActive: false },
	});

	res.status(200).json({
		status: "success",
		message: "Project deleted.",
	});
});
