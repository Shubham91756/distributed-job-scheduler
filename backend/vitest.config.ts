import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/**',
				'dist/**',
				'src/config/**',
				'src/types/**',
				'src/tests/**',
				'vitest.config.ts'
			]
		},
		include: ['src/tests/**/*.test.ts'],
		poolOptions: {
			threads: {
				singleThread: true
			}
		},
		setupFiles: []
	}
});
