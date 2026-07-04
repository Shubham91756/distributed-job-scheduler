import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authController from '../../controllers/auth.controller';
import { prisma } from '../../config/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock dependencies
vi.mock('../../config/prisma', () => ({
	prisma: {
		user: {
			findUnique: vi.fn(),
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		refreshToken: {
			create: vi.fn(),
			findUnique: vi.fn(),
			update: vi.fn(),
			updateMany: vi.fn()
		}
	}
}));

vi.mock('../../services/systemEvent.service', () => ({
	SystemEventServiceLogger: {
		log: vi.fn(),
	}
}));

vi.mock('bcryptjs', () => ({
	default: {
		hash: vi.fn(),
		compare: vi.fn()
	},
	hash: vi.fn(),
	compare: vi.fn()
}));

vi.mock('jsonwebtoken', () => ({
	default: {
		sign: vi.fn(),
		verify: vi.fn()
	}
}));

describe('Auth Controller - Unit Tests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('login', () => {
		it('should lock account after 5 failed attempts', async () => {
			const mockReq = {
				body: { email: 'test@example.com', password: 'wrong' }
			};
			const mockRes = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn()
			};
			const mockNext = vi.fn();

			const mockUser = {
				id: 'uuid-1',
				email: 'test@example.com',
				passwordHash: 'hashed',
				loginAttempts: 4,
				lockedUntil: null
			};

			vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);
			
			vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

			await new Promise<void>((resolve) => {
				mockNext.mockImplementation(() => resolve());
				mockRes.json.mockImplementation(() => resolve());
				authController.login(mockReq as any, mockRes as any, mockNext);
			});

			
			expect(prisma.user.update).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { id: 'uuid-1' },
					data: expect.objectContaining({
						loginAttempts: 5,
						lockedUntil: expect.any(Date)
					})
				})
			);
			
			// Should throw an error which is passed to next()
			expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
				statusCode: 401,
				message: 'Invalid email or password.'
			}));
		});
	});
});
