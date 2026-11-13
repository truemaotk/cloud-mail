import { createExecutionContext, env } from 'cloudflare:test';
import { expect, it } from 'vitest';
import worker from '../src/index.js';

it('counts unread received mail across owned mailboxes and updates the count in both directions', async () => {
	let token;
	const request = (path, method = 'GET', body) => worker.fetch(new Request(`http://notify.test/api/${path}`, {
		method,
		headers: { 'content-type': 'application/json', ...(token ? { authorization: token } : {}) },
		body: body && JSON.stringify(body),
	}), env, createExecutionContext());
	const json = async (...args) => (await request(...args)).json();
	const credentials = { email: 'admin@notify.test', password: 'LocalUnreadTestPassword' };
	await request(`init/${env.jwt_secret}`);
	expect((await json('register', 'POST', credentials)).code).toBe(200);
	token = (await json('login', 'POST', credentials)).data.token;
	const { userId, account: { accountId } } = (await json('my/loginUserInfo')).data;
	const { account_id: extraId } = await env.db.prepare(
		"INSERT INTO account (email, user_id) VALUES ('extra@notify.test', ?) RETURNING account_id"
	).bind(userId).first();
	const otherUserId = userId + 100;
	const { account_id: foreignId } = await env.db.prepare(
		"INSERT INTO account (email, user_id) VALUES ('other@notify.test', ?) RETURNING account_id"
	).bind(otherUserId).first();
	const insert = env.db.prepare(`INSERT INTO email (account_id, user_id, type, unread, is_del)
		VALUES (?, ?, ?, ?, ?) RETURNING email_id`);
	const seeded = await env.db.batch([
		insert.bind(accountId, userId, 0, 0, 0),
		insert.bind(extraId, userId, 0, 0, 0),
		insert.bind(extraId, userId, 0, 0, 0),
		insert.bind(extraId, userId, 0, 0, 0),
		insert.bind(foreignId, otherUserId, 0, 0, 0),
		insert.bind(extraId, userId, 0, 0, 1),
		insert.bind(extraId, userId, 1, 0, 0),
	]);
	const [inboxId, archivedId, snoozedId, spamId, foreignMailId] = seeded.map(row => row.results[0].email_id);
	const move = (id, action, until) => json('email/workspace/move', 'PUT', { emailIds: [id], action, until });
	expect((await move(archivedId, 'archived')).code).toBe(200);
	expect((await move(snoozedId, 'snoozed', Date.now() + 3600_000)).code).toBe(200);
	expect((await move(spamId, 'spam')).code).toBe(200);
	const counts = async () => (await json('email/unreadCounts')).data.sort((a, b) => a.accountId - b.accountId);
	const archived = { accountId: extraId, unread: 0, allUnread: 2 };
	expect(await counts()).toEqual([{ accountId, unread: 1, allUnread: 1 }, archived]);

	const mark = unread => json('email/read', 'PUT', { emailIds: [inboxId, foreignMailId], unread });
	expect((await mark(false)).code).toBe(200);
	expect(await counts()).toEqual([archived]);
	const { list } = (await json('allEmail/list?full=0')).data;
	expect(list.find(row => row.emailId === inboxId)).toMatchObject({ userId, unread: 1 });
	expect(list.find(row => row.emailId === foreignMailId)).toMatchObject({ userId: otherUserId, unread: 0 });
	expect((await mark(true)).code).toBe(200);
	expect(await counts()).toEqual([{ accountId, unread: 1, allUnread: 1 }, archived]);
	const arrivals = async () => (await json('email/unreadCounts?withLatest=1')).data;
	const before = await arrivals();
	const older = before.counts.find(row => row.accountId === accountId);
	expect(older).toMatchObject({ latestUnreadId: inboxId, latestInboxUnreadId: inboxId });
	expect((await mark(false)).code).toBe(200);
	expect((await mark(true)).code).toBe(200);
	expect((await arrivals()).latestId).toBe(before.latestId);
	const { email_id: newId } = await insert.bind(extraId, userId, 0, 0, 0).first();
	const after = await arrivals();
	expect(after.latestId).toBe(newId);
	expect(after.counts.find(row => row.accountId === extraId)).toMatchObject({
		unread: 1, allUnread: 3, latestUnreadId: newId, latestInboxUnreadId: newId,
	});
});
