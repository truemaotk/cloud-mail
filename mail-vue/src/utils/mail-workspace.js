export const mailFolders = [
  { path: 'inbox', name: 'email', label: 'inbox', icon: 'inbox' },
  { path: 'starred', name: 'star', label: 'starred', icon: 'star' },
  { path: 'snoozed', name: 'snoozed', label: 'mailSnoozed', icon: 'mail-delay' },
  { path: 'sent', name: 'send', label: 'sent', icon: 'send', permission: 'email:send' },
  { path: 'drafts', name: 'draft', label: 'drafts', icon: 'draft', permission: 'email:send' },
  { path: 'archived', name: 'archived', label: 'mailArchived', icon: 'archive' },
  { path: 'spam', name: 'spam', label: 'mailSpam', icon: 'spam' },
  { path: 'trash', name: 'trash', label: 'mailTrash', icon: 'delete' },
]

export const allMailFolder = { path: 'all-mail', name: 'all-email', label: 'allMail', icon: 'list' }
export const workspaceFolders = [...mailFolders, allMailFolder]

export function workspaceFolder(route) {
  return route.meta.workspace || (route.name === 'content'
    ? workspaceFolders.find(folder => folder.path === route.params.mailbox)?.path : '')
}
