const analysisDao = {
	async numberCount(c) {
		const { results } = await c.env.db.prepare(`
            SELECT
				COALESCE(e.receiveTotal, 0) AS receiveTotal,
				COALESCE(e.sendTotal, 0) AS sendTotal,
				COALESCE(e.delReceiveTotal, 0) AS delReceiveTotal,
				COALESCE(e.delSendTotal, 0) AS delSendTotal,
				COALESCE(e.normalReceiveTotal, 0) AS normalReceiveTotal,
				COALESCE(e.normalSendTotal, 0) AS normalSendTotal,
				COALESCE(u.userTotal, 0) AS userTotal,
				COALESCE(u.normalUserTotal, 0) AS normalUserTotal,
				COALESCE(u.delUserTotal, 0) AS delUserTotal,
				COALESCE(a.accountTotal, 0) AS accountTotal,
				COALESCE(a.normalAccountTotal, 0) AS normalAccountTotal,
				COALESCE(a.delAccountTotal, 0) AS delAccountTotal
            FROM
                (
                    SELECT
                        SUM(CASE WHEN type = 0 THEN 1 ELSE 0 END) AS receiveTotal,
                        SUM(CASE WHEN type = 1 THEN 1 ELSE 0 END) AS sendTotal,
                        SUM(CASE WHEN type = 0 AND is_del = 1 THEN 1 ELSE 0 END) AS delReceiveTotal,
                        SUM(CASE WHEN type = 1 AND is_del = 1 THEN 1 ELSE 0 END) AS delSendTotal,
                        SUM(CASE WHEN type = 0 AND is_del = 0 THEN 1 ELSE 0 END) AS normalReceiveTotal,
                        SUM(CASE WHEN type = 1 AND is_del = 0 THEN 1 ELSE 0 END) AS normalSendTotal
                    FROM
                        email
                ) e
            CROSS JOIN (
                SELECT
                    COUNT(*) AS userTotal,
                    SUM(CASE WHEN is_del = 1 THEN 1 ELSE 0 END) AS delUserTotal,
                    SUM(CASE WHEN is_del = 0 THEN 1 ELSE 0 END) AS normalUserTotal
                FROM
                    user
            ) u
            CROSS JOIN (
                SELECT
                    COUNT(*) AS accountTotal,
                    SUM(CASE WHEN is_del = 1 THEN 1 ELSE 0 END) AS delAccountTotal,
                    SUM(CASE WHEN is_del = 0 THEN 1 ELSE 0 END) AS normalAccountTotal
                FROM
                    account
            ) a
        `).all();
		return results[0];
	},

	async userDayCount(c, days) {
		const { results } = await c.env.db.prepare(`
			${dayBuckets}
			SELECT days.date, COUNT(user.user_id) AS total
			FROM days
			LEFT JOIN user ON user.create_time >= days.start_utc AND user.create_time < days.end_utc
			GROUP BY days.date ORDER BY days.date
		`).bind(JSON.stringify(days)).all();
		return results;
	},

	async emailDayCount(c, days) {
		const { results } = await c.env.db.prepare(`
			${dayBuckets}
			SELECT days.date,
				SUM(CASE WHEN email.type = 0 THEN 1 ELSE 0 END) AS received,
				SUM(CASE WHEN email.type = 1 THEN 1 ELSE 0 END) AS sent
			FROM days
			LEFT JOIN email ON email.create_time >= days.start_utc AND email.create_time < days.end_utc
			GROUP BY days.date ORDER BY days.date
		`).bind(JSON.stringify(days)).all();
		return results;
	},
};

const dayBuckets = `WITH days(date, start_utc, end_utc) AS (
	SELECT json_extract(value, '$[0]'), json_extract(value, '$[1]'), json_extract(value, '$[2]') FROM json_each(?)
)`;

export default analysisDao;
