import * as utils from './utils'

test('Step Clamp', () => {
	expect(utils.clamp(5, 0, 10, 1)).toEqual(5)
	expect(utils.clamp(5.6, 0, 10, 1)).toEqual(6)
	expect(utils.clamp(.2, 0, 10, 1)).toEqual(0)
	expect(utils.clamp(9.6, 0, 10, 1)).toEqual(10)

	expect(utils.clamp(4.1, 0, 10, 3)).toEqual(3)
	expect(utils.clamp(3.3, 2, 8, .5)).toEqual(3.5)
})
