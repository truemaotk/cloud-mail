import { env, fetchMock } from 'cloudflare:test';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import chatBots, { chatBotSchema, ensureChatBotSchema, mailNotice, postBotMessage } from '../src/service/chat-bot-service.js';

const feishuUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/test-hook';
const wecomUrl = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=test-key';
const mail = { emailId: 42, subject: 'Test message', sendEmail: 'from@example.test', toEmail: 'to@example.test' };

describe('new-mail notification content', () => {
	it('includes plain text paragraphs and prefers them over HTML', () => {
		const notice = mailNotice({ ...mail, text: '第一段：正文测试。\n第二段：✅ 收到。', content: '<p>HTML fallback</p>' });
		expect(notice).toContain('正文：\n第一段：正文测试。\n第二段：✅ 收到。');
		expect(notice).not.toContain('HTML fallback');
	});
	it('extracts HTML-only mail without scripts, styles or mention tags', () => {
		const notice = mailNotice({ ...mail, content: '<style>.secret {}</style><script>hidden()</script><p>HTML &amp; 正文</p><p>下一段</p>' });
		expect(notice).toContain('HTML & 正文');
		expect(notice).toContain('下一段');
		expect(notice).not.toMatch(/hidden|secret|<p>/);
		expect(mailNotice({ ...mail, text: '<at user_id="all">all</at>' })).not.toContain('<at');
	});
	it('bounds the complete UTF-8 payload and preserves Unicode characters', () => {
		const notice = mailNotice({ ...mail, subject: '标题'.repeat(400), sendEmail: '发件人'.repeat(400), toEmail: '收件人'.repeat(400), text: '中🙂'.repeat(1500) });
		expect(new TextEncoder().encode(notice).length).toBeLessThanOrEqual(1900);
		expect(notice).toContain('正文已截断');
		expect(notice).not.toContain('\uFFFD');
		expect(mailNotice(mail)).toContain('（无文字正文）');
	});
});

describe('chat bot schema upgrades', () => {
	it('initializes a legacy database on concurrent reads and preserves existing settings', async () => {
		const db = { prepare: sql => env.db.prepare(sql), batch: vi.fn(statements => env.db.batch(statements)) };
		expect(await Promise.all([chatBots.status(db), chatBots.get(db, 'feishu')])).toEqual([{}, null]);
		expect(db.batch).toHaveBeenCalledTimes(1);
		await chatBots.save(db, 'feishu', { url: feishuUrl, secret: 'preserved', enabled: true });
		await chatBots.enqueue(db, [mail]);
		// A new binding instance simulates another Worker isolate.
		const nextDb = { prepare: sql => env.db.prepare(sql), batch: statements => env.db.batch(statements) };
		expect(await chatBots.get(nextDb, 'feishu')).toMatchObject({ url: feishuUrl, secret: 'preserved', enabled: 1 });
		expect((await chatBots.status(nextDb)).feishu.pending).toBe(1);
	});

	it('can initialize from the scheduled delivery path before any settings visit', async () => {
		const db = { prepare: sql => env.db.prepare(sql), batch: statements => env.db.batch(statements) };
		await chatBots.deliverDue(db);
		expect(await chatBots.status(db)).toEqual({});
	});

	it('allows a later request to retry a transient setup failure', async () => {
		const db = { prepare: sql => env.db.prepare(sql), batch: vi.fn()
			.mockRejectedValueOnce(new Error('D1 temporarily unavailable'))
			.mockImplementation(statements => env.db.batch(statements)) };
		await expect(ensureChatBotSchema(db)).rejects.toThrow('D1 temporarily unavailable');
		expect(await chatBots.status(db)).toEqual({});
		expect(db.batch).toHaveBeenCalledTimes(2);
	});
});

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
