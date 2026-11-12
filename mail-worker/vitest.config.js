import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';

export default defineWorkersConfig({
	test: {
		include: ['test/**/*.spec.js'],
		poolOptions: {
			workers: {
				miniflare: {
					compatibilityDate: '2025-03-10',
					d1Databases: ['db'],
					kvNamespaces: ['kv'],
					bindings: {
						admin: 'admin@notify.test',
						domain: ['notify.test'],
						jwt_secret: 'ephemeral-test-database-only',
					},
				},
			},
		},
	},
});
