import app from '../hono/hono';
import result from '../model/result';
import settingService from '../service/setting-service';
import userContext from "../security/user-context";
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';
import chatBotService, { postBotMessage, validBotUrl, validChannel } from '../service/chat-bot-service';

app.put('/setting/set', async (c) => {
	await settingService.set(c, await c.req.json());
	return c.json(result.ok());
});

app.get('/setting/query', async (c) => {
	const setting = await settingService.get(c);
	return c.json(result.ok(setting));
});

app.get('/setting/websiteConfig', async (c) => {
	const setting = await settingService.websiteConfig(c);
	return c.json(result.ok(setting));
})

app.put('/setting/setBackground', async (c) => {
	const key = await settingService.setBackground(c, await c.req.json());
	return c.json(result.ok(key));
});

app.delete('/setting/deleteBackground', async (c) => {
	await settingService.deleteBackground(c);
	return c.json(result.ok());
});

app.put('/setting/setBlacklist', async (c) => {
	const setting = await settingService.setBlacklist(c, await c.req.json());
	return c.json(result.ok(setting));
})

app.get('/setting/chatBots/status', async (c) => {
	return c.json(result.ok(await chatBotService.status(c.env.db)));
});

app.put('/setting/chatBots/save/:channel', async (c) => {
	const channel = c.req.param('channel');
	const data = await c.req.json();
	if (!validChannel(channel) || typeof data?.enabled !== 'boolean'
		|| (data.url !== undefined && typeof data.url !== 'string')
		|| (data.secret !== undefined && (channel !== 'feishu' || typeof data.secret !== 'string'))) {
		throw new BizError(t('chatBotInvalid'));
	}
	const previous = await chatBotService.get(c.env.db, channel);
	const url = data.url?.trim() ?? previous?.url ?? '';
	const savedSecret = previous?.url === url ? previous.secret : '';
	const secret = url ? data.secret?.trim() ?? savedSecret : '';
	if (url.length > 1024 || secret.length > 256 || (url && !validBotUrl(channel, url)) || (data.enabled && !url)) {
		throw new BizError(t('chatBotInvalid'));
	}
	await chatBotService.save(c.env.db, channel, { url, secret, enabled: data.enabled }, previous);
	return c.json(result.ok(await chatBotService.status(c.env.db)));
});

app.post('/setting/chatBots/test/:channel', async (c) => {
	const channel = c.req.param('channel');
	if (!validChannel(channel)) throw new BizError(t('chatBotInvalid'));
	const bot = await chatBotService.get(c.env.db, channel);
	if (!bot?.url) throw new BizError(t('chatBotInvalid'));
	try {
		await postBotMessage(bot, t('chatBotTestMessage'));
	} catch (error) {
		if (error.message === 'network') throw new BizError(t('chatBotTestNetwork'));
		if (error.message === 'timeout') throw new BizError(t('chatBotTestTimeout'));
		throw new BizError(t('chatBotTestFailed', { code: error.message }));
	}
	return c.json(result.ok());
});

app.post('/setting/chatBots/retry/:channel', async (c) => {
	const channel = c.req.param('channel');
	if (!validChannel(channel) || !(await chatBotService.get(c.env.db, channel))?.enabled) {
		throw new BizError(t('chatBotInvalid'));
	}
	await chatBotService.retryFailed(c.env.db, channel);
	c.executionCtx.waitUntil(chatBotService.deliverDue(c.env.db, 4).catch(() => console.error('Chat bot delivery queue failed')));
	return c.json(result.ok(await chatBotService.status(c.env.db)));
});

