import { installTextmate } from '@such-n-such/tangent-query-parser'
import type Indexer from 'common/indexing/Indexer'
import type { QueryResult } from 'common/indexing/queryResults'
import { getRegistry } from 'main/grammarLoader'
import path from 'path'
import { INITIAL } from 'vscode-textmate'
import Workspace from '../Workspace'

let workspace: Workspace = null
let solveQuery: Indexer["solveQuery"] = null

function resultToNodePaths(result: QueryResult) {
	expect(result.errors).toBeUndefined()

	return result.items?.map(i => workspace.contentsStore.pathToRelativePath(i.path))
}

beforeAll(async () => {
	const workspacePath = path.resolve(path.join(__dirname, '../../../../../test-files/QueryTestWorkspace'))

	installTextmate({ registry: getRegistry(), initialStack: INITIAL })

	workspace = await Workspace.loadWorkspace(workspacePath)
	solveQuery = workspace.indexer.solveQuery.bind(workspace.indexer)
})

test('Folders named "A Folder"', async () => {
	const result = await solveQuery('Folders named "A Folder"')
	expect(resultToNodePaths(result)).toEqual([
		'A Folder'
	])
})

describe('Notes within Folders', () => {
	test('Notes in [[A Folder]]', async () => {
		const result = await solveQuery('Notes in [[A Folder]]')
		expect(resultToNodePaths(result)).toEqual([
			'A Folder/A Subfolder/Note in Subfolder.md',
			'A Folder/Note in A Folder 1.md',
			'A Folder/Note in A Folder 2.md',
			'A Folder/Note in A Folder 3.md',
		])
	})
	
	test('Notes in [[A Folder]] or [[Another Folder]]', async () => {
		const result = await solveQuery('Notes in [[A Folder]] or [[Another Folder]]')
		expect(resultToNodePaths(result)).toEqual([
			'A Folder/A Subfolder/Note in Subfolder.md',
			'A Folder/Note in A Folder 1.md',
			'A Folder/Note in A Folder 2.md',
			'A Folder/Note in A Folder 3.md',
			'Another Folder/Note in Another Folder 1.md',
			'Another Folder/Note in Another Folder 2.md'
		])
	})
	
	test('Notes in any { Folders named "Folder" }', async () => {
		const result = await solveQuery('Notes in any { Folders named "Folder" }')
		expect(resultToNodePaths(result)).toEqual([
			'A Folder/A Subfolder/Note in Subfolder.md',
			'A Folder/Note in A Folder 1.md',
			'A Folder/Note in A Folder 2.md',
			'A Folder/Note in A Folder 3.md',
			'Another Folder/Note in Another Folder 1.md',
			'Another Folder/Note in Another Folder 2.md'
		])
	})
	
	test("Notes named 'in Folder'", async () => {
		const result = await solveQuery("Notes named 'in Folder'")
		expect(resultToNodePaths(result)).toEqual([
			'A Folder/A Subfolder/Note in Subfolder.md',
			'A Folder/Note in A Folder 1.md',
			'A Folder/Note in A Folder 2.md',
			'A Folder/Note in A Folder 3.md',
			'Another Folder/Note in Another Folder 1.md',
			'Another Folder/Note in Another Folder 2.md'
		])
	})

	test('Notes in nested folders should show up when parents are queried', async () => {
		const result = await solveQuery('Notes in ')
	})
})

describe('Notes With', () => {
	test('Notes with "Zaboomaphoo"', async () => {
		const result = await solveQuery('Notes with "Zaboomaphoo"')
		expect(resultToNodePaths(result)).toEqual([
			'Note with Keyword.md'
		])
	})
	
	test('Notes with \'Zaboom\'', async () => {
		const result = await solveQuery('Notes with \'Zab om\'')
		expect(resultToNodePaths(result)).toEqual([
			'Note with Keyword.md'
		])
	})

	test('Notes with [[A Note to Link To]]', async () => {
		const result = await solveQuery('Notes with [[A Note to Link To]]')
		expect(resultToNodePaths(result)).toEqual([
			'A Multi Link Note.md',
			'Another Link Note.md',
			'Note With Links.md'
		])
	})

	test('Notes with implicit all', async () => {
		const result = await solveQuery('Notes with {Notes named "Note to Link To"}')
		expect(resultToNodePaths(result)).toEqual([
			'A Multi Link Note.md'
		])
	})

	test('Notes with any', async () => {
		const result = await solveQuery('Notes with any {Notes named "Note to Link To"}')
		expect(resultToNodePaths(result)).toEqual([
			'A Multi Link Note.md',
			'Another Link Note.md',
			'Note With Links.md'
		])
	})
})

