import emailUtils from '../utils/email-utils';

const channels = ['feishu', 'wecom'];
const maxAttempts = 8;
const encoder = new TextEncoder();

export const chatBotSchema = [
	`CREATE TABLE IF NOT EXISTS chat_bot (
		channel TEXT PRIMARY KEY, url TEXT NOT NULL, secret TEXT NOT NULL,
		enabled INTEGER NOT NULL, target_id TEXT NOT NULL
	)`,
	`CREATE TABLE IF NOT EXISTS chat_bot_delivery (
		channel TEXT NOT NULL, email_id INTEGER NOT NULL, target_id TEXT NOT NULL,
		message TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0, due_at INTEGER NOT NULL,
		PRIMARY KEY (channel, email_id)
	)`,
	'CREATE INDEX IF NOT EXISTS idx_chat_bot_delivery_due ON chat_bot_delivery(due_at)',
];

// Existing installations may predate these tables. Share concurrent setup work,
// and allow the next request to retry if D1 was temporarily unavailable.
const schemaReady = new WeakMap();
export function ensureChatBotSchema(db) {
	if (!schemaReady.has(db)) {
		const pending = db.batch(chatBotSchema.map(sql => db.prepare(sql))).catch(error => {
			schemaReady.delete(db);
			throw error;
		});
		schemaReady.set(db, pending);
	}
	return schemaReady.get(db);
}

export function validChannel(channel) {
	return channels.includes(channel);
}

export function validBotUrl(channel, value) {
	try {
		const url = new URL(value);
		if (url.protocol !== 'https:' || url.port || url.username || url.password || url.hash) return false;
		if (channel === 'feishu') {
			return url.hostname === 'open.feishu.cn' && !url.search
				&& /^\/open-apis\/bot\/v2\/hook\/[\w-]+$/.test(url.pathname);
		}
		return channel === 'wecom' && url.hostname === 'qyapi.weixin.qq.com'
			&& url.pathname === '/cgi-bin/webhook/send' && /^\?key=[\w-]+$/.test(url.search);
	} catch {
		return false;
	}
}

function safeLine(value) {
	let line = '';
	let bytes = 0;
	for (const char of String(value ?? '').replace(/\s+/g, ' ').trim().replace(/</g, '＜').replace(/>/g, '＞')) {
		bytes += encoder.encode(char).length;
		if (bytes > 450) return line + '…';
		line += char;
	}
	return line || '—';
}

export function mailNotice(email) {
	const heading = [
		'mail · 新邮件',
		'主题：' + safeLine(email.subject),
		'发件人：' + safeLine(email.sendEmail || email.name),
		'收件邮箱：' + safeLine(email.toEmail),
		'', '正文：',
	].join('\n') + '\n';
	const text = (emailUtils.formatText(email.text) || emailUtils.htmlToText(email.content) || '（无文字正文）')
		.replace(/</g, '＜').replace(/>/g, '＞');
	// Budget the entire UTF-8 message, including metadata and the truncation note.
	// A shared conservative size keeps Chinese and emoji safe on both channels.
	const suffix = '\n…（正文已截断，请在邮箱查看完整邮件）';
	const budget = 1900 - encoder.encode(heading).length;
	if (encoder.encode(text).length <= budget) return heading + text;
	let preview = '', used = 0;
	for (const char of text) {
		const bytes = encoder.encode(char).length;
		if (used + bytes > budget - encoder.encode(suffix).length) break;
		preview += char;
		used += bytes;
	}
	return heading + preview + suffix;
}

