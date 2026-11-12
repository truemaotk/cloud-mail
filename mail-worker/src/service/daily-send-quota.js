import kvConst from '../const/kv-const';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 99999;
const initialization = new WeakMap();

function initializeQuota({ db, kv }) {
	if (!initialization.has(db)) {
		const pending = (async () => {
			// Carry over the old counter for the UTC day in which the Worker is upgraded.
			const day = new Date().toISOString().slice(0, 10);
			const previous = Number(await kv.get(kvConst.SEND_DAY_COUNT + day));
			const sent = Number.isSafeInteger(previous) && previous > 0 ? previous : 0;
			await db.batch([
				db.prepare(`CREATE TABLE IF NOT EXISTS daily_send_quota (
					id INTEGER PRIMARY KEY CHECK (id = 1),
					daily_limit INTEGER NOT NULL,
					usage_day TEXT NOT NULL,
					sent INTEGER NOT NULL DEFAULT 0,
					reserved INTEGER NOT NULL DEFAULT 0
				)`),
				db.prepare(`INSERT OR IGNORE INTO daily_send_quota (id, daily_limit, usage_day, sent)
					VALUES (1, ?, ?, ?)`).bind(DEFAULT_LIMIT, day, sent),
			]);
		})().finally(() => initialization.delete(db));
		initialization.set(db, pending);
	}
	return initialization.get(db);
}

async function withQuota(env, query) {
	try {
		return await query(env.db);
	} catch (error) {
		if (!error.message?.includes('no such table: daily_send_quota')) throw error;
		await initializeQuota(env);
		return query(env.db);
	}
}

const dailySendQuota = {
	get(env) {
		return withQuota(env, db => db.prepare(`SELECT daily_limit AS dailySendLimit,
			CASE WHEN usage_day = DATE('now') THEN sent ELSE 0 END AS daySendTotal
			FROM daily_send_quota WHERE id = 1`).first());
	},

	async setLimit(env, limit) {
		if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
			throw new BizError(t('invalidSiteDailySendLimit'), 400);
		}
		await withQuota(env, db => db.prepare('UPDATE daily_send_quota SET daily_limit = ? WHERE id = 1').bind(limit).run());
	},

	async reserve(env, count) {
		// Check and reserve in one write so concurrent requests share the same allowance.
		const row = await withQuota(env, db => db.prepare(`UPDATE daily_send_quota SET
			reserved = (CASE WHEN usage_day = DATE('now') THEN reserved ELSE 0 END) + ?,
			sent = CASE WHEN usage_day = DATE('now') THEN sent ELSE 0 END,
			usage_day = DATE('now')
			WHERE id = 1 AND (CASE WHEN usage_day = DATE('now') THEN sent + reserved ELSE 0 END) + ? <= daily_limit
			RETURNING usage_day`).bind(count, count).first());
		if (!row) throw new BizError(t('siteDailySendLimitReached'), 403);
		return row.usage_day;
	},

	async settle(env, day, reserved, accepted) {
		await env.db.prepare(`UPDATE daily_send_quota SET reserved = reserved - ?, sent = sent + ?
			WHERE id = 1 AND usage_day = ?`).bind(reserved, accepted, day).run();
	},
};

export default dailySendQuota;
