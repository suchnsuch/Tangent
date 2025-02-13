import { filterIterator, mapIterator } from '@such-n-such/core'
import { Clause, ClauseGroup, ClauseType, ClauseMod, isGroup, parseQueryText, PartialClauseReference, PartialClauseValue, Query, QueryError, PartialClauseType, TodoQueryState, tagContainsTag, ClauseGroupMod } from '@such-n-such/tangent-query-parser'
import QueryInfo, { queryFileType } from 'common/dataTypes/QueryInfo'
import { DirectoryStore, iterateOverChildren, TreeNode, TreePredicateResult, validatePath } from 'common/trees'
import { getFileTypeRegex, imageFileExtensions } from 'common/fileExtensions'
import { addPreviewToReference, Annotation, areNodesOrReferencesEquivalent, cleanReference, createReference, getNode, getNodeFromReference, isNode, isReference, isSubReference, TreeNodeOrReference } from 'common/nodeReferences'
import type { ObjectStore } from 'common/stores'
import { IndexData, TodoState } from './indexTypes'
import { getTextAnnotations } from './queryAnnotations'
import type { QueryResult } from './queryResults'
import { getTagPath, isTagTreeNode, TagTreeNode } from './TagNode'

export interface QuerySolverInterop {
	directory: DirectoryStore
	getFileContents(path: string): Promise<string>
	getFileData<T extends ObjectStore>(node: TreeNode): Promise<T>

	log: {
		log: (...any) => void
		warn: (...any) => void
		error: (...any) => void
	}
	
	noteFileExtensions: string[]
}

type ReferenceIterator = (handler: (item: TreeNodeOrReference, mod?: ClauseMod) => boolean) => boolean

function doesTextMatch(text: string, partial: PartialClauseValue): boolean {
	if ('text' in partial) {
		return text.includes(partial.text)
	}
	if ('regex' in partial) {
		return text.match(partial.regex) != null
	}
	return false
}


function newSet() { return new Set<TreeNodeOrReference>() }
const emptySet = newSet()

function printClause(clause: Clause) {
	let result = '( ' + clause.type + ' '

	if ('text' in clause) {
		result += '"' + clause.text + '"'
	}
	else if ('regex' in clause) {
		result += '/' + clause.regex.source + '/' + clause.regex.flags
	}
	else if ('reference' in clause) {
		result += '[[' + clause.reference + ']]'
	}

	return result + ' )'
}

function addAllToSet<T>(set: Set<T>, items: Iterable<T>) {
	for (const i of items) {
		set.add(i)
	}
}

function allValidNodes(directory: DirectoryStore) {
	return directory.allContents(n => {
		if (n.name.startsWith('.')) return TreePredicateResult.Ignore
		return TreePredicateResult.Include
	})
}

function doTodoStatesMatch(state: TodoState, query: TodoQueryState): boolean {
	switch (query) {
		case TodoQueryState.Any:
			return true
		case TodoQueryState.Open:
			return state === 'open'
		case TodoQueryState.Complete:
			return state === 'checked'
		case TodoQueryState.Canceled:
			return state === 'canceled'
		case TodoQueryState.Closed:
			return state === 'checked' || state === 'canceled'
		default:
			return false
	}
}

/**
 * Filters a TNoR iterator based on a predicate.
 * Provides intelligent conversion of TreeNodes to References by returning annotations
 */
function* queryFilter(iterator: Iterable<TreeNodeOrReference>, predicate: (item: TreeNodeOrReference) => (boolean | TreeNodeOrReference | Annotation[])): Generator<TreeNodeOrReference> {
	for (const item of iterator) {
		const itemIsReference = isReference(item)
		const result = predicate(item)
		if (result === true) {
			yield item
		}
		else if (result === false) {
			continue // False means filtered out
		}
		else if (Array.isArray(result)) {
			// Non-empty Annotations indicate success; else filtered out
			// TODO: Convert to a model where we don't need to allocate an empty array for every failed item
			if (result.length > 0) {
				if (itemIsReference) {
					if (item.annotations) {
						// Append annotations
						item.annotations.push(...result)
					}
					else {
						// Set annotations
						item.annotations = result
					}
					yield item
				}
				if (!itemIsReference) {
					// Convert to reference with annotations
					yield createReference(item, true, { annotations: result })
				}
			}
		}
		else if (result) {
			// A non-null TreeNodeOrReference is a success
			yield result
		}
	}
}

