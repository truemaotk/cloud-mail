import { createExecutionContext, env, fetchMock, waitOnExecutionContext } from 'cloudflare:test';
import { afterEach, beforeEach, expect, it } from 'vitest';
import worker from '../src/index.js';


const base = 'http://notify.test';
const email = 'admin@notify.test';
const password = 'FakeDiagnosticsPassword';
const feishu = { host: 'https://open.feishu.cn', path: '/open-apis/bot/v2/hook/fake-local-diagnostic' };
const wecom = { host: 'https://qyapi.weixin.qq.com', path: '/cgi-bin/webhook/send?key=fake-local-diagnostic' };
const channels = { feishu, wecom };

function request(path, { method = 'GET', body, token } = {}) {
  const headers = { 'accept-language': 'en' };
  if (token) headers.authorization = token;
  if (body) headers['content-type'] = 'application/json';
  const ctx = createExecutionContext();
  return worker.fetch(new Request(base + '/api/' + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  }), env, ctx);
}

async function json(path, options) {
  return (await request(path, options)).json();
}

async function seedAdmin() {
  expect(await (await request('init/' + env.jwt_secret)).text()).toBe('success');
  expect((await json('register', { method: 'POST', body: { email, password } })).code).toBe(200);
  const login = await json('login', { method: 'POST', body: { email, password } });
  expect(login.code).toBe(200);
  return login.data.token;
}

async function save(channel, token, enabled) {
  const { host, path } = channels[channel];
  return json('setting/chatBots/save/' + channel, {
    token, method: 'PUT',
    body: { url: host + path, enabled, ...(channel === 'feishu' ? { secret: 'fake-signing-key' } : {}) },
  });
}

function intercept(channel, text, code = 0) {
  const { host, path } = channels[channel];
  fetchMock.get(host).intercept({
    path, method: 'POST',
    body: raw => {
      const payload = JSON.parse(raw);
      return channel === 'feishu'
        ? payload.msg_type === 'text' && payload.content.text.includes(text) && !!payload.timestamp && !!payload.sign
        : payload.msgtype === 'text' && payload.text.content.includes(text);
    },
  }).reply(200, JSON.stringify(channel === 'feishu' ? { code } : { errcode: code }));
}

async function receive(subject) {
  const from = 'sender@notify.test';
  const body = [
    'From: Sender <' + from + '>',
    'To: Admin <' + email + '>',
    'Subject: ' + subject,
    'Message-ID: <' + crypto.randomUUID() + '@notify.test>',
    'Content-Type: text/plain; charset=utf-8', '', 'Synthetic test body',
  ].join('\r\n');
  const ctx = createExecutionContext();
  const raw = new Response(body).body;
  await worker.email({
    from, to: email, raw,
    setReject(reason) { throw new Error('Unexpected rejection: ' + reason); },
  }, env, ctx);
  await waitOnExecutionContext(ctx);
  expect((await env.db.prepare('SELECT subject FROM email WHERE subject = ?').bind(subject).first())?.subject).toBe(subject);
}

beforeEach(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});
afterEach(() => fetchMock.deactivate());

it('upgrades old D1 tables through the settings API without resetting users or requiring reinitialization', async () => {
  const token = await seedAdmin();
  await env.db.batch([
    env.db.prepare('DROP TABLE chat_bot_delivery'),
    env.db.prepare('DROP TABLE chat_bot'),
  ]);
  expect((await json('my/loginUserInfo', { token })).data.email).toBe(email);
  expect(await json('setting/chatBots/status', { token })).toMatchObject({ code: 200, data: {} });
  for (const channel of Object.keys(channels)) {
    expect((await save(channel, token, true)).data[channel]).toMatchObject({ configured: 1, enabled: 1 });
  }
  expect((await json('my/loginUserInfo', { token })).data.email).toBe(email);
});
it('saves and enables both bots and distinguishes a manual test from a new-mail notification', async () => {
  const token = await seedAdmin();
  expect(await json('setting/chatBots/status', { token })).toMatchObject({ code: 200, data: {} });
  for (const channel of Object.keys(channels)) {
    expect((await save(channel, token, false)).data[channel]).toMatchObject({ configured: 1, enabled: 0 });
    intercept(channel, 'notification test');
    expect((await json('setting/chatBots/test/' + channel, { token, method: 'POST' })).code).toBe(200);
    expect((await json('setting/chatBots/save/' + channel, { token, method: 'PUT', body: { enabled: true } })).data[channel])
      .toMatchObject({ configured: 1, enabled: 1 });
  }
  fetchMock.assertNoPendingInterceptors();

  expect((await json('setting/set', { token, method: 'PUT', body: { ruleType: 1, ruleEmail: 'other@notify.test' } })).code).toBe(200);
  await receive('Saved but excluded by forwarding rule');
  expect(await env.db.prepare('SELECT COUNT(*) AS n FROM chat_bot_delivery').first('n')).toBe(0);
  expect((await json('setting/set', { token, method: 'PUT', body: { ruleType: 1, ruleEmail: email } })).code).toBe(200);
  for (const channel of Object.keys(channels)) intercept(channel, 'Synthetic test body');
  await receive('Matched by forwarding rule');
  fetchMock.assertNoPendingInterceptors();
  expect(await env.db.prepare('SELECT COUNT(*) AS n FROM chat_bot_delivery').first('n')).toBe(0);
});

it('surfaces a mocked Feishu signature rejection and WeCom rate limit instead of reporting success', async () => {
  const token = await seedAdmin();
  const codes = { feishu: 19021, wecom: 45009 };
  for (const channel of Object.keys(channels)) {
    expect((await save(channel, token, true)).code).toBe(200);
    intercept(channel, 'notification test', codes[channel]);
    const result = await json('setting/chatBots/test/' + channel, { token, method: 'POST' });
    expect(result.code).not.toBe(200);
    expect(result.message).toContain(String(codes[channel]));
  }
  fetchMock.assertNoPendingInterceptors();
});
it('retries queued new-mail notifications through the Worker scheduled entrypoint', async () => {
  const token = await seedAdmin();
  for (const channel of Object.keys(channels)) {
    expect((await save(channel, token, true)).code).toBe(200);
    intercept(channel, 'Synthetic test body', channel === 'feishu' ? 19021 : 45009);
  }
  await receive('Queued body preview');
  expect(await env.db.prepare('SELECT COUNT(*) AS n FROM chat_bot_delivery WHERE attempts = 1').first('n')).toBe(2);
  await env.db.prepare('UPDATE chat_bot_delivery SET due_at = 0').run();
  for (const channel of Object.keys(channels)) intercept(channel, 'Synthetic test body');
  const ctx = createExecutionContext();
  await worker.scheduled({ cron: '* * * * *' }, env, ctx);
  await waitOnExecutionContext(ctx);
  expect(await env.db.prepare('SELECT COUNT(*) AS n FROM chat_bot_delivery').first('n')).toBe(0);
  fetchMock.assertNoPendingInterceptors();
});
