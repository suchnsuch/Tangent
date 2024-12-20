import { describe, test, expect, it } from 'vitest'

import path from 'path'
import paths, { makeRegexPathAgnostic } from 'common/paths'

function ensureMatchesPosix(functionName:string, ...args: string[]) {
	expect(paths[functionName](...args))
		.toEqual(path.posix[functionName](...args))
}

function ensureMatchesWin(functionName:string, ...args: string[]) {
	expect(paths[functionName](...args))
		.toEqual(path.win32[functionName](...args))
}

describe('dirname()', () => {
	test('Gets file parent', () => {
		ensureMatchesPosix('dirname', '/my/example/path/file.txt')
		ensureMatchesWin('dirname', '\\my\\example\\path\\file.txt')
	})
	test('Ignores trailing path seperator', () => {
		ensureMatchesPosix('dirname', '/my/example/path/')
		ensureMatchesWin('dirname', '\\my\\example\\path\\')
	})
	test('Non-directory paths', () => {
		ensureMatchesPosix('dirname', 'no_folder')
	})
})

describe('basename()', () => {
	test('Gets the file name', () => {
		ensureMatchesPosix('basename', '/my/example.file')
		ensureMatchesPosix('basename', '/my/example.file', '.file')
	})
	test('Ignores trailing path seperator', () => {
		ensureMatchesPosix('basename', '/my/example/')
	})
	test('Handles dots in path', () => {
		ensureMatchesPosix('basename', '/my.test/example')
	})
})

describe('extname()', () => {
	test('extensions', () => {
		ensureMatchesPosix('extname', '/my.test/file.txt')
		ensureMatchesPosix('extname', '/my.test/file')
		ensureMatchesPosix('extname', '/my/test/.file')
		ensureMatchesPosix('extname', 'test')
		ensureMatchesPosix('extname', '.file')
		ensureMatchesPosix('extname', 'file.text')
	})
})

describe('join()', () => {
	test('Adds seperators where needed', () => {
		ensureMatchesPosix('join', 'test', 'foo')
	})
	test('Ignores extra seperators', () => {
		ensureMatchesPosix('join', 'test/', '/foo')
		ensureMatchesPosix('join', '/test/', '/foo/')
	})
	test('Ignores blank components', () => {
		ensureMatchesPosix('join', 'test', '', 'foo')
		ensureMatchesPosix('join', 'test', '')
	})
	test('Joining paths with dots', () => {
		ensureMatchesPosix('join', 'some/path', '.')
		ensureMatchesPosix('join', 'some/path', '.', 'other')
		ensureMatchesPosix('join', '.', 'and', 'other')
	})

	test('Can produce windows paths', () => {
		expect(paths.join('this\\fancy', 'test/path'))
			.toEqual('this\\fancy\\test\\path')
		expect(paths.join('this/fancy', 'test\\path'))
			.toEqual('this/fancy/test/path')
		
		// This call creates no forward slashes
		expect(paths.join('this\\fancy', ''))
			.toEqual('this\\fancy')
	})
})

describe('resolve()', () => {
	test('Does nothing when necessary', () => {
		ensureMatchesPosix('resolve', '/some/long/path/with/nothing.txt')
		ensureMatchesWin('resolve', '\\some\\long\\path\\with\\nothing.txt')
	})
	test('Understands basic relative paths', () => {
		ensureMatchesPosix('resolve', '/some/root/./some/file.txt')
		ensureMatchesWin('resolve', '\\some\\root\\.\\some\\file.txt')
	})
	test('Understands parent redirects', () => {
		ensureMatchesPosix('resolve', '/some/root/../some/file.txt')
		ensureMatchesPosix('resolve', '/some/long/root/../../some/file.txt')

		ensureMatchesWin('resolve', '\\some\\root\\..\\some\\file.txt')
		ensureMatchesWin('resolve', '\\some\\long\\root\\..\\..\\some\\file.txt')
	})
})

describe('Get Child Path', () => {
	test('A real child path', () => {
		expect(paths.getChildPath('/some/fake/root', '/some/fake/root/child/file'))
			.toEqual('child/file')
	})
	test('A not child path', () => {
		expect(paths.getChildPath('/some/fake/root', '/somewhere/else'))
			.toEqual(false)
	})
	test('A parent with a trailing seperator', () => {
		expect(paths.getChildPath('some/trailing/root/', 'some/trailing/root/child/path'))
			.toEqual('child/path')
	})
})

describe('Patch Agnostic Regex', () => {
	test('A path match', () => {
		const matcher = makeRegexPathAgnostic(/some\/filepath\.md/)
		expect('some/filepath.md'.match(matcher)).toBeTruthy()
		expect('some\\filepath.md'.match(matcher)).toBeTruthy()
	})
})

describe('Separating paths', () => {
	test('nix path', () => {
		expect(paths.segment('here/is/my/path.foo')).toEqual([
			'here', 'is', 'my', 'path.foo'
		])
	})
	test('windows path', () => {
		expect(paths.segment('here\\is\\my\\path.foo')).toEqual([
			'here', 'is', 'my', 'path.foo'
		])
	})
	it('Should include a blank for trailing data', () => {
		expect(paths.segment('test/')).toEqual(['test', ''])
	})
})
