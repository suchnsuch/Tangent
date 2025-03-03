export class SparseRingBuffer<T> {
	data: T[] = []
	/** The next insertion index */
	head: number = 0
	/** The least recent or "first" index. -1 when empty */
	tail: number = -1
	/** The amount of free space between the tail & head */
	free: number = 0

	constructor(items?: Iterable<T>) {
		if (items) {
			this.data = [...items]
			this.tail = 0
			this.head = this.data.length
		}
	}

	/**
	 * Add an item to the end of the ring
	 */
	push(item: T) {
		if ((this.tail === -1 || this.tail === 0) && this.head === this.data.length && this.free === 0) {
			// Fast track adding data in the simplest case
			this.data.push(item)
			this.tail = 0
			this.head = this.data.length
			return
		}

		if (this.getSlackCount()) {
			// Insert into the slack
			if (this.head === this.data.length) {
				this.head = this.getWrappedIndex(this.head)
			}
			this.data[this.head] = item
			if (this.tail === -1) {
				this.tail = this.head
			}
			const next = this.head + 1
			if (next === this.data.length && this.tail === 0) {
				// When this is effectively a raw array, let the head point to the next index
				this.head = next
			}
			else {
				this.head = this.getWrappedIndex(next)
			}
		}
		else if (this.free > 0) {
			// Condense the buffer to create slack
			this.defrag()
			// Insert into the new slack
			this.data[this.head] = item
			if (this.tail === -1) {
				this.tail = this.head
			}
			this.head = this.getWrappedIndex(this.head + 1)
		}
		else {
			// Rebuild the buffer with the new item at the end
			this.rebuildBuffer(item)
		}
	}

	/**
	 * Removes & returns the item at the end of the ring
	 */
	pop(): T {
		if (this.tail === -1) return undefined

		let index = this.getWrappedIndex(this.head - 1)
		const item = this.data[index]
		this.data[index] = null
		this.head = index
		if (this.head === this.tail) {
			this.tail = -1
		}
		else {
			// Skip nulls
			index = this.getWrappedIndex(index - 1)
			while (this.data[index] === null) {
				this.free--
				this.head = index
				index = this.getWrappedIndex(index - 1)
			}
		}
		return item
	}

	/**
	 * Removes & returns the item at the start of the ring
	 */
	shift(): T {
		if (this.tail === -1) return undefined

		const item = this.data[this.tail]
		this.data[this.tail] = null
		this.tail = this.getWrappedIndex(this.tail + 1)
		// The head might be at `data.length`
		this.head = this.getWrappedIndex(this.head)
		if (this.head === this.tail) {
			this.tail = -1
		}
		else {
			// Chew through nulls
			while (this.data[this.tail] === null) {
				this.free--
				this.tail = this.getWrappedIndex(this.tail + 1)
			}
		}
		return item
	}

	remove(item: T): boolean {
		const index = this.indexOf(item)
		if (index < 0) {
			return false
		}

		if (index === this.tail) {
			this.shift()
			return true
		}
		if (index === this.head - 1) {
			this.pop()
			return true
		}

		// We're sparse, so just null the value
		this.data[index] = null

		// Keep track of free space
		this.free++

		return true
	}

	getSlackCount(): number {
		if (this.tail === -1) {
			return this.data.length
		}
		if (this.tail === this.head) {
			return 0
		}
		if (this.head < this.tail) {
			return this.tail - this.head
		}
		else {
			return this.tail + (this.data.length - this.head)
		}
	}

	/**
	 * Collapses all empty space while retaining order
	 */
	defrag() {
		let index = this.tail
		let insertIndex = this.tail

		// Head might be at `data.length`.
		this.head = this.getWrappedIndex(this.head)

		do {
			const value = this.data[index]
			if (value !== null) {
				if (index === insertIndex) {
					insertIndex = this.getWrappedIndex(index + 1)
				}
				else {
					// Shift the value to the insertion index
					this.data[insertIndex] = value
					this.data[index] = null
					insertIndex = this.getWrappedIndex(insertIndex + 1)
				}
			}
			index = this.getWrappedIndex(index + 1)
		}
		while (index !== this.head)

		this.head = insertIndex
		this.free = 0
	}

	/**
	 * Rebuilds the buffer into a new array starting at 0
	 * @param extra Extra item(s) to include at the end
	 * @param keepSlack Whether extra capacity should be enforced
	 */
	rebuildBuffer(extra?: T|T[], keepSlack=true) {
		console.log('rebuilding buffer', this)
		const newData: T[] = []
		
		let emptyCount = 0
		const push = (item: T) => {
			if (item === null) {
				emptyCount++
			}
			else {
				newData.push(item)
			}
		}

		push(this.data[this.tail])

		let index = this.tail + 1

		while (index != this.head) {
			if (index === this.data.length) index = 0
			push(this.data[index])
			index++
		}

		if (Array.isArray(extra)) {
			for (let item of extra) {
				newData.push(item)
				emptyCount--
			}
		}
		else if (extra) {
			newData.push(extra)
			emptyCount--
		}

		this.data = newData
		this.tail = 0
		this.head = newData.length
		this.free = 0

		if (keepSlack) {
			while (emptyCount > 0) {
				emptyCount--
				newData.push(null)
			}
		}
	}

	indexOf(item: T): number {
		return this.data.indexOf(item)
	}

	getWrappedIndex(index: number): number {
		if (this.data.length === 0) return -1

		while (index < 0) {
			index += this.data.length
		}
		while (index >= this.data.length) {
			index -= this.data.length
		}
		return index
	}
}
