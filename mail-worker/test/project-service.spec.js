import { fetchMock } from 'cloudflare:test'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
	applyRelease, canApplyRelease, canEditSupport, normalizeContacts, saveSupport,
} from '../src/service/project-service.js'

const owner = 'owner@example.test'
const editorEnv = {
	admin: owner,
	MAIL_SUPPORT_OWNER_EMAIL: owner,
	MAIL_SUPPORT_GITHUB_TOKEN: 'test-owner-token',
}
const updaterEnv = {
	admin: 'admin@example.test',
	MAIL_UPDATE_REPOSITORY: 'customer/cloud-mail',
	MAIL_UPDATE_BRANCH: 'release/mail',
	MAIL_UPDATE_GITHUB_TOKEN: 'test-customer-token',
}
const supportPath = '/repos/truemaotk/cloud-mail/contents/project-support.json'
const releasePath = '/repos/truemaotk/cloud-mail/releases/latest'
const sha = 'a'.repeat(40)

describe('project support and updates', () => {
	let github
	beforeEach(() => {
		fetchMock.activate()
		fetchMock.disableNetConnect()
		github = fetchMock.get('https://api.github.com')
	})
	afterEach(() => {
		try {
			fetchMock.assertNoPendingInterceptors()
		} finally {
			fetchMock.deactivate()
		}
	})

	it('requires the configured mailbox owner and the official GitHub identity to edit', async () => {
		expect(await canEditSupport({ admin: owner }, owner)).toBe(false)
		expect(await canEditSupport(editorEnv, 'customer@example.test')).toBe(false)
		github.intercept({ path: '/user', headers: { authorization: 'Bearer test-owner-token' } })
			.reply(200, JSON.stringify({ id: 42 }))
		expect(await canEditSupport(editorEnv, owner)).toBe(false)
		github.intercept({ path: '/user', headers: { authorization: 'Bearer test-owner-token' } })
			.reply(200, JSON.stringify({ id: 285722865 }))
		expect(await canEditSupport(editorEnv, owner)).toBe(true)
	})

	it('allows safe contact links and prevents overwriting a changed revision', async () => {
		expect(() => normalizeContacts({ blog: { value: 'javascript:alert(1)' } })).toThrow()
		expect(() => normalizeContacts({ wechat: { value: 'example', icon: '<svg>' } })).toThrow()
		const contacts = normalizeContacts({ whatsapp: { value: '+86 12345678901' } })
		expect(contacts.whatsapp.url).toBe('https://wa.me/8612345678901')
		github.intercept({ path: supportPath + '?ref=project-support' }).reply(200,
			JSON.stringify({ encoding: 'base64', sha, size: 2, content: btoa('{}') }))
		expect(await saveSupport('test-owner-token', contacts, null)).toEqual({ status: 'conflict' })
	})

	it('publishes contact values and icon choices on the separate support branch', async () => {
		const invitation = 'https://www.feishu.cn/invitation/page/add_contact/?token=sample&unique_id=test'
		const contacts = normalizeContacts({
			wechat: { value: 'example', icon: 'link' },
			feishu: { value: '+86 12345678901', link: invitation },
		})
		expect(contacts.feishu).toMatchObject({ value: '+86 12345678901', url: invitation })
		github.intercept({ path: supportPath + '?ref=project-support' }).reply(404)
		github.intercept({
			path: supportPath,
			method: 'PUT',
			body: raw => {
				const body = JSON.parse(raw)
				const stored = JSON.parse(atob(body.content))
				return body.branch === 'project-support' && stored.wechat.value === 'example'
					&& stored.wechat.icon === 'link' && stored.feishu.link === invitation
			},
		}).reply(201, JSON.stringify({ content: { sha } }))
		expect(await saveSupport('test-owner-token', contacts, null)).toMatchObject({ status: 'saved', revision: sha })
	})

	it.each([[200, 'queued'], [422, 'manual']])('uses a verified release and a non-forced branch update when GitHub returns %s', async (status, expected) => {
		expect(canApplyRelease(updaterEnv, 'customer@example.test')).toBe(false)
		expect(canApplyRelease({ ...updaterEnv, MAIL_UPDATE_REPOSITORY: 'truemaotk/cloud-mail' }, updaterEnv.admin)).toBe(false)
		expect(canApplyRelease(updaterEnv, updaterEnv.admin)).toBe(true)
		github.intercept({ path: releasePath }).reply(200, JSON.stringify({ tag_name: 'v0.2.0' }))
		github.intercept({ path: '/repos/customer/cloud-mail' }).reply(200,
			JSON.stringify({ fork: true, full_name: 'customer/cloud-mail', source: { full_name: 'maillab/cloud-mail' } }))
		github.intercept({ path: '/repos/truemaotk/cloud-mail/commits/v0.2.0' }).reply(200, JSON.stringify({ sha }))
		github.intercept({
			path: '/repos/customer/cloud-mail/git/refs/heads/release/mail',
			method: 'PATCH',
			headers: { authorization: 'Bearer test-customer-token' },
			body: raw => {
				const ref = JSON.parse(raw)
				return ref.sha === sha && ref.force === false
			},
		}).reply(status)
		expect(await applyRelease(updaterEnv, 'v0.2.0')).toEqual({ status: expected })
	})
})
