export const isMac = typeof global === 'undefined' ?
	navigator.userAgent.indexOf('Macintosh') !== -1 :
	process.platform === 'darwin'