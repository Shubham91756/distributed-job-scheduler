import request from 'supertest';
import { describe, it, expect } from 'vitest';
import express from 'express';
import helmet from 'helmet';
import { globalLimiter } from '../../middleware/rateLimiter';

const app = express();
app.use(helmet());
app.use(globalLimiter);
app.use(express.json({ limit: "1mb" }));

app.post('/test', (req, res) => {
	res.status(200).json({ ok: true });
});

app.get('/test', (req, res) => {
	res.status(200).json({ ok: true });
});

describe('Security & Middleware Tests', () => {
	it('should include helmet security headers', async () => {
		const res = await request(app).get('/test');
		expect(res.headers['content-security-policy']).toBeDefined();
		expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
	});

	it('should reject payloads larger than 1MB', async () => {
		const largePayload = { data: 'a'.repeat(1024 * 1024 * 2) }; // 2MB
		
		const res = await request(app)
			.post('/test')
			.send(largePayload);
			
		expect(res.status).toBe(413); // Payload Too Large
	});
});
