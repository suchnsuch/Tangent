export type TemplateDefinition = {
	/** The text that will be replaced by the template */
	text: string
	/** An explanation of what the template will be replaced with */
	description: string
}

export const dateTemplates: TemplateDefinition[] = [
{
		text: '%YYYY%',
		description: 'The full year.'
	},
	{
		text: '%YY%',
		description: 'The last two digits of the year.'
	},
	{
		text: '%MM%',
		description: 'The two digit month. e.g. "05" for May.'
	},
	{
		text: '%M%',
		description: 'The single digit month. e.g. "5" for May, "10" for October.'
	},
	{
		text: '%DD%',
		description: 'The two digit day of the month. e.g. "07".'
	},
	{
		text: '%DDo%',
		description: 'The two digit ordinal day of the month. e.g. "07th", "02nd".'
	},
	{
		text: '%D%',
		description: 'The single digit day of the month. e.g. "5", "15".'
	},
	{
		text: '%Do%',
		description: 'The single digit ordinal day of the month. e.g. "3rd", "15th".'
	},
	{
		text: '%HH%',
		description: 'The two digit hour of the day (24 hour clock).'
	},
	{
		text: '%H%',
		description: 'The single digit hour of the day (24 hour clock).'
	},
	{
		text: '%mm%',
		description: 'The two digit minute of the hour.'
	},
	{
		text: '%m%',
		description: 'The single digit minute of the hour.'
	},
	{
		text: '%ss%',
		description: 'The two digit second of the minute.'
	},
	{
		text: '%Month%',
		description: 'The full name of the month.'
	},
	{
		text: '%MONTH%',
		description: 'The full name of the month in all caps.'
	},
	{
		text: '%Mth%',
		description: 'The shortened name of the month.'
	},
	{
		text: '%MTH%',
		description: 'The shortened name of the month in all caps.'
	},
	{
		text: '%WeekDay%',
		description: 'The full name of the week day.'
	},
	{
		text: '%WEEKDAY%',
		description: 'The full name of the week day in all caps.'
	},
	{
		text: '%WDay%',
		description: 'The short name of the week day.'
	},
	{
		text: '%WDAY%',
		description: 'The short name of the week day in all caps.'
	},
	{
		text: '%wday%',
		description: 'The short name of the week, all lowercase.'
	},
	{
		text: '%WW%',
		description: 'The double digit ISO week of the year.'
	},
	{
		text: '%W%',
		description: 'The single digit ISO week of the year.'
	},
]

export const templates: TemplateDefinition[] = [
	...dateTemplates
]
