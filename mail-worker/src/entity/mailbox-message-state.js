import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import email from './email';

export const mailboxMessageState = sqliteTable('mailbox_message_state', {
	emailId: integer('email_id').primaryKey().references(() => email.emailId, { onDelete: 'cascade' }),
	folder: text('folder').notNull(),
	snoozedUntil: integer('snoozed_until'),
});

const ready = new WeakMap();
export function ensureMailboxMessageState(db) {
	if (!ready.has(db)) {
		const pending = db.prepare(`CREATE TABLE IF NOT EXISTS mailbox_message_state (
			email_id INTEGER PRIMARY KEY REFERENCES email(email_id) ON DELETE CASCADE,
			folder TEXT NOT NULL CHECK (folder IN ('archived', 'spam', 'snoozed')),
			snoozed_until INTEGER
		)`).run().catch(error => {
			ready.delete(db);
			throw error;
		});
		ready.set(db, pending);
	}
	return ready.get(db);
}

export function inNormalFolder(now = Date.now()) {
	return sql`(${mailboxMessageState.folder} IS NULL OR (
		${mailboxMessageState.folder} = 'snoozed' AND ${mailboxMessageState.snoozedUntil} <= ${now}
	))`;
}
