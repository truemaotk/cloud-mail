import app from '../hono/hono';
import result from '../model/result';
import userContext from '../security/user-context';
import labels from '../service/label-service';

app.get('/labels', async c => c.json(result.ok(await labels.list(c.env.db, userContext.getUserId(c)))));

app.post('/labels', async c => c.json(result.ok(await labels.save(c.env.db, userContext.getUserId(c), await c.req.json()))));

app.put('/labels/assignments', async c => {
	await labels.assign(c.env.db, userContext.getUserId(c), await c.req.json());
	return c.json(result.ok());
});

app.put('/labels/:id', async c => c.json(result.ok(await labels.save(
	c.env.db, userContext.getUserId(c), await c.req.json(), Number(c.req.param('id')),
))));

app.delete('/labels/:id', async c => {
	await labels.remove(c.env.db, userContext.getUserId(c), Number(c.req.param('id')));
	return c.json(result.ok());
});
