import { env, fetchMock } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import chatBots, { chatBotSchema, postBotMessage } from '../src/service/chat-bot-service.js';

const feishuUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/test-hook';
const wecomUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key';
const mail = { emailId: 42, subject: 'Test message', sendEmail: 'from@example.test', toEmail: 'to@example.test' };

describe('chat bot delivery', () => {
	beforeEach(async () => {
		fetchMock.activate();
		fetchMock.disableNetConnect();
		await env.db.batch(chatBotSchema.map(sql => env.db.prepare(sql)));
	});

	afterEach(() => {
		fetchMock.deactivate();
	});

	it('sends a signed Feishu payload using the Worker fetch implementation', async () => {
		fetchMock.get('https://open.feishu.cn').intercept({
			path: '/open-apis/bot/v2/hook/test-hook',
			method: 'POST',
			body: raw => {
				const payload = JSON.parse(raw);
				return payload.msg_type === 'text' && payload.content.text === 'Test notice'
					&& /^\d+$/.test(payload.timestamp) && /^[A-Za-z0-9+/]{43}=$/.test(payload.sign);
			},
		}).reply(200, JSON.stringify({ code: 0 }));

		await postBotMessage({ channel: 'feishu', url: feishuUrl, secret: 'test-signing-secret' }, 'Test notice');
		fetchMock.assertNoPendingInterceptors();
	});

	it('retries rejected deliveries and removes successful jobs', async () => {
		await chatBots.save(env.db, 'wecom', { url: wecomUrl, secret: '', enabled: true });
		await chatBots.enqueue(env.db, [mail]);
		await chatBots.enqueue(env.db, [mail]);
		const wecom = fetchMock.get('https://qyapi.weixin.qq.com');
		const request = { path: '/cgi-bin/webhook/send?key=test-key', method: 'POST' };
		wecom.intercept(request).reply(200, JSON.stringify({ errcode: 45009 }));
		await chatBots.deliverDue(env.db);
		expect((await chatBots.status(env.db)).wecom).toMatchObject({ pending: 1, failed: 0 });
		const job = await env.db.prepare('SELECT attempts, due_at FROM chat_bot_delivery').first();
		expect(job.attempts).toBe(1);
		expect(job.due_at).toBeGreaterThan(Date.now());

		await env.db.prepare('UPDATE chat_bot_delivery SET due_at = 0').run();
		wecom.intercept(request).reply(200, JSON.stringify({ errcode: 0 }));
		await chatBots.deliverDue(env.db);
		expect((await chatBots.status(env.db)).wecom).toMatchObject({ pending: 0, failed: 0 });
		fetchMock.assertNoPendingInterceptors();
	});

	it('rejects redirects without forwarding credentials or mail content', async () => {
		fetchMock.get('https://open.feishu.cn').intercept({
			path: '/open-apis/bot/v2/hook/test-hook', method: 'POST',
		}).reply(302, '', { headers: { location: 'https://example.test/redirect' } });

		await expect(postBotMessage({ channel: 'feishu', url: feishuUrl }, 'Test notice')).rejects.toThrow('HTTP 302');
		fetchMock.assertNoPendingInterceptors();
	});
});
