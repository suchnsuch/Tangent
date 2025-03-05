import { describe, test, expect, it } from 'vitest'

import { forAllNodes, TreeNode, DirectoryStore, DirectoryStoreAddResult } from 'common/trees'

describe('Adding and removing nodes', () => {

	function getTestStore(): DirectoryStore {
		let root:TreeNode = {
			name: 'root',
			path: 'some/root',
			depth: 1,
			fileType: 'folder',
			children: [
				{
					name: 'a_child',
					path: 'some/root/a_child',
					depth: 2,
					fileType: 'folder',
					children: [{
						name: 'some_file',
						path: 'some/root/a_child/some_file.txt',
						depth: 3,
						fileType: '.txt'
					}]
				}
			]
		}
	
		return new DirectoryStore(root)
	}

	test('Can add and remove a node', () => {
		let testStore = getTestStore()
	
		let newNode: TreeNode = {
			name: 'new',
			path: 'some/root/a_child/new.txt',
			depth: 3,
			fileType: '.txt'
		}
	
		// Can't remove what's not there
		expect(testStore.remove(newNode)).toBeFalsy()

		// Can add a new node
		expect(testStore.add(newNode)).toEqual(DirectoryStoreAddResult.Success)
		expect(testStore.get(newNode.path)).toBe(newNode)
		let parent = testStore.getRoot(0).children[0]
		expect(testStore.getParent(newNode.path)).toBe(parent)
		expect(parent.children).toContain(newNode)
	
		// Can remove nodes
		expect(testStore.remove(newNode)).toEqual(newNode)
		expect(testStore.get(newNode.path)).toBeUndefined()
		expect(testStore.getParent(newNode.path)).toBeUndefined()
		expect(parent.children.includes(newNode)).toEqual(false)

		// Can't remove twice
		expect(testStore.remove(newNode)).toEqual(undefined)
	})

	it('Can add a node as a child to a node without a child list', () => {
		const testStore = getTestStore()

		const newNode: TreeNode = {
			name: 'some_file',
			path: 'some/root/a_child/some_file.txt/bam',
			fileType: 'unknown'
		}

		expect(testStore.add(newNode)).toEqual(DirectoryStoreAddResult.Success)
	})

	test('Cannot add a node that already exists', () => {
		let testStore = getTestStore()

		let newNode: TreeNode = {
			name: 'a_child',
			path: 'some/root/a_child',
			depth: 2,
			fileType: 'folder'
		}

		expect(testStore.add(newNode)).toEqual(DirectoryStoreAddResult.PathAlreadyExists)
		expect(testStore.get(newNode.path)).toBe(testStore.getRoot(0).children[0])
		expect(testStore.getRoot(0).children.length).toEqual(1)
	})

	test('Removing a folder removes children', () => {
		let testStore = getTestStore()

		let nodeToRemove = testStore.getRoot(0).children[0]

		expect(testStore.remove(nodeToRemove)).toEqual(nodeToRemove)
		expect(testStore.get(nodeToRemove.path)).toBeUndefined()
		expect(testStore.getParent(nodeToRemove.path)).toBeUndefined()

		for (let child of nodeToRemove.children) {
			expect(testStore.get(child.path)).toBeUndefined()
			expect(testStore.getParent(child.path)).toBeUndefined()
		}
	})

	test('Adding a folder adds children', () => {
		let testStore = getTestStore()

		let nodeToAdd: TreeNode = {
			name: 'another_child',
			path: 'some/root/another_child',
			depth: 2,
			fileType: 'folder',
			children: [{
				name: 'some_other_file',
				path: 'some/root/another_child/some_other_file.txt',
				depth: 3,
				fileType: 'txt'
			}, {
				name: 'a_folder',
				path: 'some/root/another_child/a_folder',
				depth: 3,
				fileType: 'folder',
				children: [{
					name: 'markdown_file',
					path: 'some/root/another_child/a_folder/markdown_file.md',
					depth: 4,
					fileType: 'md'
				}]
			}]
		}

		expect(testStore.add(nodeToAdd)).toEqual(DirectoryStoreAddResult.Success)

		forAllNodes(nodeToAdd, (node, parent) => {
			expect(testStore.get(node.path)).toBe(node)
			expect(testStore.getParent(node.path)).toBe(parent)
		}, testStore.getRoot(0))
	})

	test('Conditional removal can be complete', () => {
		let testStore = getTestStore()
		let target = testStore.getRoot(0).children[0]

		const result = testStore.conditionallyRemove(target, node => true)
		expect(result).toEqual(true)
		expect(testStore.get(target.path)).toBeUndefined()
		expect(target.children.length).toEqual(0)
	})
})

