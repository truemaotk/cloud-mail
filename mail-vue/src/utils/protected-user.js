// 与服务端规则一致：邮箱前缀以 admin 开头的用户不能被删除
export function isProtectedUser(email) {
  return String(email || '').trim().split('@')[0].toLowerCase().startsWith('admin')
}
