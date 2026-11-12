import { sql } from 'drizzle-orm';
import email from '../entity/email';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const kinds = new Set(['message', 'mailbox']);
const colors = new Set(['gray', 'red', 'orange', 'green', 'blue', 'purple', 'pink']);
const initializing = new WeakMap();

function fail(key = 'labelInvalid', code = 400) {
	throw new BizError(t(key), code);
}

function ensureTables(db) {
	if (!initializing.has(db)) {
		const pending = db.batch([
			db.prepare(`CREATE TABLE IF NOT EXISTS mail_label (
				label_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
				kind TEXT NOT NULL CHECK (kind IN ('message', 'mailbox')),
				name TEXT NOT NULL COLLATE NOCASE, color TEXT NOT NULL,
				UNIQUE (user_id, kind, name)
			)`),
			db.prepare(`CREATE TABLE IF NOT EXISTS mail_label_assignment (
				label_id INTEGER NOT NULL REFERENCES mail_label(label_id) ON DELETE CASCADE,
				item_id INTEGER NOT NULL, PRIMARY KEY (label_id, item_id)
			)`),
			db.prepare('CREATE INDEX IF NOT EXISTS idx_mail_label_assignment_item ON mail_label_assignment(item_id, label_id)'),
		]).finally(() => initializing.delete(db));
		initializing.set(db, pending);
	}
	return initializing.get(db);
}

async function withLabels(db, work) {
	try {
		return await work(db);
	} catch (error) {
		if (!/no such table: mail_label(?:_assignment)?\b/.test(error.message)) throw error;
		await ensureTables(db);
		return work(db);
	}
}

function validIds(ids, min = 0) {
	if (!Array.isArray(ids) || ids.length < min || ids.length > 50 || ids.some(id => !Number.isSafeInteger(id) || id < 1)) fail();
	return [...new Set(ids)];
}

// The label definition is scoped to its owner even though mail IDs are global.
export function messageHasLabel(userId, labelId) {
	return sql`EXISTS (SELECT 1 FROM mail_label_assignment a JOIN mail_label l ON l.label_id = a.label_id
		WHERE a.item_id = ${email.emailId} AND l.label_id = ${labelId} AND l.user_id = ${userId} AND l.kind = 'message')`;
}

const labelColumns = 'label_id AS id, kind, name, color';
const mailboxItems = 'SELECT account_id AS item_id FROM account WHERE user_id = ? AND is_del = 0';
const messageItems = `SELECT email.email_id AS item_id FROM email JOIN account ON account.account_id = email.account_id
	WHERE email.user_id = ? AND account.user_id = email.user_id AND account.is_del = 0 AND email.is_del = 0
	AND email.type IN (0, 1) AND email.status NOT IN (6, 7)`;

export default {
	async list(db, userId) {
		return withLabels(db, async db => {
			const [{ results: labels }, { results: mailboxAssignments }] = await db.batch([
				db.prepare(`SELECT ${labelColumns} FROM mail_label WHERE user_id = ? ORDER BY name, label_id`).bind(userId),
				db.prepare(`SELECT a.item_id AS itemId, a.label_id AS labelId
					FROM mail_label_assignment a JOIN mail_label l ON l.label_id = a.label_id
					WHERE l.user_id = ? AND l.kind = 'mailbox' AND a.item_id IN (SELECT item_id FROM (${mailboxItems}))`).bind(userId, userId),
			]);
			return { labels, mailboxAssignments };
		});
	},

	async save(db, userId, data, id = null) {
		const name = typeof data?.name === 'string' ? data.name.trim() : '';
		const { kind, color } = data ?? {};
		if (!kinds.has(kind) || !colors.has(color) || !name || [...name].length > 40 || /[\u0000-\u001f\u007f]/u.test(name)) fail();
		if (id !== null) validIds([id], 1);
		try {
			const row = await withLabels(db, db => id === null
				? db.prepare(`INSERT INTO mail_label (user_id, kind, name, color) VALUES (?, ?, ?, ?) RETURNING ${labelColumns}`)
					.bind(userId, kind, name, color).first()
				: db.prepare(`UPDATE mail_label SET name = ?, color = ? WHERE label_id = ? AND user_id = ? AND kind = ? RETURNING ${labelColumns}`)
					.bind(name, color, id, userId, kind).first());
			if (!row) fail('labelNotFound', 404);
			return row;
		} catch (error) {
			if (error.message.includes('UNIQUE constraint failed')) fail('labelDuplicate', 409);
			throw error;
		}
	},

	async remove(db, userId, id) {
		validIds([id], 1);
		const removed = await withLabels(db, db => db.prepare('DELETE FROM mail_label WHERE label_id = ? AND user_id = ? RETURNING label_id')
			.bind(id, userId).first());
		if (!removed) fail('labelNotFound', 404);
	},

	async messageAssignments(db, userId, ids) {
		if (!ids.length) return [];
		const { results } = await withLabels(db, db => db.prepare(`SELECT a.item_id AS itemId, a.label_id AS labelId
			FROM mail_label_assignment a JOIN mail_label l ON l.label_id = a.label_id
			WHERE l.user_id = ? AND l.kind = 'message' AND a.item_id IN (SELECT value FROM json_each(?))
			ORDER BY a.item_id, a.label_id`)
			.bind(userId, JSON.stringify(ids)).all());
		return results;
	},

	async assertMessageLabel(db, userId, id) {
		validIds([id], 1);
		const row = await withLabels(db, db => db.prepare("SELECT label_id FROM mail_label WHERE user_id = ? AND label_id = ? AND kind = 'message'")
			.bind(userId, id).first());
		if (!row) fail('labelNotFound', 404);
	},

	async assign(db, userId, data) {
		const { kind, itemIds, add = [], remove = [] } = data ?? {};
		if (!kinds.has(kind)) fail();
		const items = validIds(itemIds, 1);
		const additions = validIds(add);
		const removals = validIds(remove);
		if (additions.some(id => removals.includes(id))) fail();
		const labelIds = [...additions, ...removals];
		if (!labelIds.length) return;
		const itemSql = `${kind === 'message' ? messageItems : mailboxItems} AND ${kind === 'message' ? 'email.email_id' : 'account_id'} IN (SELECT value FROM json_each(?))`;
		const labelSql = 'SELECT label_id FROM mail_label WHERE user_id = ? AND kind = ? AND label_id IN (SELECT value FROM json_each(?))';
		const encodedItems = JSON.stringify(items);
		return withLabels(db, async db => {
			const [{ results: matchedItems }, { results: matchedLabels }] = await db.batch([
				db.prepare(itemSql).bind(userId, encodedItems),
				db.prepare(labelSql).bind(userId, kind, JSON.stringify(labelIds)),
			]);
			if (matchedItems.length !== items.length || matchedLabels.length !== labelIds.length) fail('labelNotFound', 404);
			await db.batch([
				db.prepare(`INSERT OR IGNORE INTO mail_label_assignment (label_id, item_id)
					SELECT label_id, item_id FROM (${labelSql}) CROSS JOIN (${itemSql})`)
					.bind(userId, kind, JSON.stringify(additions), userId, encodedItems),
				db.prepare(`DELETE FROM mail_label_assignment WHERE label_id IN (${labelSql}) AND item_id IN (${itemSql})`)
					.bind(userId, kind, JSON.stringify(removals), userId, encodedItems),
			]);
		});
	},
};