describe('Resolving & Creating Partial Path Matches', () => {

	function getTestStore(): DirectoryStore {
		let root:TreeNode = {
			name: 'root',
			path: 'some/root',
			fileType: 'folder',
			children: [
				{
					name: 'a_child',
					path: 'some/root/a_child',
					fileType: 'folder',
					children: [
						{
							name: 'some_file',
							path: 'some/root/a_child/some_file.txt',
							fileType: '.txt'
						},
						{
							name: 'Test Note',
							path: 'some/root/a_child/Test Note.md',
							fileType: '.md'
						},
						{
							name: 'Such Depth',
							path: 'some/root/a_child/Such Depth',
							fileType: 'folder',
							children: [
								{
									name: 'some_file',
									path: 'some/root/a_child/Such Depth/some_file.txt',
									fileType: '.txt'
								}
							]
						}
					]
				},
				{
					name: 'some_file',
					path: 'some/root/some_file.txt',
					fileType: '.txt'
				},
				{
					name: 'Note',
					path: 'some/root/Note.md',
					fileType: '.md'
				},
				{
					name: 'Other Folder',
					path: 'some/root/Other Folder',
					fileType: 'folder',
					children: [
						{
							name: 'Other File',
							path: 'some/root/Other Folder/Other File.md',
							fileType: '.md'
						},
						{
							name: 'Sub Name',
							path: 'some/root/Other Folder/Sub Name',
							fileType: 'folder',
							children: [
								{
									name: 'Sub Name',
									path: 'some/root/Other Folder/Sub Name/Sub Name.md',
									fileType: '.md'
								}
							]
						}
					]
				},
				{
					name: 'note.with.periods',
					path: 'some/root/note.with.periods.md',
					fileType: '.md'
				},
				{
					name: 'Test Name',
					path: 'some/root/Test Name',
					fileType: 'folder',
					children: [
						{
							name: 'Test Name',
							path: 'some/root/Test Name/Test Name.md',
							fileType: '.md'
						}
					]
				},
				{
					name: 'Note Name',
					path: 'some/root/Note Name',
					fileType: 'folder',
					children: []
				},
				{
					name: 'Note Name',
					path: 'some/root/Note Name.md',
					fileType: '.md'
				}
			]
		}
	
		let store = new DirectoryStore(root)
		store.caseSensitive = false

		return store
	}

	test('Distance between Items', () => {
		const store = getTestStore()
		const root = store.getRoot(0)
		expect(store.getDistanceBetween(
			root,
			root.children[0]
		)).toEqual({ ancestor: root, distance: 1 })
		
		expect(store.getDistanceBetween(
			root.children[0],
			root.children[1]
		)).toEqual({ ancestor: root, distance: 0 })
		
		expect(store.getDistanceBetween(
			root,
			root.children[0].children[2].children[0]
		)).toEqual({ ancestor: root, distance: 3 })

		expect(store.getDistanceBetween(
			root.children[0].children[0],
			root.children[0].children[2].children[0]
		)).toEqual({ ancestor: root.children[0], distance: 1 })

		expect(store.getDistanceBetween(
			root.children[0].children[0],
			root.children[3].children[0]
		)).toEqual({ ancestor: root, distance: 2 })

		expect(store.getDistanceBetween(
			root.children[3].children[0],
			root.children[0].children[2].children[0]
		)).toEqual({ ancestor: root, distance: 3 })
	})

	test('Finding from raw name', () => {
		const store = getTestStore()

		expect(store.getMatchesForPath('some_file', { bestOnly: true }))
			.toBe(store.getRoot(0).children[1])
		expect(store.getMatchesForPath('Test Note', { bestOnly: true }))
			.toBe(store.getRoot(0).children[0].children[1])
	})

	test('Finding with extension', () => {
		const store = getTestStore()

		expect(store.getMatchesForPath('some_file.txt', { bestOnly: true }))
			.toBe(store.getRoot(0).children[1])
	})

	test('Finding with extension-like name', () => {
		const store = getTestStore()

		expect(store.getMatchesForPath('note.with.periods', { bestOnly: true }))
			.toBe(store.getRoot(0).children[4])
	})

	test('Finding from path name', () => {
		const store = getTestStore()
		const root = store.getRoot(0)

		expect(store.getMatchesForPath('a_child/some_file', { bestOnly: true }))
			.toBe(root.children[0].children[0])

		expect(store.getMatchesForPath('Such Depth/some_file', { bestOnly: true }))
			.toBe(root.children[0].children[2].children[0])
		
		expect(store.getMatchesForPath('a_child/Such Depth/some_file', { bestOnly: true }))
			.toBe(root.children[0].children[2].children[0])
	})

	test('Finding with context', () => {
		const store = getTestStore()
		const root = store.getRoot(0)

		expect(store.getMatchesForPath(
			'some_file',
			{
				origin: root.children[2],
				bestOnly: true 
			}
		)).toBe(root.children[1])

		expect(store.getMatchesForPath(
			'some_file',
			{
				origin: root.children[0].children[1],
				bestOnly: true
			}
		)).toBe(root.children[1])
	})

	test('Finding outer file with context', () => {
		const store = getTestStore()
		const root = store.getRoot(0)

		expect(store.getMatchesForPath(
			'Other File',
			{
				origin: root.children[0].children[1],
				bestOnly: true
			}
		)).toBe(root.children[3].children[0])

		expect(store.getMatchesForPath(
			'some_file',
			{
				origin: root.children[3].children[0],
				bestOnly: true
			}
		)).toBe(root.children[1])
	})

	test('Fuzzy find', () => {
		const store = getTestStore()
		const root = store.getRoot(0)

		expect(store.getMatchesForPath('Note', { fuzzy: true }))
			.toEqual([
				root.children[0].children[1],
				root.children[2],
				root.children[4],
				root.children[6],
				root.children[7]
			])
	})

	test('Case sensitivity', () => {
		const store = getTestStore()
		store.caseSensitive = true

		expect(store.getMatchesForPath('note'))
			.toEqual([])

		store.caseSensitive = false
		expect(store.getMatchesForPath('note'))
			.toEqual(store.getRoot(0).children[2])
	})

	it('Should not return any matches when there are no valid matches', () => {
		const store = getTestStore()

		expect(store.getMatchesForPath('Floogle', {
			fuzzy: true,
			includeMatches: 'all'
		})).toEqual([])
	})

	describe('Get Path to Item', () => {
		const store = getTestStore()
		const root = store.getRoot(0)

		it('Should return short names for root files', () => {
			expect(store.getPathToItem(
				root.children[1]
			)).toEqual('some_file.txt')
	
			expect(store.getPathToItem(
				root.children[2]
			)).toEqual('Note.md')
		})

		it('Should return full paths for root files', () => {
			expect(store.getPathToItem(
				root.children[0].children[0]
			)).toEqual('a_child/some_file.txt')
	
			expect(store.getPathToItem(
				root.children[0].children[2].children[0]
			)).toEqual('a_child/Such Depth/some_file.txt')
		})

		it('Short should return short names when there is no ambiguity', () => {
			expect(store.getPathToItem(
				root.children[3].children[0],
				{
					length: 'short'
				}
			)).toEqual('Other File.md')
		})

		it('Short should return short names when the target is a clearly superior choice', () => {
			expect(store.getPathToItem(
				root.children[5], { length: 'short' }
			)).toEqual('Test Name')
		})

		it('Short should return short names when the target is a clearly superior choice even in a sub-folder', () => {
			expect(store.getPathToItem(
				root.children[3].children[1], { length: 'short' }
			)).toEqual('Sub Name')
		})

		it('Short should return long names when the target is not the superior choice', () => {
			expect(store.getPathToItem(
				root.children[5].children[0], { length: 'short', includeExtension: false }
			)).toEqual('Test Name/Test Name')
		})
	})

	test('Find folders', () => {
		const store = getTestStore()

		expect(store.getMatchesForPath('a_child/Such Depth', { bestOnly: true }))
			.toBe(store.getRoot(0).children[0].children[2])
	})

	it('Returns a file when it share a name with a folder at the same level', () => {
		const store = getTestStore()

		expect(store.getMatchesForPath('Note Name', { bestOnly: true }))
			.toBe(store.getRoot(0).children[7])
	})
})

