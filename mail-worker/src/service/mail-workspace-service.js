import { and, desc, eq, gt, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { emailConst, isDel } from '../const/entity-const';
import account from '../entity/account';
import email from '../entity/email';
import orm from '../entity/orm';
import { star } from '../entity/star';
import { ensureMailboxMessageState, inNormalFolder, mailboxMessageState as state } from '../entity/mailbox-message-state';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';
import { emailBriefColumns, emailListColumns } from '../lib/email-list-columns';
import emailService from './email-service';
import attService from './att-service';
import starService from './star-service';
import labels, { messageHasLabel } from './label-service';

const folders = new Set(['inbox', 'starred', 'snoozed', 'sent', 'archived', 'spam', 'trash']);
const placements = new Set(['archived', 'spam', 'snoozed']);

function fail(key, code = 400) {
	throw new BizError(t(key), code);
}

function messageIds(value) {
	if (!Array.isArray(value) || value.length < 1 || value.length > 50 ||
		value.some(id => !Number.isSafeInteger(id) || id < 1)) {
		fail('workspaceInvalidAction');
	}
	return [...new Set(value)];
}

function ownedMail(c, userId, ids, deleted) {
	const activeAccounts = orm(c).select({ id: account.accountId }).from(account)
		.where(and(eq(account.userId, userId), eq(account.isDel, isDel.NORMAL)));
	return and(eq(email.userId, userId), inArray(email.accountId, activeAccounts),
		eq(email.isDel, deleted ? isDel.DELETE : isDel.NORMAL), inArray(email.emailId, ids));
}

function withMailRelations(query) {
	return query.from(email)
		.innerJoin(account, eq(account.accountId, email.accountId))
		.leftJoin(state, eq(state.emailId, email.emailId));
}

function starredBy(userId) {
	return sql`EXISTS (SELECT 1 FROM ${star}
		WHERE ${star.emailId} = ${email.emailId} AND ${star.userId} = ${userId})`;
}

function folderCondition(folder, now, userId) {
	switch (folder) {
		case 'inbox':
		case 'sent':
			return inNormalFolder(now);
		case 'starred':
			return and(starredBy(userId), or(isNull(state.folder), ne(state.folder, 'spam')));
		case 'snoozed':
			return and(eq(state.folder, folder), gt(state.snoozedUntil, now));
		case 'archived':
		case 'spam':
			return eq(state.folder, folder);
	}
}

async function mailboxScope(c, params, userId) {
	if (!folders.has(params.folder)) fail('workspaceInvalidAction');
	const accountId = Number(params.accountId);
	const selected = await orm(c).select({ allReceive: account.allReceive }).from(account)
		.where(and(eq(account.accountId, accountId), eq(account.userId, userId), eq(account.isDel, isDel.NORMAL))).get();
	if (!selected) fail('workspaceMissingMailbox', 404);
	return { accountId, allReceive: selected.allReceive };
}

function filtersFor(params, scope, userId, now) {
	const { folder } = params;
	const type = params.labelId ? undefined : folder === 'inbox' ? emailConst.type.RECEIVE : folder === 'sent' ? emailConst.type.SEND : undefined;
	return and(
		...emailService.emailListFilters({
			...scope, userId, type, deleted: folder === 'trash', withCursor: false,
			text: params.text, searchType: params.searchType, startDate: params.startDate, endDate: params.endDate,
		}),
		params.labelId ? and(messageHasLabel(userId, params.labelId), or(isNull(state.folder), ne(state.folder, 'spam')))
			: folderCondition(folder, now, userId),
		params.unread === '1' ? eq(email.unread, emailConst.unread.UNREAD) : undefined
	);
}

async function listLabelId(c, params, userId) {
	if (params.labelId === undefined) return null;
	if (params.folder !== 'inbox') fail('workspaceInvalidAction');
	const labelId = Number(params.labelId);
	await labels.assertMessageLabel(c.env.db, userId, labelId);
	return labelId;
}

async function addLabels(c, userId, rows) {
	const assignments = await labels.messageAssignments(c.env.db, userId, rows.map(row => row.emailId));
	for (const row of rows) row.labelIds = [];
	const byId = new Map(rows.map(row => [row.emailId, row]));
	for (const { itemId, labelId } of assignments) byId.get(itemId)?.labelIds.push(labelId);
}

function statusColumns(userId) {
	return { isStar: starredBy(userId).as('isStar'), snoozedUntil: state.snoozedUntil };
}

export default {
	async list(c, params, userId) {
		await ensureMailboxMessageState(c.env.db);
		const scope = await mailboxScope(c, params, userId);
		const now = Date.now();
		const labelId = await listLabelId(c, params, userId);
		const where = filtersFor({ ...params, labelId }, scope, userId, now);
		const size = Math.min(50, Math.max(1, Math.trunc(Number(params.size) || 25)));
		const offset = Math.max(0, Math.min(1_000_000, Math.trunc(Number(params.offset) || 0)));
		const db = orm(c);
		const [list, result, next] = await Promise.all([
			withMailRelations(db.select({ ...emailBriefColumns, ...statusColumns(userId) }))
				.where(where).orderBy(desc(email.emailId)).limit(size).offset(offset).all(),
			withMailRelations(db.select({ total: sql`count(*)`.mapWith(Number) })).where(where).get(),
			withMailRelations(db.select({ next: sql`min(${state.snoozedUntil})`.mapWith(Number) }))
				.where(filtersFor({ folder: 'snoozed' }, scope, userId, now)).get(),
		]);
		await addLabels(c, userId, list);
		return { list: emailService.applyListText(list), total: result.total, nextSnoozeAt: next.next };
	},

	async detail(c, params, userId) {
		await ensureMailboxMessageState(c.env.db);
		const [emailId] = messageIds([Number(params.emailId)]);
		const scope = await mailboxScope(c, params, userId);
		const labelId = await listLabelId(c, params, userId);
		const row = await withMailRelations(orm(c).select({ ...emailListColumns, ...statusColumns(userId) }))
			.where(and(eq(email.emailId, emailId), filtersFor({ folder: params.folder, labelId }, scope, userId, Date.now()))).get();
		if (!row) fail('workspaceMissingMessage', 404);
		await emailService.emailAddAtt(c, [row]);
		await addLabels(c, userId, [row]);
		return row;
	},

	async personalActions(c, message, userId) {
		if (message.userId !== userId || message.isDel !== isDel.NORMAL ||
			message.status === emailConst.status.SAVING || message.status === emailConst.status.NOONE) return null;
		await ensureMailboxMessageState(c.env.db);
		const row = await withMailRelations(orm(c).select({ folder: state.folder, ...statusColumns(userId) }))
			.where(ownedMail(c, userId, [message.emailId], false)).get();
		if (!row) return null;
		const folder = row.folder && (row.folder !== 'snoozed' || row.snoozedUntil > Date.now())
			? row.folder : message.type === emailConst.type.SEND ? 'sent' : 'inbox';
		return { folder, isStar: row.isStar };
	},

	async move(c, params, userId) {
		const ids = messageIds(params.emailIds);
		const { action, until } = params;
		if (!placements.has(action) && action !== 'inbox') fail('workspaceInvalidAction');
		if (action === 'snoozed' && (!Number.isSafeInteger(until) || until <= Date.now())) fail('workspaceInvalidTime');
		await ensureMailboxMessageState(c.env.db);

		const db = orm(c);
		const where = ownedMail(c, userId, ids, false);
		if (action === 'inbox') {
			const source = db.select({ emailId: email.emailId }).from(email).where(where);
			await db.delete(state).where(inArray(state.emailId, source)).run();
			return;
		}
		const source = db.select({
			emailId: email.emailId, folder: sql`${action}`,
			snoozedUntil: sql`${action === 'snoozed' ? until : null}`,
		}).from(email).where(and(where, eq(email.type, emailConst.type.RECEIVE)));
		await db.insert(state).select(source).onConflictDoUpdate({
			target: state.emailId,
			set: { folder: action, snoozedUntil: action === 'snoozed' ? until : null },
		}).run();
	},

	async trash(c, params, userId) {
		const ids = messageIds(params.emailIds);
		const { action } = params;
		const db = orm(c);
		const condition = ownedMail(c, userId, ids, action !== 'trash');
		if (action === 'purge') {
			const removed = await db.delete(email).where(condition).returning({ id: email.emailId }).all();
			if (!removed.length) return;
			const removedIds = removed.map(row => row.id);
			await Promise.all([attService.removeByEmailIds(c, removedIds), starService.removeByEmailIds(c, removedIds)]);
			return;
		}
		if (action !== 'trash' && action !== 'restore') fail('workspaceInvalidAction');
		await db.update(email).set({ isDel: action === 'trash' ? isDel.DELETE : isDel.NORMAL }).where(condition).run();
	},
};
