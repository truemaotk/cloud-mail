import analysisDao from '../dao/analysis-dao';
import orm from '../entity/orm';
import email from '../entity/email';
import { desc, count, eq, and, ne, isNotNull } from 'drizzle-orm';
import { emailConst } from '../const/entity-const';
import kvConst from '../const/kv-const';
import dayjs from 'dayjs';
import { toUtc } from '../utils/date-uitil';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';

const overviewKey = kvConst.ANALYSIS_ECHARTS + 'overview';

function validTimeZone(timeZone) {
	try {
		return new Intl.DateTimeFormat('en', { timeZone: timeZone || 'UTC' }).resolvedOptions().timeZone;
	} catch {
		return 'UTC';
	}
}

export function daysForPeriod(period, timeZone, now = toUtc()) {
	// Resolve each local midnight separately so days with a clock change keep their true length.
	const today = toUtc(now.tz(timeZone).format('YYYY-MM-DD'));
	const monday = today.subtract((today.day() + 6) % 7, 'day');
	const monthStart = today.startOf('month');
	let start = monday;
	let end = today.add(1, 'day');
	if (period === 'lastWeek') {
		start = monday.subtract(7, 'day');
		end = monday;
	} else if (period === 'thisMonth') {
		start = monthStart;
	} else if (period === 'lastMonth') {
		start = monthStart.subtract(1, 'month');
		end = monthStart;
	}

	return calendarDays(start, end, timeZone);
}

function calendarDays(start, end, timeZone) {
	const localMidnight = date => dayjs.tz(date.format('YYYY-MM-DD'), timeZone).utc().format('YYYY-MM-DD HH:mm:ss');
	const days = [];
	let startUtc = localMidnight(start);
	for (let date = start; date.isBefore(end); date = date.add(1, 'day')) {
		const endUtc = localMidnight(date.add(1, 'day'));
		days.push([date.format('YYYY-MM-DD'), startUtc, endUtc]);
		startUtc = endUtc;
	}
	return days;
}

function customDays({ startDate, endDate }, timeZone) {
	if (startDate === undefined && endDate === undefined) return null;
	const isDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
		&& toUtc(value).format('YYYY-MM-DD') === value;
	if (!isDate(startDate) || !isDate(endDate) || startDate > endDate) {
		throw new BizError(t('analysisInvalidDates'), 400);
	}
	const start = toUtc(startDate);
	const end = toUtc(endDate).add(1, 'day');
	if (end.diff(start, 'day') > 366) throw new BizError(t('analysisDatesTooLong'), 400);
	return calendarDays(start, end, timeZone);
}

const analysisService = {
	async echarts(c, params) {
		const timeZone = validTimeZone(params.timeZone);
		const now = toUtc();
		const selectedDays = customDays(params, timeZone);
		const [overview, userDayCount, mailDays] = await Promise.all([
			this.overview(c),
			analysisDao.userDayCount(c, selectedDays ?? daysForPeriod(params.userPeriod, timeZone, now)),
			analysisDao.emailDayCount(c, selectedDays ?? daysForPeriod(params.mailPeriod, timeZone, now)),
		]);
		return {
			...overview,
			userDayCount,
			emailDayCount: {
				receiveDayCount: mailDays.map(({ date, received }) => ({ date, total: received })),
				sendDayCount: mailDays.map(({ date, sent }) => ({ date, total: sent })),
			},
		};
	},

	async overview(c) {
		if (!this.analysisCacheEnabled(c)) return this.queryOverview(c);
		const cache = await c.env.kv.get(overviewKey, { type: 'json' });
		return cache ?? await this.refreshEchartsCache(c);
	},

	async refreshEchartsCache(c) {
		if (!this.analysisCacheEnabled(c)) return;
		const overview = await this.queryOverview(c);
		await c.env.kv.put(overviewKey, JSON.stringify(overview));
		return overview;
	},

	async queryOverview(c) {
		const [numberCount, nameRatio] = await Promise.all([
			analysisDao.numberCount(c),
			orm(c).select({ name: email.name, total: count() }).from(email)
				.where(and(eq(email.type, emailConst.type.RECEIVE), isNotNull(email.name), ne(email.name, 'noreply'), ne(email.name, '')))
				.groupBy(email.name).orderBy(desc(count())).limit(6),
		]);
		return { numberCount, receiveRatio: { nameRatio } };
	},

	analysisCacheEnabled(c) {
		return c.env.analysis_cache === true || c.env.analysis_cache === 'true';
	},
};

export default analysisService;