describe('Group negation', () => {
	// These will be brittle as additions to files will cause the results to expand
	test('Negating a single clause', async () => {
		const result = await solveQuery('Notes not named "Note"')
		expect(resultToNodePaths(result)).toEqual([
			'Tags/Deep Child Tags.md'
		])
	})

	test('Negating a clause group', async () => {
		const result = await solveQuery('Notes not (in [[A Folder]] or [[Another Folder]] or [[Tags]] or [[Todos]])')
		expect(resultToNodePaths(result)).toEqual([
			'A Multi Link Note.md',
			'A Note to Link To.md',
			'Another Link Note.md',
			'Another Note to Link To.md',
			'Note With Links.md',
			'Note With Tag.md',
			'Note with Keyword.md',
		])
	})

	test('Negation with positives', async () => {
		const result = await solveQuery('Notes in [[Todos]] not named "Mixed"')
		expect(resultToNodePaths(result)).toEqual([
			'Todos/Note With Canceled Todos.md',
			'Todos/Note With Closed Todos.md',
			'Todos/Note With Open Todos.md'
		])
	})
})

describe('Query References', () => {
	test('Can get items in named query', async () => {
		const result = await solveQuery('Notes in [[Notes Named Folder]]')
		expect(result.items.length).toEqual(5)
	})
})

describe('Querying Tags', () => {
	test('Can get items with tag', async () => {
		const result = await solveQuery('Notes with #test-tag')
		expect(resultToNodePaths(result)).toEqual([
			'Note With Tag.md'
		])
	})

	describe('Tag Hierarchy', () => {

		test('A parent tag should grab subtags', async () => {
			const result = await solveQuery('Notes with #parent')
			expect(resultToNodePaths(result)).toEqual([
				'Tags/Note With Child A.md',
				'Tags/Note With Child B.md',
				'Tags/Note With Parent.md',
			])
		})
		
		test('A subtag should grab only the subtag', async () => {
			// Use both / characters
			const resultSlash = await solveQuery('Notes with #parent/child-a')
			expect(resultToNodePaths(resultSlash)).toEqual([
				'Tags/Note With Child A.md'
			])

			// and . characters for seperation
			const resultDot = await solveQuery('Notes with #parent.child-a')
			expect(resultToNodePaths(resultDot)).toEqual([
				'Tags/Note With Child A.md'
			])
		})
	})
})

describe('Querying Todos', () => {
	test('Can get items with any todos', async () => {
		const result = await solveQuery('Notes with todos')
		expect(resultToNodePaths(result)).toEqual([
			'Todos/Note With Canceled Todos.md',
			'Todos/Note With Closed Todos.md',
			'Todos/Note With Mixed Todos.md',
			'Todos/Note With Open Todos.md'
		])
	})

	test('Can get items with open todos', async () => {
		const result = await solveQuery('Notes with open todos')
		expect(resultToNodePaths(result)).toEqual([
			'Todos/Note With Mixed Todos.md',
			'Todos/Note With Open Todos.md'
		])
	})

	test('Can get items with canceled todos', async () => {
		const result = await solveQuery('Notes with canceled todos')
		expect(resultToNodePaths(result)).toEqual([
			'Todos/Note With Canceled Todos.md'
		])
	})

	test('Can get items with complete todos', async () => {
		const result = await solveQuery('Notes with complete todos')
		expect(resultToNodePaths(result)).toEqual([
			'Todos/Note With Closed Todos.md',
			'Todos/Note With Mixed Todos.md'
		])
	})

	test('Can get items with closed todos', async () => {
		const result = await solveQuery('Notes with closed todos')
		expect(resultToNodePaths(result)).toEqual([
			'Todos/Note With Canceled Todos.md',
			'Todos/Note With Closed Todos.md',
			'Todos/Note With Mixed Todos.md'
		])
	})
})
