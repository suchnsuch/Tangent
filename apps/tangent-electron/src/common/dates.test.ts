import { describe, test, expect, it } from 'vitest'

import * as dates from './dates'

test('Shortest Day Date', () => {
	const now = new Date(2000, 8, 1)

	expect(dates.shortestDayDate(now, now)).toEqual('Today')
	expect(dates.shortestDayDate(new Date(2000, 7, 31), now)).toEqual('Yesterday')
	expect(dates.shortestDayDate(new Date(2000, 8, 2), now)).toEqual('Tomorrow')

	expect(dates.shortestDayDate(new Date(2000, 9, 15), now)).toEqual('Oct 15')
	expect(dates.shortestDayDate(new Date(2001, 0, 7), now)).toEqual('Jan 7 2001')
})

test('Clock Time', () => {
	expect(dates.clockTime(new Date(2000, 1, 1, 5, 30))).toEqual('5:30am')
	expect(dates.clockTime(new Date(2000, 1, 1, 13, 45))).toEqual('1:45pm')
	expect(dates.clockTime(new Date(2000, 1, 1, 0, 0))).toEqual('12:00am')
})

describe('Date Format', () => {
	it('Should replace years', () => {
		expect(dates.fillDateFormat('%YYYY%-%YYYY%', new Date(2000, 1, 1, 5, 30))).toEqual('2000-2000')
	})

	it('Should replace months and days', () => {
		expect(dates.fillDateFormat('%MM%-%DD%', new Date(2000, 1, 1, 5, 30))).toEqual('02-01')
	})

	it('Should allow for short "th"ed dates', () => {
		expect(dates.fillDateFormat('%MM%-%Do%', new Date(2000, 1, 1, 5, 30))).toEqual('02-1st')
	})

	it('Should allow for long "th"ed dates', () => {
		expect(dates.fillDateFormat('%MM%-%DDo%', new Date(2000, 1, 5, 5, 30))).toEqual('02-05th')
	})
})