export async function postBotMessage(bot, message, send = fetch) {
	const { channel, url, secret } = bot;
	if (!validBotUrl(channel, url)) throw new Error('invalid-url');

	let payload;
	if (channel === 'feishu') {
		payload = { msg_type: 'text', content: { text: message } };
		if (secret) {
			const timestamp = String(Math.floor(Date.now() / 1000));
			const key = await crypto.subtle.importKey('raw', encoder.encode(timestamp + '\n' + secret),
				{ name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
			const signature = await crypto.subtle.sign('HMAC', key, new Uint8Array());
			Object.assign(payload, { timestamp, sign: btoa(String.fromCharCode(...new Uint8Array(signature))) });
		}
	} else {
		payload = { msgtype: 'text', text: { content: message } };
	}

	let response;
	try {
		response = await send(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			// Keep webhook credentials on the validated host. Workers only support manual or follow.
			redirect: 'manual',
			signal: AbortSignal.timeout(5000),
			body: JSON.stringify(payload),
		});
	} catch (error) {
		if (error?.name === 'TimeoutError') throw new Error('timeout');
		throw new Error('network');
	}
	if (!response.ok) throw new Error('HTTP ' + response.status);
	const body = await response.json().catch(() => null);
	const code = channel === 'feishu' ? body?.code ?? body?.StatusCode : body?.errcode;
	if (code !== 0) throw new Error(Number.isInteger(code) ? String(code) : 'invalid-response');
}

const chatBotService = {
	async status(db) {
		await ensureChatBotSchema(db);
		const { results } = await db.prepare(`
			SELECT b.channel, b.url <> '' AS configured, b.secret <> '' AS signed, b.enabled,
				COUNT(CASE WHEN d.attempts < ? THEN 1 END) AS pending,
				COUNT(CASE WHEN d.attempts >= ? THEN 1 END) AS failed
			FROM chat_bot b LEFT JOIN chat_bot_delivery d
				ON b.channel = d.channel AND b.target_id = d.target_id
			GROUP BY b.channel
		`).bind(maxAttempts, maxAttempts).all();
		return Object.fromEntries(results.map(({ channel, ...row }) => [channel, row]));
	},

	async get(db, channel) {
		await ensureChatBotSchema(db);
		return db.prepare('SELECT * FROM chat_bot WHERE channel = ?').bind(channel).first();
	},

	async save(db, channel, { url, secret, enabled }, previous) {
		await ensureChatBotSchema(db);
		const target = previous?.url === url ? previous.target_id : crypto.randomUUID();
		await db.batch([
			db.prepare(`INSERT INTO chat_bot VALUES (?, ?, ?, ?, ?)
				ON CONFLICT(channel) DO UPDATE SET url = excluded.url, secret = excluded.secret,
				enabled = excluded.enabled, target_id = excluded.target_id`).bind(channel, url, secret, Number(enabled), target),
			db.prepare('DELETE FROM chat_bot_delivery WHERE channel = ? AND target_id <> ?').bind(channel, target),
		]);
	},

	async enqueue(db, emails) {
		if (!emails.length) return;
		await ensureChatBotSchema(db);
		await db.batch(emails.map(email => db.prepare(`
			INSERT OR IGNORE INTO chat_bot_delivery (channel, email_id, target_id, message, due_at)
			SELECT channel, ?, target_id, ?, ? FROM chat_bot WHERE enabled = 1
		`).bind(email.emailId, mailNotice(email), Date.now())));
	},

	async retryFailed(db, channel) {
		await ensureChatBotSchema(db);
		await db.prepare('UPDATE chat_bot_delivery SET attempts = 0, due_at = ? WHERE channel = ? AND attempts >= ?')
			.bind(Date.now(), channel, maxAttempts).run();
	},

	async deliverDue(db, limit = 20) {
		await ensureChatBotSchema(db);
		const now = Date.now();
		const { results } = await db.prepare(`
			SELECT d.channel, d.email_id, d.target_id FROM chat_bot_delivery d
			JOIN chat_bot b ON b.channel = d.channel AND b.target_id = d.target_id
			WHERE b.enabled = 1 AND d.due_at <= ? AND d.attempts < ? ORDER BY d.due_at LIMIT ?
		`).bind(now, maxAttempts, limit).all();

		for (const { channel, email_id, target_id } of results) {
			const delivery = await db.prepare(`
				UPDATE chat_bot_delivery SET due_at = ?
				WHERE channel = ? AND email_id = ? AND target_id = ? AND due_at <= ? AND attempts < ?
				RETURNING message, attempts
			`).bind(Date.now() + 60000, channel, email_id, target_id, now, maxAttempts).first();
			if (!delivery) continue;

			const bot = await this.get(db, channel);
			if (!bot?.enabled || bot.target_id !== target_id) continue;
			try {
				await postBotMessage(bot, delivery.message);
			} catch (error) {
				const attempts = delivery.attempts + 1;
				const due = Date.now() + Math.min(60000 * 2 ** (attempts - 1), 3600000);
				await db.prepare(`UPDATE chat_bot_delivery SET attempts = ?, due_at = ?
					WHERE channel = ? AND email_id = ? AND target_id = ?`).bind(attempts, due, channel, email_id, target_id).run();
				console.warn('Chat bot delivery failed', channel, email_id, error.message);
				continue;
			}
			await db.prepare('DELETE FROM chat_bot_delivery WHERE channel = ? AND email_id = ? AND target_id = ?')
				.bind(channel, email_id, target_id).run();
		}
	},

	async forward(env, ctx, emails) {
		try {
			await this.enqueue(env.db, emails);
			ctx.waitUntil(this.deliverDue(env.db, 4).catch(() => console.error('Chat bot delivery queue failed')));
		} catch {
			console.error('Chat bot notification could not be queued');
		}
	},
};

export default chatBotService;
