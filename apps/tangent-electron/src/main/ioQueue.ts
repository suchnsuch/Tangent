import { SparseRingBuffer } from 'common/collections'
import { promises as fs, PathLike } from 'fs'
import Logger from 'js-logger'
import { getSettings } from './settings'

const log = Logger.get('io-queue')
// TODO: Reduce verbosity when stable
log.setLevel(Logger.DEBUG)

type QueueItem = {
	execute(): Promise<any>
}

/**
 * This is here because reading too many files at once can cause an
 * EMFILE error (https://github.com/suchnsuch/Tangent/issues/143)
 * The theory here is that we limit the number of simultaneous real
 * read requests to something more reasonable than just "everything".
 */
const queue = new SparseRingBuffer<QueueItem>
let MAX_ACTIVE = 100 // This is entirely made up

getSettings().debug_ioQueue_maxActive.subscribe(max => {
	MAX_ACTIVE = max
})

let activeCount = 0

function queueItem(item: QueueItem) {
	queue.push(item)
	pumpQueue()
}

function pumpQueue() {
	while (activeCount < MAX_ACTIVE) {
		const item = queue.shift()
		if (!item) break
		
		activeCount++
		item.execute().finally(onItemFinished)
	}
}

function onItemFinished() {
	activeCount--
	pumpQueue()
}

export async function readFile(path: PathLike, encoding: BufferEncoding = 'utf8'): Promise<string> {
	return new Promise((resolve, reject) => {
		log.debug('Queuing read of', path)
		const item: QueueItem = {
			execute: () => {
				log.debug('    Starting to read', path)
				return fs.readFile(path, encoding)
				.then(resolve)
				.catch(reject)
				.finally(() => log.debug('    Finished reading', path))
			}
		}

		queueItem(item)
	})
}
