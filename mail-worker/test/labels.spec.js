import { createExecutionContext, env } from 'cloudflare:test';
import { expect, it } from 'vitest';
import worker from '../src/index.js';
import labels from '../src/service/label-service.js';

it('creates, applies, filters, and deletes distinct message and mailbox labels with ownership checks', async () => {
	let token;
	const request = (path, method = 'GET', body) => worker.fetch(new Request(`http://notify.test/api/${path}`, {
		method,
		headers: { 'accept-language': 'en', 'content-type': 'application/json', ...(token ? { authorization: token } : {}) },
		body: body && JSON.stringify(body),
	}), env, createExecutionContext());
	const json = async (...args) => (await request(...args)).json();
	expect(await (await request(`init/${env.jwt_secret}`)).text()).toBe('success');
	const credentials = { email: 'admin@notify.test', password: 'LocalLabelTestPassword' };
	expect((await json('register', 'POST', credentials)).code).toBe(200);
	token = (await json('login', 'POST', credentials)).data.token;
	const { userId, account: { accountId } } = (await json('my/loginUserInfo')).data;
	const { email_id: emailId } = await env.db.prepare(`INSERT INTO email (account_id, user_id, type, subject, status)
		VALUES (?, ?, 1, 'Local tagged message', 1) RETURNING email_id`).bind(accountId, userId).first();
	const { email_id: secondId } = await env.db.prepare(`INSERT INTO email (account_id, user_id, type, subject)
		VALUES (?, ?, 0, 'Second local message') RETURNING email_id`).bind(accountId, userId).first();

	const message = { name: 'Work', kind: 'message', color: 'blue' };
	const messageLabel = (await json('labels', 'POST', message)).data;
	const mailboxLabel = (await json('labels', 'POST', { ...message, kind: 'mailbox' })).data;
	const otherMessageLabel = (await json('labels', 'POST', { ...message, name: 'Later', color: 'purple' })).data;
	expect((await json('labels', 'POST', message)).code).toBe(409);
	const assign = (kind, itemIds, add, remove = []) => json('labels/assignments', 'PUT', { kind, itemIds, add, remove });
	expect((await assign('message', [emailId, secondId], [messageLabel.id, otherMessageLabel.id])).code).toBe(200);
	expect((await assign('message', [secondId], [], [messageLabel.id])).code).toBe(200);
	expect((await assign('mailbox', [accountId], [mailboxLabel.id])).code).toBe(200);
	expect((await assign('message', [emailId], [mailboxLabel.id])).code).toBe(404);

	const params = `folder=inbox&accountId=${accountId}&labelId=${messageLabel.id}`;
	expect((await json(`email/workspace/list?${params}`)).data).toMatchObject({
		total: 1, list: [{ emailId, labelIds: [messageLabel.id, otherMessageLabel.id] }],
	});
	expect((await json(`email/workspace/detail?${params}&emailId=${emailId}`)).data.labelIds).toContain(messageLabel.id);
	expect((await json('labels')).data.mailboxAssignments).toEqual([{ itemId: accountId, labelId: mailboxLabel.id }]);
	const otherId = userId + 100;
	const foreignLabel = await labels.save(env.db, otherId, message);
	expect((await assign('message', [emailId], [foreignLabel.id])).code).toBe(404);
	await expect(labels.assign(env.db, otherId, { kind: 'message', itemIds: [emailId], add: [foreignLabel.id] }))
		.rejects.toMatchObject({ code: 404 });
	await expect(labels.remove(env.db, otherId, messageLabel.id)).rejects.toMatchObject({ code: 404 });

	expect((await json(`labels/${messageLabel.id}`, 'PUT', { ...message, name: 'Renamed', color: 'green' })).data)
		.toMatchObject({ name: 'Renamed', color: 'green' });
	expect((await json(`labels/${messageLabel.id}`, 'DELETE')).code).toBe(200);
	expect((await json(`email/workspace/list?${params}`)).code).toBe(404);
	expect(await env.db.prepare('SELECT subject FROM email WHERE email_id = ?').bind(emailId).first('subject')).toBe('Local tagged message');
});
