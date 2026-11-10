import app from '../hono/hono';
import emailService from '../service/email-service';
import mailWorkspaceService from '../service/mail-workspace-service';
import result from '../model/result';

app.get('/allEmail/list', async (c) => {
	const data = await emailService.allList(c, c.req.query());
	return c.json(result.ok(data));
})

app.get('/allEmail/detail', async (c) => {
	const email = await emailService.allEmailDetail(c, c.req.query());
	if (email) {
		const personal = await mailWorkspaceService.personalActions(c, email, c.get('user').userId);
		if (personal) {
			email.personalFolder = personal.folder;
			email.isStar = personal.isStar;
		}
	}
	return c.json(result.ok(email));
})

app.delete('/allEmail/delete', async (c) => {
	const list = await emailService.physicsDelete(c, c.req.query());
	return c.json(result.ok(list));
})

app.delete('/allEmail/batchDelete', async (c) => {
	await emailService.batchDelete(c, c.req.query());
	return c.json(result.ok());
})

app.get('/allEmail/latest', async (c) => {
	const list = await emailService.allEmailLatest(c, c.req.query());
	return c.json(result.ok(list));
})
