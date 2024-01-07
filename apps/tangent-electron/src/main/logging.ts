import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { getWorkspaceNamePrefix } from './environment'
import Logger from 'js-logger'
import { simpleTimestamp } from '../common/dates'
import { padString } from '../common/stringUtils'

const logPath = path.join(
	app?.getPath('logs') ?? '',
	getWorkspaceNamePrefix() + 'log.txt')

// Need to strip out the console colors
const formatStripper = /\[\d\d?m/g

function depthToSpacing(depth: number) {
	let result = ''
	for (let i = 0; i < depth; i++) {
		result += '\t'
	}
	return result
}

/**
 * Prepares a value for printing to a log. Does _not_ produce JSON for objects
 * @param value The value to prepare for printing.
 * @param depth (optional) The current depth for spacing purposes.
 * @param visited (optional) The set of objects that have been printed already.
 * @returns A formatted string representing the value ready to be printed to a log file.
 */
export function valueToString(value: any, depth?: number, visited?: Set<any>) {
	if (value === null) return '<null>'
	if (value === undefined) return '<undefined>'
	if (value instanceof Error) {
		if (value.stack) {
			return value.stack + '\n'
		}
		return `${value.name}: ${value.message}`
	}
	if (typeof value === 'object') {
		visited = visited ?? new Set()
		visited.add(value)
		let out = '{\n'
		let innerDepth = (depth ?? 0) + 1
		let innerSpacing = depthToSpacing(innerDepth)
		for (const key of Object.keys(value)) {
			out += innerSpacing + key + ': '
			const innerValue = value[key]
			if (visited.has(innerValue)) {
				out += '<object already logged>'
			}
			else {
				out += valueToString(innerValue, innerDepth, visited)
			}
			if (!out.endsWith('\n')) {
				out += '\n'
			}
		}
		out += depthToSpacing(depth ?? 0) + '}\n'
		return out
	}
	return String(value).replace(formatStripper, '')
}

export function passLogsToConsole() {
	const defaultLogHandler = Logger.createDefaultHandler()
	Logger.setHandler(defaultLogHandler)
}

export function setupLogging() {
	const logStream = fs.createWriteStream(logPath, { flags: 'a' })

	const defaultLogHandler = Logger.createDefaultHandler({
		formatter: (messages: any[], context) => {
			if (context.name) {
				messages.unshift('[' + context.name + ']')
			}
			
			const message = messages.map(value => valueToString(value)).join(' ')
	
			logStream.write(`${padString(context.level.name, 5)} ${simpleTimestamp(new Date())}: ${message}\n`)
		}
	})
	Logger.setHandler(defaultLogHandler)
	
	app.on('quit', () => {
		Logger.info('Tangent Exiting')
		logStream.end()
		Logger.setHandler(null)
	})
}
