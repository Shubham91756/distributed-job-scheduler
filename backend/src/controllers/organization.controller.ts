import type { Request, Response } from "express";

import { prisma } from "../config/prisma";
import { AppError } from "../utils/appError";
import { asyncHandler } from "../utils/asyncHandler";

export const createOrganization = asyncHandler(async (req: Request, res: Response) => {
	const { name, slug } = req.body;
	const userId = req.user!.id;

	const existing = await prisma.organization.findUnique({ where: { slug } });
	if (existing) {
		throw new AppError(409, "An organization with this slug already exists.");
	}

	const organization = await prisma.$transaction(async (tx) => {
		const org = await tx.organization.create({
			data: { name, slug },
		});

		await tx.organizationMember.create({
			data: {
				organizationId: org.id,
				userId,
				role: "OWNER",
			},
		});

		return org;
	});

	res.status(201).json({
		status: "success",
		data: { organization },
	});
});

export const getOrganizations = asyncHandler(async (req: Request, res: Response) => {
	const userId = req.user!.id;

	const memberships = await prisma.organizationMember.findMany({
		where: { userId, deletedAt: null },
		include: {
			organization: {
				include: {
					_count: { select: { memberships: { where: { deletedAt: null } }, projects: { where: { deletedAt: null } } } },
				},
			},
		},
	});

	const organizations = memberships.map((m) => ({
		...m.organization,
		role: m.role,
		memberCount: m.organization._count.memberships,
		projectCount: m.organization._count.projects,
	}));

	res.status(200).json({
		status: "success",
		data: { organizations },
	});
});

export const getOrganization = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);
	const userId = req.user!.id;

	const membership = await prisma.organizationMember.findFirst({
		where: { organizationId: id, userId, deletedAt: null },
	});

	if (!membership) {
		throw new AppError(403, "You are not a member of this organization.");
	}

	const organization = await prisma.organization.findFirst({
		where: { id, deletedAt: null },
		include: {
			_count: { select: { memberships: { where: { deletedAt: null } }, projects: { where: { deletedAt: null } } } },
		},
	});

	if (!organization) {
		throw new AppError(404, "Organization not found.");
	}

	res.status(200).json({
		status: "success",
		data: { organization: { ...organization, role: membership.role } },
	});
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);
	const userId = req.user!.id;

	const membership = await prisma.organizationMember.findFirst({
		where: { organizationId: id, userId, deletedAt: null, role: { in: ["OWNER", "ADMIN"] } },
	});

	if (!membership) {
		throw new AppError(403, "Only owners and admins can update the organization.");
	}

	const organization = await prisma.organization.update({
		where: { id },
		data: req.body,
	});

	res.status(200).json({
		status: "success",
		data: { organization },
	});
});

export const addMember = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);
	const { userId, role } = req.body;
	const requesterId = req.user!.id;

	const requesterMembership = await prisma.organizationMember.findFirst({
		where: { organizationId: id, userId: requesterId, deletedAt: null, role: { in: ["OWNER", "ADMIN"] } },
	});

	if (!requesterMembership) {
		throw new AppError(403, "Only owners and admins can add members.");
	}

	const existing = await prisma.organizationMember.findFirst({
		where: { organizationId: id, userId, deletedAt: null },
	});

	if (existing) {
		throw new AppError(409, "User is already a member of this organization.");
	}

	const member = await prisma.organizationMember.create({
		data: { organizationId: id, userId, role: role || "MEMBER" },
		include: { user: { select: { id: true, email: true, name: true } } },
	});

	res.status(201).json({
		status: "success",
		data: { member },
	});
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
	const { id, userId } = (req.params as any);
	const requesterId = req.user!.id;

	const requesterMembership = await prisma.organizationMember.findFirst({
		where: { organizationId: id, userId: requesterId, deletedAt: null, role: { in: ["OWNER", "ADMIN"] } },
	});

	if (!requesterMembership) {
		throw new AppError(403, "Only owners and admins can remove members.");
	}

	await prisma.organizationMember.updateMany({
		where: { organizationId: id, userId, deletedAt: null },
		data: { deletedAt: new Date() },
	});

	res.status(200).json({
		status: "success",
		message: "Member removed.",
	});
});

export const getMembers = asyncHandler(async (req: Request, res: Response) => {
	const { id } = (req.params as any);
	const userId = req.user!.id;

	const membership = await prisma.organizationMember.findFirst({
		where: { organizationId: id, userId, deletedAt: null },
	});

	if (!membership) {
		throw new AppError(403, "You are not a member of this organization.");
	}

	const members = await prisma.organizationMember.findMany({
		where: { organizationId: id, deletedAt: null },
		include: { user: { select: { id: true, email: true, name: true, createdAt: true } } },
		orderBy: { createdAt: "asc" },
	});

	res.status(200).json({
		status: "success",
		data: { members },
	});
});