export async function solveQuery(query: Query, interop: QuerySolverInterop): Promise<QueryResult> {
	const { directory, getFileContents, getFileData, noteFileExtensions, log } = interop

	const forms = query.forms

	const errors: QueryError[] = []

	let extensions = new Set<string>()
	for (const form of forms) {
		switch (form) {
			case 'Sets':
				extensions.add('folder')
				extensions.add('.tangentquery')
				break
			case 'Folders':
				extensions.add('folder')
				break
			case 'Queries':
				extensions.add('.tangentquery')
				break
			case 'Files':
				addAllToSet(extensions, noteFileExtensions)
				addAllToSet(extensions, imageFileExtensions)
				break
			case 'Notes':
				addAllToSet(extensions, noteFileExtensions)
				break
			case 'Images':
				addAllToSet(extensions, imageFileExtensions)
				break
		}
	}

	const validFileTypeMatcher = getFileTypeRegex([...extensions.values()])

	const baseSet = newSet()
	for (const node of allValidNodes(directory)) {
		if (node.fileType.match(validFileTypeMatcher)) {
			baseSet.add(node)
		}
	}

	function getReferenceFromClause(clause: PartialClauseReference) {
		const validatedReference = validatePath(clause.reference)
		if (validatedReference === false) {
			errors.push({
				start: 0, end: 0, // TODO: Real numbers
				message: `Wiki reference "${clause.reference}" could not be validated.`
			})
			return null
		}
		const referencedNode = directory.getMatchesForPath(validatedReference, { bestOnly: true })
		if (!referencedNode || Array.isArray(referencedNode)) {
			errors.push({
				start: 0, end: 0, // TODO: Real numbers
				message: `Wiki reference "${clause.reference}" could not be resolved.`
			})
			return null
		}
		return referencedNode
	}

	/**
	 * Solves a given query and provides a reference iterator
	 * for the values it finds.
	 */
	async function getQueryReferenceIterator(query: Query, type: PartialClauseType) {
		const subqueryResult = await solveQuery(query, interop)
		if (subqueryResult.errors) {
			errors.push({
				start: 0, end: 0, // TODO: Real numbers,
				message: 'Subquery failed!'
			})
			return null
		}
		else {
			const effectiveMod = type.mod ?? (type.type === ClauseType.With ? ClauseMod.All : ClauseMod.Any)

			if (effectiveMod === ClauseMod.All) {
				return handler => {
					// Items must match all items contained in the set
					for (const item of subqueryResult.items) {
						const itemResult = handler(item, type.mod)
						if (!itemResult) return false
					}
					return true
				}
			}
			if (effectiveMod === ClauseMod.Any) {
				return handler => {
					// Items need only match one item contained in the set
					for (const item of subqueryResult.items) {
						const itemResult = handler(item, type.mod)
						if (itemResult) return true
					}
				}
			}
			log.error('Unandled mod', type)
			return null
		}
	}

	/**
	 * Creates a function that will iterate over all of the items represented by a clause.
	 * @param clause The clause to check. Technically only works for reference & query clauses.
	 * @returns A function that will iterate over all referenced items. Null if there is an error. Undefined if the clause is not one that would contain references.
	 */
	async function getReferenceIterator(clause: Clause): Promise<ReferenceIterator> {
		if ('reference' in clause) {
			const referencedNode = getReferenceFromClause(clause)
			if (!referencedNode) return null

			if (referencedNode.fileType === queryFileType) {
				// This is referencing a query, which should act like a subquery
				const info = await getFileData<QueryInfo>(referencedNode)
				if (info === null) {
					errors.push({
						start: 0, end: 0, // TODO: Real numbers
						message: `Could not get query info from "${clause.reference}".`
					})
					return null
				}

				// Query must be parsed before it can be solved like a standard subquery
				const queryResult = parseQueryText(info.queryString.value)
				if (queryResult.errors || !queryResult.query) {
					errors.push({
						start: 0, end: 0, // TODO: Real numbers
						message: `Could not parse query in "${clause.reference}".`
					})
					return null
				}

				return getQueryReferenceIterator(queryResult.query, clause)
			}
			else {
				return handler => {
					// Implicit any for single references
					return handler(referencedNode, ClauseMod.Any)
				}
			}
		}
		if ('query' in clause) {
			return getQueryReferenceIterator(clause.query, clause)
		}
	}

	async function cacheNodeContents(ref: TreeNodeOrReference) {
		if (isNode(ref)) {
			ref = createReference(ref, true)
		}
		if (!ref.content) {
			const node = getNodeFromReference(ref, directory)
			if (node.fileType === 'folder' || node?.meta?.virtual) {
				ref.content = ''
			}
			else {
				ref.content = await getFileContents(ref.path) || ''
			}
		}
		if (!ref.lines) {
			ref.lines = ref.content.split('\n')
		}
		return ref
	}

	async function solveClause(clause: Clause, set: Set<TreeNodeOrReference>) {
		if (clause.type === ClauseType.Named) {
			return new Set(filterIterator(set, n => {
				let name: string = null
				if (isReference(n)) {
					name = n.title ?? getNodeFromReference(n, directory).name
				}
				else {
					name = n.name
				}

				return doesTextMatch(name, clause)
			}))
		}
		else if (clause.type === ClauseType.In) {
			const iterator = await getReferenceIterator(clause)
			if (iterator) {
				return new Set(filterIterator(set, item => {
					return iterator((reference, mod) => {
						if (mod === undefined) {
							// This is a raw "is this in the set" check
							return areNodesOrReferencesEquivalent(item, reference)
						}

						const referenceNode = getNode(reference, directory)

						if (referenceNode.fileType === 'folder') {
							let parent: TreeNode = null
							if (isSubReference(item)) {
								parent = getNodeFromReference(item, directory)
							}
							else {
								parent = directory.getParent(item.path)
							}

							// Need to check all parents
							while (parent) {
								if (parent == referenceNode) return true
								parent = directory.getParent(parent.path)
							}

							return false
						}

						return false
					})
				}))
			}
			return emptySet
		}
		else if (clause.type === ClauseType.With) {
			const iterator = await getReferenceIterator(clause)
			if (iterator) {
				return new Set(filterIterator(set, item => {
					return iterator(reference => {
						if (isNode(item)) {
							for (const connection of IndexData.outgoingConnections(item.meta)) {
								if (connection.to === reference.path) {
									return true
								}
							}
						}
						// TODO: sub-section references
						return false;
					})
				}))
			}
			else if (iterator === null) {
				log.error(`Failed to create a reference iterator for clause:`, clause)
				// The clause was _set up_ for holding references,
				// but resolving the reference _failed_
				return emptySet
			}
			else if ('tag' in clause) {
				const tagPath = getTagPath(clause.tag.names)
				const searchTag = directory.get(tagPath)
				if (!searchTag) return emptySet // Not an error: user just searched for a tag that doesn't exist

				if (!isTagTreeNode(searchTag)) {
					log.warn(`Tag path "${tagPath}" does not resolve to a TagNode: `, searchTag)
					return emptySet
				}
				
				return new Set(queryFilter(set, item => {
					const node = getNode(item, directory)
					if (isSubReference(item)) {
						log.warn('Tags in sub references not yet supported!', item)
						return false
					}

					const annotations: Annotation[] = []

					for (const tag of IndexData.tags(node.meta)) {
						const tagNode = directory.get(tag.to)
						if (!tagNode) {
							log.error(`While filtering for tag "${searchTag.path}", found an item (${node.path}) with a tag reference that points to nothing (${tag.to})`, node)
							continue
						}
						if (!isTagTreeNode(tagNode)) {
							log.error(`While filtering for tag "${searchTag.path}", found an item (${node.path}) with a tag reference that points to a non-tag item (${tag.to})`, node, tagNode)
							continue
						}
						if (tagContainsTag(searchTag.names, tagNode.names)) {
							annotations.push({
								start: tag.start,
								end: tag.end,
								data: tag
							})
						}
					}

					return annotations
				}))
			}
			else if ('todo' in clause) {
				return new Set(queryFilter(set, item => {
					const node = getNode(item, directory)
					if (isSubReference(item)) {
						log.warn('Todos in sub references not yet supported!', item)
						return false
					}

					const targetState = clause.todo
					
					const annotations: Annotation[] = []
					
					for (const todo of IndexData.todos(node.meta)) {
						if (doTodoStatesMatch(todo.state, targetState)) {
							annotations.push({
								start: todo.start,
								end: todo.end,
								data: todo
							})
						}
					}

					return annotations
				}))
			}
			else if ('text' in clause || 'regex' in clause) {
				const contentsResult = await Promise.all(mapIterator(set, async ref => {

					ref = await cacheNodeContents(ref)

					if (isSubReference(ref)) {
						// TODO: Anything
					}
					else {
						const annotations = getTextAnnotations(ref.content, clause)
						if (annotations && annotations.length) {

							if (!ref.annotations) ref.annotations = annotations
							else ref.annotations.push(...annotations)

							for (const annotation of annotations) {
								let lineStart = 0
								for (const line of ref.lines) {
									const lineEnd = lineStart + line.length

									if (annotation.start < lineEnd) {
										if (!ref.preview) ref.preview = []
										addPreviewToReference(ref, {
											start: lineStart,
											content: line
										})
									}
								}
							}

							return ref
						}
					}

					return null
				}))

				return new Set<TreeNodeOrReference>(contentsResult.filter(ref => ref != null))
			}
		}

		errors.push({
			start: 0, end: 0, // TODO: Real numbers
			message: `Unhandled clause: ${printClause(clause)}`
		})
		return emptySet
	}

	async function solveGroup(group: ClauseGroup, set: Set<TreeNodeOrReference>): Promise<Set<TreeNodeOrReference>> {

		let sourceSet: Set<TreeNodeOrReference> = group.mod === ClauseGroupMod.Not ? new Set(set) : set

		if (group.join === 'and') {
			for (let i = 0; i < group.clauses.length && set.size > 0; i++) {
				const item = group.clauses[i]
				if (isGroup(item)) {
					set = await solveGroup(item, set)
				}
				else {
					set = await solveClause(item, set)
				}
			}
		}
		else if (group.join === 'or') {
			const sets = await Promise.all(group.clauses.map(item => {
				if (isGroup(item)) {
					return solveGroup(item, set)
				}
				return solveClause(item, set)
			}))
			
			set = sets[0]
			for (let i = 1; i < sets.length; i++) {
				addAllToSet(set, sets[i])
			}
		}
		else {
			throw new Error(`Malformed group join "${group.join}`)
		}

		if (group.mod === ClauseGroupMod.Not) {
			// Negate the group
			return new Set(queryFilter(sourceSet, i => !set.has(i)))
		}
		
		return set
	}

	if (errors.length) {
		return { query, errors }
	}

	const items = [...mapIterator(await solveGroup(query, baseSet), item => {
		if (isNode(item)) return createReference(item)

		cleanReference(item)
		return item
	})]

	return { query, items }
}
