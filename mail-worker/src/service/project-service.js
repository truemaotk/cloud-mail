export const repository = 'truemaotk/cloud-mail'
export const version = '0.1.0'
const supportBranch = 'project-support'
const supportFile = `/repos/${repository}/contents/project-support.json`
const channels = ['wechat', 'feishu', 'whatsapp', 'blog']
const icons = new Set([...channels, 'link', 'mail'])
const defaultContacts = {
	wechat: { value: 'moyiwp' },
	feishu: {
		value: '+86 13281179317',
		link: 'https://www.feishu.cn/invitation/page/add_contact/?token=be3j4583-c028-4315-91ae-fa3a7016178f&unique_id=KeEqbBAQG7QMdXBEVvPpxQ==',
	},
	whatsapp: { value: '+86 17740878774' },
	blog: { value: 'https://www.maotk.com/' },
}
const versionPattern = /^v?(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/
const shaPattern = /^[a-f0-9]{40}$/

async function github(path, { token, method = 'GET', body } = {}) {
	const headers = {
		Accept: 'application/vnd.github+json',
		'X-GitHub-Api-Version': '2026-03-10',
		'User-Agent': 'mail-project',
	}
	if (token) headers.Authorization = `Bearer ${token}`
	if (body) headers['Content-Type'] = 'application/json'
	return fetch(`https://api.github.com${path}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
		redirect: 'manual',
		signal: AbortSignal.timeout(8000),
	})
}

function httpsUrl(value) {
	const url = new URL(value)
	if (url.protocol !== 'https:' || !url.hostname || url.username || url.password) {
		throw new Error('invalid-contact')
	}
	return url.href
}

export function normalizeContacts(input = defaultContacts) {
	if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid-contact')
	return Object.fromEntries(channels.map(channel => {
		const contact = input[channel] ?? {}
		if (typeof contact !== 'object' || Array.isArray(contact)) throw new Error('invalid-contact')
		const { value = '', link = '', icon = channel } = contact
		if (typeof value !== 'string' || value.length > 320 || !icons.has(icon)
			|| typeof link !== 'string' || link.length > 500 || (link && channel !== 'feishu')) {
			throw new Error('invalid-contact')
		}
		const text = value.trim()
		const invitation = link.trim()
		let url = ''
		if (/^https:/i.test(text)) {
			url = httpsUrl(text)
		} else if (text && channel === 'whatsapp') {
			const number = text.replace(/[\s()-]/g, '')
			if (!/^\+[1-9]\d{6,14}$/.test(number)) throw new Error('invalid-contact')
			url = `https://wa.me/${number.slice(1)}`
		} else if (text && (channel === 'blog' || /^[a-z][\w+.-]*:/i.test(text))) {
			throw new Error('invalid-contact')
		}
		return [channel, { value: text, icon, link: invitation, url: invitation ? httpsUrl(invitation) : url }]
	}))
}

export async function canEditSupport(env, email) {
	const token = env.MAIL_SUPPORT_GITHUB_TOKEN
	if (!token || !email || email !== env.admin || email !== env.MAIL_SUPPORT_OWNER_EMAIL) return false
	const user = await github('/user', { token })
	return user.ok && (await user.json()).id === 285722865
}

export async function readSupport(token) {
	const response = await github(`${supportFile}?ref=${supportBranch}`, { token })
	if (response.status === 404) return { contacts: normalizeContacts(), revision: null }
	if (!response.ok) throw new Error('support-unavailable')
	const file = await response.json()
	if (file.encoding !== 'base64' || !shaPattern.test(file.sha) || file.size > 8192) {
		throw new Error('support-unavailable')
	}
	const json = new TextDecoder().decode(Uint8Array.from(atob(file.content), c => c.charCodeAt(0)))
	return { contacts: normalizeContacts(JSON.parse(json)), revision: file.sha }
}

export async function saveSupport(token, contacts, revision) {
	const before = await readSupport(token)
	if (before.revision !== revision) return { status: 'conflict' }
	const record = Object.fromEntries(channels.map(key => {
		const { value, icon, link } = contacts[key]
		return [key, { value, icon, ...(link ? { link } : {}) }]
	}))
	const json = new TextEncoder().encode(JSON.stringify(record, null, 2) + '\n')
	const response = await github(supportFile, {
		token,
		method: 'PUT',
		body: {
			message: 'Update public project contacts',
			branch: supportBranch,
			content: btoa(String.fromCharCode(...json)),
			...(revision ? { sha: revision } : {}),
		},
	})
	if (response.status === 404 || response.status === 422) return { status: 'setup' }
	if (response.status === 409) return { status: 'conflict' }
	if (!response.ok) return { status: 'unavailable' }
	return { status: 'saved', contacts, revision: (await response.json()).content.sha }
}

function compareVersion(tag) {
	const next = tag.match(versionPattern).slice(1).map(Number)
	const current = version.split('.').map(Number)
	for (let part = 0; part < current.length; part++) {
		if (next[part] !== current[part]) return next[part] - current[part]
	}
	return 0
}

export async function checkRelease() {
	const response = await github(`/repos/${repository}/releases/latest`)
	if (response.status === 404) return { status: 'unpublished' }
	if (!response.ok) return { status: 'unavailable' }
	const release = await response.json()
	if (release.draft || release.prerelease || !versionPattern.test(release.tag_name)) {
		return { status: 'unavailable' }
	}
	return {
		status: compareVersion(release.tag_name) > 0 ? 'available' : 'current',
		tag: release.tag_name,
	}
}

function updateTarget(env) {
	const { MAIL_UPDATE_REPOSITORY: repo, MAIL_UPDATE_BRANCH: branch, MAIL_UPDATE_GITHUB_TOKEN: token } = env
	if (!repo || !/^[a-z0-9][a-z0-9-]*\/[\w.-]+$/i.test(repo) || !branch || !token) return null
	const safeSegment = segment => /^[\w.-]+$/.test(segment) && segment !== '.' && segment !== '..'
	if (!safeSegment(repo.split('/')[1]) || !branch.split('/').every(safeSegment)) return null
	if ([repository, 'maillab/cloud-mail'].includes(repo.toLowerCase())) return null
	return { repo, branch, token }
}

export function canApplyRelease(env, email) {
	return Boolean(email && email === env.admin && updateTarget(env))
}

export async function applyRelease(env, tag) {
	const release = await checkRelease()
	if (release.status !== 'available' || release.tag !== tag) return { status: 'stale' }
	const { repo, branch, token } = updateTarget(env)
	const target = await github(`/repos/${repo}`, { token })
	if (!target.ok) return { status: 'unavailable' }
	const metadata = await target.json()
	if (!metadata.fork || metadata.full_name.toLowerCase() !== repo.toLowerCase() ||
		metadata.source?.full_name?.toLowerCase() !== 'maillab/cloud-mail') return { status: 'forbidden' }

	const commit = await github(`/repos/${repository}/commits/${encodeURIComponent(release.tag)}`)
	if (!commit.ok) return { status: 'unavailable' }
	const { sha } = await commit.json()
	if (!shaPattern.test(sha)) return { status: 'unavailable' }

	const ref = branch.split('/').map(encodeURIComponent).join('/')
	const response = await github(`/repos/${repo}/git/refs/heads/${ref}`, {
		token,
		method: 'PATCH',
		body: { sha, force: false },
	})
	if (response.ok) return { status: 'queued' }
	return { status: [409, 422].includes(response.status) ? 'manual' : 'unavailable' }
}
