import { describe, expect, it } from 'vitest'

import { nodeFromPath } from 'common/trees'
import Session, { ThreadHistoryItem, fixThreadHistoryItem } from './Session'
import IndexTreeStore from 'common/indexing/IndexTreeStore'

describe('Fixing Thread History Items', () => {
	it('Should do nothing when the item is good', () => {
		const node = nodeFromPath('Foo/bar/bin.md')
		const item: ThreadHistoryItem = {
			thread: [
				node
			],
			currentNode: node
		}

		expect(fixThreadHistoryItem(item)).toBe(false);
	})

	it('Should remove nullish thread items', () => {
		const node = nodeFromPath('Foo/bar/bind.md')
		const item: ThreadHistoryItem = {
			thread: [
				node, null
			],
			currentNode: node
		}

		expect(fixThreadHistoryItem(item)).toBe(true)
		expect(item.thread).toEqual([node])
	})

	it('Should always have a thread', () => {
		const node = nodeFromPath('Foo/bar/bind.md')
		const item: any = {
			currentNode: node
		}

		expect(fixThreadHistoryItem(item)).toBe(true)
		expect(item.thread).toEqual([node])
	})

	it('Should remove duplicate items from a thread', () => {
		const node1 = nodeFromPath('Foo/bar/bind.md')
		const node2 = nodeFromPath('Foo/bar/blast.md')

		const item: ThreadHistoryItem = {
			thread: [
				node1, node2, node1
			],
			currentNode: node2
		}

		expect(fixThreadHistoryItem(item)).toBe(true)
		expect(item.thread).toEqual([ node1, node2 ])
	})
})

describe('Session file error resiliancy', () => {
	const store = new IndexTreeStore({
		files: {
			path: 'some/files',
			name: 'files',
			fileType: 'folder',
			children: [
				{
					path: 'some/files/file.md',
					name: 'file',
					fileType: '.md'
				}
			]
		},
		tags: {
			path: 'tagroot',
			name: 'tagroot',
			names: [],
			fileType: 'folder',
			children: []
		}
		
	})

	it('Should create placeholders for nodes that cannot be resolved', () => {
		const session = new Session({
			store,
			file: null,
			json: {
				threadHistory: [
					{
						thread: [
							'FILES/file.md',
							'FILES/My Note.md',
							'FILES/Another Node.md'
						],
						currentNode: 'FILES/My Note.md'
					}
				],
				map: {
					nodes: {
						'FILES/file.md': {
							node: 'FILES/file.md'
						},
						'FILES/My Note.md': {
							node: 'FILES/My Note.md'
						},
						'FILES/Another Node.md': {
							node: 'FILES/Another Node.md'
						}
					},
					connections: [
						{
							from: 'FILES/file.md',
							to: 'FILES/My Note.md',
							strength: 3
						},
						{
							from: 'FILES/My Note.md',
							to: 'FILES/Another Node.md',
							strength: 3
						}
					]
				}
			}
		})

		const realFile = store.files.children[0]

		expect(session._store.placeholders.size).toEqual(2)
		
		const fakeFileOne = session._store.placeholders.get('some/files/My Note.md')
		const fakeFileTwo = session._store.placeholders.get('some/files/Another Node.md')
		
		expect(session.threadHistory.get(0)).toMatchObject({
			thread: [
				realFile,
				fakeFileOne,
				fakeFileTwo
			]
		})
		
		const realMapNode = session.map.nodes.get(realFile)
		const fakeMapNodeOne = session.map.nodes.get(fakeFileOne)
		const fakeMapNodeTwo = session.map.nodes.get(fakeFileTwo)

		expect(realMapNode.node.value).toBe(realFile)
		expect(fakeMapNodeOne.node.value).toBe(fakeFileOne)
		expect(fakeMapNodeTwo.node.value).toBe(fakeFileTwo)

		expect(session.map.connections.value).toMatchObject([
			{
				from: { _value: realMapNode },
				to: { _value: fakeMapNodeOne }
			},
			{
				from: { _value: fakeMapNodeOne },
				to: { _value: fakeMapNodeTwo }
			}
		])
	})
})
