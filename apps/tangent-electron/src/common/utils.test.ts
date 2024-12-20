import { describe, test, expect, it } from 'vitest'

import * as utils from './utils'

test('Step Clamp', () => {
	expect(utils.clamp(5, 0, 10, 1)).toEqual(5)
	expect(utils.clamp(5.6, 0, 10, 1)).toEqual(6)
	expect(utils.clamp(.2, 0, 10, 1)).toEqual(0)
	expect(utils.clamp(9.6, 0, 10, 1)).toEqual(10)

	expect(utils.clamp(4.1, 0, 10, 3)).toEqual(3)
	expect(utils.clamp(3.3, 2, 8, .5)).toEqual(3.5)
})

describe('Filter in Place', () => {
	it('Should remove invalid items', () => {
		const list = [
			'one',
			'two',
			null,
			'three',
			'four',
			null
		]
	
		utils.filterInPlace(list, i => i != null)
	
		expect(list).toEqual([
			'one',
			'two',
			'three',
			'four'
		])
	})

	it('Should not affect arrays that do not have invalid items', () => {
		const list = [
			'one',
			'two',
			'three',
			'four'
		]
	
		utils.filterInPlace(list, i => i != null)
	
		expect(list).toEqual([
			'one',
			'two',
			'three',
			'four'
		])
	})
})
