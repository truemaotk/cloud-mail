import { mkdir, writeFile } from 'node:fs/promises';

function readBuildVariable(name, format) {
	const value = process.env[name]?.trim() ?? '';
	if (!format.test(value)) {
		throw new Error(`Set a valid ${name} in Cloudflare Workers Builds.`);
	}
	return value;
}

const databaseId = readBuildVariable('D1_DATABASE_ID', /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i);
const namespaceId = readBuildVariable('KV_NAMESPACE_ID', /^[a-f0-9]{32}$/i);
const bucketName = readBuildVariable('R2_BUCKET_NAME', /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/);

const config = {
	name: 'cloud-mail',
	main: '../../src/index.js',
	compatibility_date: '2025-06-04',
	keep_vars: true,
	workers_dev: true,
	preview_urls: true,
	observability: { enabled: true },
	d1_databases: [{ binding: 'db', database_name: 'cloud-mail-d1', database_id: databaseId }],
	kv_namespaces: [{ binding: 'kv', id: namespaceId }],
	r2_buckets: [{ binding: 'r2', bucket_name: bucketName }],
	ai: { binding: 'ai' },
	assets: {
		binding: 'assets',
		directory: '../../dist',
		not_found_handling: 'single-page-application',
		run_worker_first: true,
	},
	triggers: { crons: ['0 * * * *', '* * * * *'] },
};

const outputDirectory = new URL('../.wrangler/production/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await writeFile(new URL('wrangler.json', outputDirectory), `${JSON.stringify(config, null, 2)}\n`);
