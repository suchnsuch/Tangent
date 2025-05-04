export const isMac = typeof global === 'undefined' ?
	navigator.userAgent.indexOf('Macintosh') !== -1 :
	process.platform === 'darwin'

export const isWindows = typeof global === 'undefined' ?
	navigator.userAgent.indexOf('Windows') !== -1 :
	process.platform === "win32"

export const isLinux = typeof global === 'undefined' ?
	navigator.userAgent.indexOf('Linux') !== -1 :
	(process.platform !== 'darwin' && process.platform !== 'win32')
