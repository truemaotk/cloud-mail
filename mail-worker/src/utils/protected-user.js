/**
 * 受保护账号：邮箱前缀以 admin 开头（不区分大小写）的用户不能被删除。
 * 例如 admin@example.com、admin2@example.com、Administrator@example.com。
 */
export function isProtectedUserEmail(email) {
	const local = String(email || '').trim().split('@')[0].toLowerCase();
	return local.startsWith('admin');
}

export function protectedUserEmails(rows) {
	return (rows || []).map(row => row?.email).filter(isProtectedUserEmail);
}
