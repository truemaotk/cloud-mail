import { describe, expect, it } from 'vitest'
import { isProtectedUserEmail, protectedUserEmails } from '../src/utils/protected-user.js'

describe('protected admin accounts', () => {
	it('protects addresses whose local part starts with admin', () => {
		for (const email of ['admin@example.test', 'Admin@example.test', 'admin2@a.io', 'administrator@x.test', ' admin.ops@x.test ']) {
			expect(isProtectedUserEmail(email)).toBe(true)
		}
	})

	it('allows other addresses', () => {
		for (const email of ['user@admin.test', 'lin@example.test', 'sysadmin@x.test', '', null, undefined]) {
			expect(isProtectedUserEmail(email)).toBe(false)
		}
	})

	it('lists protected rows in a batch', () => {
		expect(protectedUserEmails([{ email: 'lin@a.test' }, { email: 'admin@a.test' }, null])).toEqual(['admin@a.test'])
	})
})
