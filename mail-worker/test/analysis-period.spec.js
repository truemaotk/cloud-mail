import { createExecutionContext, env } from 'cloudflare:test';
import { expect, it } from 'vitest';
import worker from '../src/index.js';
import analysisService, { daysForPeriod } from '../src/service/analysis-service.js';
import { toUtc } from '../src/utils/date-uitil.js';

it('uses Monday starts, includes today, and resolves each local day across a clock change', () => {
	const now = toUtc('2024-03-12T03:00:00Z'); // Monday 23:00 in New York
	const zone = 'America/New_York';
	expect(daysForPeriod('thisWeek', zone, now)).toEqual([
		['2024-03-11', '2024-03-11 04:00:00', '2024-03-12 04:00:00'],
	]);
	const lastWeek = daysForPeriod('lastWeek', zone, now);
	expect(lastWeek).toHaveLength(7);
	expect(lastWeek.at(-1)).toEqual(['2024-03-10', '2024-03-10 05:00:00', '2024-03-11 04:00:00']);
	expect(daysForPeriod('thisMonth', zone, now)).toHaveLength(11);
	expect(daysForPeriod('lastMonth', zone, now)).toHaveLength(29);
});

it('counts database records at local date boundaries for both charts and fills genuinely empty days with zero', async () => {
	const init = await worker.fetch(new Request(`http://notify.test/api/init/${env.jwt_secret}`), env, createExecutionContext());
	expect(await init.text()).toBe('success');
	const user = env.db.prepare("INSERT INTO user (email, password, salt, create_time) VALUES (?, '', '', ?)");
	const mail = env.db.prepare('INSERT INTO email (account_id, user_id, type, create_time) VALUES (1, 1, ?, ?)');
	await env.db.batch([
		user.bind('outside@notify.test', '2024-02-28 15:59:59'),
		user.bind('inside@notify.test', '2024-02-28 16:00:00'),
		mail.bind(0, '2024-02-29 15:59:59'),
		mail.bind(1, '2024-02-29 16:00:00'),
		mail.bind(1, '2024-03-01 16:00:00'),
	]);
	const data = await analysisService.echarts({ env }, {
		timeZone: 'Asia/Shanghai', startDate: '2024-02-29', endDate: '2024-03-01',
	});
	const counts = (first, second) => [{ date: '2024-02-29', total: first }, { date: '2024-03-01', total: second }];
	expect(data.userDayCount).toEqual(counts(1, 0));
	expect(data.emailDayCount.receiveDayCount).toEqual(counts(1, 0));
	expect(data.emailDayCount.sendDayCount).toEqual(counts(0, 1));
});
