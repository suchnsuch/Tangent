const months = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
] as const

const shortMonths = [
	'Jan',
	'Feb',
	'March',
	'April',
	'May',
	'June',
	'July',
	'Aug',
	'Sept',
	'Oct',
	'Nov',
	'Dec'
] as const

const weekdays = [
	'Sunday',
	'Monday',
	'Tuesday',
	'Wednesday',
	'Thursday',
	'Friday',
	'Saturday'
] as const

const shortWeekdays = [
	'Sun',
	'Mon',
	'Tue',
	'Wed',
	'Thu',
	'Fri',
	'Sat'
] as const

const numberThs = {
	'0': 'th',
	'1': 'st',
	'2': 'nd',
	'3': 'rd',
	'4': 'th',
	'5': 'th',
	'6': 'th',
	'7': 'th',
	'8': 'th',
	'9': 'th'
} as const

// From https://stackoverflow.com/questions/8619879/javascript-calculate-the-day-of-the-year-1-366
export function daysIntoYear(date: Date){
	return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(date.getFullYear(), 0, 0)) / 24 / 60 / 60 / 1000;
}

export function coerceToDate(input: any, defaultDate?: Date) {
	if (typeof input === 'string') {
		input = new Date(input)
	}
	else if (input == null || isNaN(input)) {
		input = defaultDate ?? new Date()
	}
	return input
}

export function friendlyWeekDay(date: Date, now = new Date()) {
	if (!date) return 'Never'

	const theYear = date.getFullYear()
	const nowYear = now.getFullYear()

	if (theYear === nowYear) {
		const theYearDay = daysIntoYear(date)
		const nowYearDay = daysIntoYear(now)
		
		const dayDiff = nowYearDay - theYearDay

		switch (dayDiff) {
			case 0:
				return 'Today'
			case 1:
				return 'Yesterday'
			case -1:
				return 'Tomorrow'
		}
	}

	return weekdays[date.getDay()]
}

export function shortestDayDate(date: Date, now = new Date()) {
	if (!date) return 'Never'
	let result = ''

	const theYear = date.getFullYear()
	const nowYear = now.getFullYear()

	if (theYear === nowYear) {
		const theYearDay = daysIntoYear(date)
		const nowYearDay = daysIntoYear(now)
		
		const dayDiff = nowYearDay - theYearDay

		switch (dayDiff) {
			case 0:
				return 'Today'
			case 1:
				return 'Yesterday'
			case -1:
				return 'Tomorrow'
		}
		
		if (dayDiff > 0 && dayDiff < 7) {
			return weekdays[date.getDay()]
		}
	}

	const theMonth = date.getMonth()
	const theDate = date.getDate()

	result += shortMonths[theMonth]
	result += ' '

	result += theDate

	if (theYear !== nowYear) {
		result += ' '
		result += theYear
	}

	return result
}

function forceTwoDigitNumber(number: number): string {
	return number < 10 ? '0' + number : number.toString()
}

export function clockTime(date: Date) {
	let hour = date.getHours()
	let suffix = 'am'
	if (hour >= 12) {
		hour -= 12
		suffix = 'pm'
	}
	if (hour === 0) hour = 12
	return `${hour}:${forceTwoDigitNumber(date.getMinutes())}${suffix}`
}

export function fillDateFormat(format: string, date: Date) {
	let result = format.replace(/%YYYY%/g, date.getFullYear().toString())
	result = result.replace(/%YY%/g, date.getFullYear().toString().substring(2))

	result = result.replace(/%MM%/g, forceTwoDigitNumber(date.getMonth() + 1))
	result = result.replace(/%M%/g, (date.getMonth() + 1).toString())

	result = result.replace(/%DD?o?%/g, str => {
		const day = date.getDate()
		let result = str[2] === 'D' ? forceTwoDigitNumber(day) : day.toString()
		if (str.at(-2) === 'o') {
			result += numberThs[result.at(-1)]
		}
		return result
	})

	result = result.replace(/%HH%/g, forceTwoDigitNumber(date.getHours()))
	result = result.replace(/%H%/g, date.getHours().toString())

	result = result.replace(/%mm%/g, forceTwoDigitNumber(date.getMinutes()))
	result = result.replace(/%m%/g, date.getMinutes().toString())

	result = result.replace(/%ss%/g, forceTwoDigitNumber(date.getSeconds()))
	result = result.replace(/%s%/g, date.getSeconds().toString())

	// Text Months
	result = result.replace(/%Month%/g, months[date.getMonth()])
	result = result.replace(/%Mth%/g, shortMonths[date.getMonth()])
	result = result.replace(/%MONTH%/g, months[date.getMonth()].toUpperCase())
	result = result.replace(/%MTH%/g, shortMonths[date.getMonth()].toUpperCase())
	result = result.replace(/%month%/g, months[date.getMonth()].toLowerCase())
	result = result.replace(/%mth%/g, shortMonths[date.getMonth()].toLowerCase())
	
	// Text Weekdays
	result = result.replace(/%WeekDay%/g, weekdays[date.getDay()])
	result = result.replace(/%WEEKDAY%/g, weekdays[date.getDay()].toUpperCase())
	result = result.replace(/%weekday%/g, weekdays[date.getDay()].toLowerCase())
	result = result.replace(/%WDay%/g, shortWeekdays[date.getDay()])
	result = result.replace(/%WDAY%/g, shortWeekdays[date.getDay()].toUpperCase())
	result = result.replace(/%wday%/g, shortWeekdays[date.getDay()].toLowerCase())

	return result
}

export function simpleTimestamp(date: Date) {
	if (!date) return ''
	return `${date.getFullYear()}-${forceTwoDigitNumber(date.getMonth() + 1)}-${forceTwoDigitNumber(date.getDate())} ${forceTwoDigitNumber(date.getHours())}:${forceTwoDigitNumber(date.getMinutes())}:${forceTwoDigitNumber(date.getSeconds())}`
}
