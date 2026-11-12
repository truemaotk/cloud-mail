import app from '../hono/hono';
import analysisService from '../service/analysis-service';
import result from '../model/result';
import dailySendQuota from '../service/daily-send-quota';

app.get('/analysis/echarts', async (c) => {
	const [data, quota] = await Promise.all([
		analysisService.echarts(c, c.req.query()),
		dailySendQuota.get(c.env),
	]);
	return c.json(result.ok({ ...data, ...quota }));
})