describe('getUniquePath()', () => {
	function getTestStore() {
		let root:TreeNode = {
			name: 'root',
			path: 'some/root',
			depth: 1,
			fileType: 'folder',
			children: [
				{
					name: 'file',
					path: 'some/root/file.txt',
					depth: 2,
					fileType: '.txt'
				},
				{
					name: 'numbered',
					path: 'some/root/numbered',
					depth: 2,
					fileType: 'folder',
					children: [
						{
							name: 'file 1',
							path: 'some/root/numbered/file 1.txt',
							depth: 3,
							fileType: '.txt'
						},
						{
							name: 'file 2',
							path: 'some/root/numbered/file 2.txt',
							depth: 3,
							fileType: '.txt'
						},

					]
				}
			]
		}
	
		return new DirectoryStore(root)
	}

	it('Should not modifiy the path if the proposed path is already unique', () => {
		const store = getTestStore()
		expect(store.getUniquePath('some/root/location.txt')).toEqual('some/root/location.txt')
	})

	it('Should append a number to the path if there is a naming collision', () => {
		const store = getTestStore()
		expect(store.getUniquePath('some/root/file.txt')).toEqual('some/root/file 1.txt')
	})

	it('Should recognize existing files with a numbered naming scheme and increment', () => {
		const store = getTestStore()
		expect(store.getUniquePath('some/root/numbered/file 1.txt')).toEqual('some/root/numbered/file 3.txt')
	})
})
