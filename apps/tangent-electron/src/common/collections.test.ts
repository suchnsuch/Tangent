import { describe, it, expect } from 'vitest'
import { SparseRingBuffer } from './collections'

describe('Sparse Ring Buffer', () => {
	it('Inserts from an empty buffer', () => {
		const buffer = new SparseRingBuffer<string>()
		buffer.push('Test')
		expect(buffer.tail).toEqual(0)
		expect(buffer.head).toEqual(1)
		expect(buffer.data).toEqual(['Test'])
	})

	it('Removes by nullification', () => {
		const buffer = new SparseRingBuffer<string>()
		buffer.push('1')
		buffer.push('2')
		buffer.push('3')

		expect(buffer.tail).toEqual(0)
		expect(buffer.head).toEqual(3)
		expect(buffer.data).toEqual(['1', '2', '3'])

		buffer.remove('2')
		expect(buffer.tail).toEqual(0)
		expect(buffer.head).toEqual(3)
		expect(buffer.data).toEqual(['1', null, '3'])
	})

	it('Removes by nullification', () => {
		const buffer = new SparseRingBuffer<string>(['1', '2', '3'])

		expect(buffer.tail).toEqual(0)
		expect(buffer.head).toEqual(3)
		expect(buffer.data).toEqual(['1', '2', '3'])

		buffer.remove('2')
		expect(buffer.tail).toEqual(0)
		expect(buffer.head).toEqual(3)
		expect(buffer.data).toEqual(['1', null, '3'])
	})

	describe('pop()', () => {
		it('Pops and shifts head', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3'])
	
			expect(buffer.pop()).toEqual('3')
			expect(buffer.tail).toEqual(0)
			expect(buffer.head).toEqual(2)
			expect(buffer.data).toEqual(['1', '2', null])
		})
	
		it('Does not pop when empty', () => {
			const buffer = new SparseRingBuffer<string>()
			expect(buffer.pop()).toBeUndefined()
		})

		it('Shifts with a wrapped buffer', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3'])
			expect(buffer.shift()).toEqual('1')
			buffer.push('4')

			expect(buffer.pop()).toEqual('4')
		})

		it('Pop skips empty slots', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3'])
			buffer.remove('2')
			expect(buffer.pop()).toEqual('3')
			expect(buffer.head).toEqual(1)
			expect(buffer.free).toEqual(0)
		})
	})

	describe('shift()', () => {
		it('Shifts out a single item', () => {
			const buffer = new SparseRingBuffer<string>()
			buffer.push('Test')
			expect(buffer.shift()).toEqual('Test')
			expect(buffer.tail).toEqual(-1)
			expect(buffer.head).toEqual(0)
			
			buffer.push('Test2')
			expect(buffer.tail).toEqual(0)
			expect(buffer.head).toEqual(1)
			expect(buffer.data).toEqual(['Test2'])
		})

		it('Shifts and shifts tails', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3'])
	
			expect(buffer.shift()).toEqual('1')
			expect(buffer.tail).toEqual(1)
			expect(buffer.head).toEqual(0)
			expect(buffer.free).toEqual(0)
			expect(buffer.data).toEqual([null, '2', '3'])
		})

		it('Does not shift when empty', () => {
			const buffer = new SparseRingBuffer<string>()
			expect(buffer.shift()).toBeUndefined()
		})

		it('Does not shift when empty with slack', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3'])
			buffer.shift()
			buffer.shift()
			buffer.shift()

			expect(buffer.getSlackCount()).toEqual(3)

			buffer.push('4')
			buffer.shift()

			expect(buffer.data).toEqual([null, null, null])
			expect(buffer.tail).toEqual(-1)
			expect(buffer.head).toEqual(1)
			expect(buffer.free).toEqual(0)

			buffer.shift()

			expect(buffer.data).toEqual([null, null, null])
			expect(buffer.tail).toEqual(-1)
			expect(buffer.head).toEqual(1)
			expect(buffer.free).toEqual(0)
		})

		it('Shifts with a wrapped buffer', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3'])
			expect(buffer.shift()).toEqual('1')
			buffer.push('4')

			expect(buffer.shift()).toEqual('2')
			expect(buffer.free).toEqual(0)
		})

		it('Shift skips empty slots', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3'])
			buffer.remove('2')
			expect(buffer.shift()).toEqual('1')
			expect(buffer.tail).toEqual(2)
			expect(buffer.free).toEqual(0)
		})
	})

	describe('slack', () => {
		it('Handles slack and reallocates when necessary', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3'])
			buffer.shift()
			buffer.push('Test1')
	
			expect(buffer.head).toEqual(1)
			expect(buffer.tail).toEqual(1)
			expect(buffer.data).toEqual(['Test1', '2', '3'])
			expect(buffer.getSlackCount()).toEqual(0)
	
			buffer.push('Test2')
			expect(buffer.data).toEqual(['2', '3', 'Test1', 'Test2'])
		})

		it('Calculates slack when empty', () => {
			const buffer = new SparseRingBuffer<string>([null, null, null])
			buffer.head = 2
			buffer.tail = -1
			buffer.free = 0
	
			expect(buffer.getSlackCount()).toEqual(3)
		})
	
		it('Calculates slack when partially full', ()  => {
			const buffer = new SparseRingBuffer<string>([null, '1', null])
			buffer.head = 2
			buffer.tail = 1
			buffer.free = 0
		
			expect(buffer.getSlackCount()).toEqual(2)
		})

		it('Calculates slack when looped', ()  => {
			const buffer = new SparseRingBuffer<string>(['2', null, '1'])
			buffer.head = 1
			buffer.tail = 2
			buffer.free = 0
		
			expect(buffer.getSlackCount()).toEqual(1)
		})
	})

	describe('defragging', () => {
		it('Handles gaps and defrags when necessary', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3'])
			buffer.remove('2')
			buffer.push('4')
	
			expect(buffer.data).toEqual(['1', '3', '4'])
		})

		it('Defrags multiple gaps', () => {
			const buffer = new SparseRingBuffer<string>(['1', '2', '3', '4', '5', '6'])
			buffer.remove('2')
			buffer.remove('3')
			buffer.remove('5')
			buffer.defrag()
			expect(buffer.data).toEqual(['1', '4', '6', null, null, null])
			expect(buffer.tail).toEqual(0)
			expect(buffer.head).toEqual(3)
		})

		it('Defrags multiple gaps when looped', () => {
			const buffer = new SparseRingBuffer<string>([null, '3', '1', null, null, '2', null])
			buffer.head = 2
			buffer.tail = 2
			buffer.free = 4
			
			buffer.defrag()
			expect(buffer.data).toEqual([null, null, '1', '2', '3', null, null])
			expect(buffer.tail).toEqual(2)
			expect(buffer.head).toEqual(5)
		})
	})
})
