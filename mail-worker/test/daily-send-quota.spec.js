import { createExecutionContext, env } from 'cloudflare:test';
import { expect, it } from 'vitest';
import worker from '../src/index.js';
import kvConst from '../src/const/kv-const.js';

const admin = 'admin@notify.test';
const password = 'LocalQuotaTestPassword';

async function request(path, { token, method = 'GET', body, bindings = env } = {}) {
	const headers = { 'accept-language': 'en' };
	if (token) headers.authorization = token;
	if (body) headers['content-type'] = 'application/json';
	return worker.fetch(new Request(`http://notify.test/api/${path}`, {
		method, headers, body: body && JSON.stringify(body),
	}), bindings, createExecutionContext());
}

async function json(path, options) {
	return (await request(path, options)).json();
}

async function setup() {
	expect(await (await request(`init/${env.jwt_secret}`)).text()).toBe('success');
	expect((await json('register', { method: 'POST', body: { email: admin, password } })).code).toBe(200);
	const { data: { token } } = await json('login', { method: 'POST', body: { email: admin, password } });
	const { data: { account: { accountId } } } = await json('my/loginUserInfo', { token });
	return { token, accountId };
}

function settings(token, dailySendLimit) {
	return json('setting/dailySendLimit', { token, method: 'PUT', body: { dailySendLimit } });
}

function analysis(token) {
	return json('analysis/echarts?timeZone=UTC', { token, bindings: { ...env, analysis_cache: true } });
}

function send({ token, accountId }, body, bindings) {
	return json('email/send', {
		token, method: 'POST', bindings,
		body: { accountId, subject: 'Local quota test', text: 'Test', content: '<p>Test</p>', ...body },
	});
}

it('preserves old usage, validates settings, and refreshes the quota independently of cached charts', async () => {
	const { token } = await setup();
	const utcDay = new Date().toISOString().slice(0, 10);
	await env.kv.put(kvConst.SEND_DAY_COUNT + utcDay, '6');
	expect(await analysis(token)).toMatchObject({ code: 200, data: { daySendTotal: 6, dailySendLimit: 100 } });
	expect((await settings(undefined, 1)).code).toBe(401);
	expect((await settings(token, 2.5)).code).toBe(400);
	expect((await settings(token, 4)).code).toBe(200);
	expect((await json('setting/query', { token })).data.dailySendLimit).toBe(4);
	expect((await analysis(token)).data).toMatchObject({ daySendTotal: 6, dailySendLimit: 4 });
	await env.db.prepare("UPDATE daily_send_quota SET usage_day = DATE('now', '-1 day')").run();
	expect((await analysis(token)).data).toMatchObject({ daySendTotal: 0, dailySendLimit: 4 });
});

it('applies the shared allowance to concurrent sends by the administrator and counts CC and BCC', async () => {
	const session = await setup();
	expect((await settings(session.token, 3)).code).toBe(200);
	const body = { receiveEmail: [admin], cc: ['admin+cc@notify.test'], bcc: ['admin+bcc@notify.test'] };
	const attempts = await Promise.all([send(session, body), send(session, body)]);
	expect(attempts.map(result => result.code).sort()).toEqual([200, 403]);
	expect((await analysis(session.token)).data).toMatchObject({ daySendTotal: 3, dailySendLimit: 3 });
	expect(await env.db.prepare('SELECT COUNT(*) AS count FROM email WHERE type = 1').first('count')).toBe(1);
});

it('counts provider-accepted mail and releases the unused allowance after a partial failure', async () => {
	const session = await setup();
	expect((await settings(session.token, 2)).code).toBe(200);
	const accepted = 'accepted@example.test';
	const rejected = 'rejected@example.test';
	const bindings = { ...env, email: { async send({ to }) {
		if (to.includes(rejected)) throw new Error('Mock provider rejection');
		return { messageId: 'test-provider-id' };
	} } };
	const attempt = await send(session, { receiveEmail: [accepted, rejected], manyType: 'divide' }, bindings);
	expect(attempt).toMatchObject({ code: 200, data: { failedRecipients: [rejected] } });
	expect((await analysis(session.token)).data.daySendTotal).toBe(1);
	expect((await send(session, { receiveEmail: [admin] })).code).toBe(200);
	expect((await analysis(session.token)).data.daySendTotal).toBe(2);
});
