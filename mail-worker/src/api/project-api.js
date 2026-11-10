import app from '../hono/hono'
import result from '../model/result'
import userContext from '../security/user-context'
import {
	applyRelease, canApplyRelease, canEditSupport, checkRelease, normalizeContacts,
	readSupport, repository, saveSupport, version,
} from '../service/project-service'

app.get('/project/info', async c => {
	const { email } = userContext.getUser(c)
	const canEdit = await canEditSupport(c.env, email).catch(() => false)
	const support = await readSupport(canEdit ? c.env.MAIL_SUPPORT_GITHUB_TOKEN : undefined)
		.catch(() => ({ contacts: normalizeContacts(), revision: null, unavailable: true }))
	return c.json(result.ok({
		...support,
		repository,
		version,
		canEdit,
		canUpdate: canApplyRelease(c.env, email),
	}))
})

app.put('/project/support', async c => {
	if (!await canEditSupport(c.env, userContext.getUser(c).email).catch(() => false)) {
		return c.json(result.fail('Forbidden', 403))
	}
	let contacts, revision
	try {
		const body = await c.req.json()
		revision = body.revision
		if (!body.contacts || (revision !== null && !/^[a-f0-9]{40}$/.test(revision))) {
			return c.json(result.ok({ status: 'invalid' }))
		}
		contacts = normalizeContacts(body.contacts)
	} catch {
		return c.json(result.ok({ status: 'invalid' }))
	}
	const saved = await saveSupport(c.env.MAIL_SUPPORT_GITHUB_TOKEN, contacts, revision)
		.catch(() => ({ status: 'unavailable' }))
	return c.json(result.ok(saved))
})

app.get('/project/update', async c => {
	const latest = await checkRelease().catch(() => ({ status: 'unavailable' }))
	return c.json(result.ok(latest))
})

app.post('/project/update', async c => {
	if (!canApplyRelease(c.env, userContext.getUser(c).email)) {
		return c.json(result.fail('Forbidden', 403))
	}
	const { tag } = await c.req.json().catch(() => ({})) ?? {}
	const update = await applyRelease(c.env, tag).catch(() => ({ status: 'unavailable' }))
	return c.json(result.ok(update))
})
