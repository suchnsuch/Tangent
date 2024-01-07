import { mapIterator } from '@such-n-such/core'
import { TreeNode, forAllNodes, DirectoryStore, TreePredicateResult, defaultStoreFilter } from 'common/trees'
import type { ObjectStore } from 'common/stores'
import { ConnectionInfo, HrefFormedLink, IndexData, IndexDataUpdate } from './indexTypes'

import { linkInfoToText, MarkdownParsingOptions, parseMarkdown } from '../markdownModel/parser'
import { getExtensionRegex } from '../fileExtensions'

import Logger from 'js-logger'
import paths from '../paths'
import { imageFileExtensions, noteFileExtensions } from '../fileExtensions'

import type { Registry } from 'vscode-textmate'
import type { QueryResult } from './queryResults'
import { parseQueryText } from '@such-n-such/tangent-query-parser'
import { solveQuery } from './querySolving'
import type IndexTreeStore from './IndexTreeStore'
import type { TagTreeNode } from './TagNode'

const log = Logger.get('indexer')
const queryLog = Logger.get('queries')

const parseableFileMatch = getExtensionRegex(noteFileExtensions)
const indexableFileMatch = getExtensionRegex([
	...noteFileExtensions,
	...imageFileExtensions
])

interface LinkConfirmation {
	node: TreeNode,
	href: string,
	oldPath?: string
}

export interface IndexInterop {
	getFileContents(path: string): Promise<string>
	getFileData<T extends ObjectStore>(node: TreeNode): Promise<T>
	getNodeOrPlaceholder(link: HrefFormedLink): TreeNode | null

	updateFileContents(filepath: string, contents: string): Promise<unknown>
	updateMetadata(files: IndexDataUpdate[])
	removeVirtualFile(virtualPath: string, replacementPath?: string)
}

export interface IndexerOptions {
	store: IndexTreeStore<TreeNode, TagTreeNode>
	interop: IndexInterop
	registry: Registry
}

export default class Indexer {

	interop: IndexInterop
	store: IndexTreeStore<TreeNode, TagTreeNode>
	registry: Registry
	linkCache: Map<string, TreeNode>

	parsingOptions: MarkdownParsingOptions = {
		detailedLinks: true,
		parseFrontMatter: true
	}

	constructor(options: IndexerOptions) {
		this.store = options.store
		this.interop = options.interop
		this.registry = options.registry
	}

	async initializeFromRaw(rawIndex: any) {

		// Actually load index
		let rawMap = new Map<string, IndexData>()
		
		if (rawIndex?.items) {
			for (const item of rawIndex.items) {
				rawMap.set(item.path, {
					modified: new Date(item.modified),
					structure: item.structure
				})
			}
		}

		let nodeMap = new Map<string, TreeNode>()

		let tasks = []
		forAllNodes(this.store.files, (node, parent) => {
			if (!this.isParseableFile(node))
				return
			nodeMap.set(node.path, node)

			if (node.meta) {
				return
			}

			const existing = rawMap.get(node.path)
			if (existing) {
				node.meta = existing
			}
			if (!existing || !node.modified || existing.modified < node.modified) {
				// Needs to be re-indexed
				tasks.push(this.interop.getFileContents(node.path).then(c =>  {
					node.meta = this.parseFile(node, c)
				}))
			}
		})

		await Promise.all(tasks)

		// TODO: don't reset this every load
		for (const node of nodeMap.values()) {
			node.meta.inLinks = []
		}

		// Validate & connect links, using cache
		this.linkCache = new Map()

		for (const node of nodeMap.values()) {
			const meta = node.meta as IndexData
			if (meta.structure) {
				for (let connection of IndexData.outgoingConnections(meta)) {
					this.applyLink(node, connection)
				}
			}
		}

		this.linkCache = null

		this.interop.updateMetadata([...mapIterator(nodeMap.values(), n => {
			return {
				path: n.path,
				meta: n.meta
			}
		})])

		return nodeMap
	}

	isParseableFile(node: TreeNode) {
		return node.fileType.match(parseableFileMatch)
	}
	
	isIndexableFile(node: TreeNode) {
		return node.fileType.match(indexableFileMatch)
	}

	onFileContentChanged(target: TreeNode | string, contents: string) {
		const node = (typeof target === 'string') ? this.store.get(target) : target
		
		if (!node || !this.isParseableFile(node))
			return
			
		log.debug(node.path, 'changed, indexing contents')
		
		const existingData = node.meta
		const parsedData = this.parseFile(node, contents)
		
		const dirtyMeta = new Set<TreeNode>()
		dirtyMeta.add(node)

		if (existingData) {
			// Clear out any old references – restore them later
			for (const link of IndexData.outgoingConnections(existingData)) {
				if (!link.to) continue
				const target = this.store.get(link.to)
				if (target?.meta?.inLinks) {
					// Filter out all links from the changed node
					target.meta.inLinks = target.meta.inLinks.filter(l => {
						return l.from !== node.path
					})

					dirtyMeta.add(target)
				}
			}
		}

		for (const link of IndexData.outgoingConnections(parsedData)) {
			const target = this.applyLink(node, link)
			dirtyMeta.add(target)
		}

		if (existingData?.virtual && contents) {
			existingData.virtual = false
		}

		node.meta = Object.assign(node.meta || {}, parsedData)

		this.interop.updateMetadata([...mapIterator(dirtyMeta, n => {
			return {
				path: n.path,
				meta: n.meta
			}
		})])

		for (const node of dirtyMeta) {
			// Re-indexing a node should not ever remove it
			if (node !== target && node?.meta?.virtual && !node.meta.inLinks?.length) {
				// If a virtual node no longer has inlinks after connections are reset,
				// we want it gone.
				node.meta = null
				this.interop.removeVirtualFile(node.path)
			}
		}
	}

	private parseFile(node: TreeNode, contents?: string): IndexData {
		if (node.fileType.match(parseableFileMatch)) {
			try {
				const { structure } = parseMarkdown(contents, this.parsingOptions)

				return {
					modified: node.modified,
					structure
				}
			}
			catch (e) {
				log.error('Failed to parse file:' + node.path)
				log.log(e)
			}

			// Return an empty meta file
			return {}
		}
	}

	/**
	 * Applies a link with the given information and source to a target
	 * @param node The source node
	 * @param connection The link informatino
	 * @returns The target of the link
	 */
	private applyLink(node: TreeNode, connection: ConnectionInfo): TreeNode {
		let target: TreeNode = null
		if (connection.to) {
			target = this.store.get(connection.to)
		}
		else if (connection.href) {
			if (this.linkCache) {
				// This will break if links ever support relativity
				const cacheID = connection.type.toString() + connection.href
				target = this.linkCache.get(cacheID)
				if (!target) {
					target = this.interop.getNodeOrPlaceholder(connection)
					this.linkCache.set(cacheID, target)	
				}
			}
			else {
				target = this.interop.getNodeOrPlaceholder(connection)
			}
		}
		if (!target) return

		connection.to = target.path

		let targetMeta = target.meta as IndexData
		if (!targetMeta) {
			// This occurs if the other note has not been initialized
			target.meta = targetMeta = {}
		}
		if (!targetMeta.inLinks)
			targetMeta.inLinks = []
		
		const otherConnection = {
			type: connection.type,
			href: connection.href,
			start: connection.start,
			end: connection.end,
			from: node.path,
			form: connection.form,
			context: connection.context
		} as ConnectionInfo
		
		if (connection.text) {
			otherConnection.text = connection.text
		}

		targetMeta.inLinks.push(otherConnection)

		return target
	}

	/**
	 * Updates links in and out of the given node.
	 * Also updates all links that need to become more specific due to name collisions.
	 * @param seedNode The node that is renamed
	 * @param oldPath The node's path prior to being renamed
	 */
	async handleNodeRename(seedNode: TreeNode, oldPath?: string) {
		if (!this.isIndexableFile(seedNode)) return

		const linkedNodes: Map<string, LinkConfirmation> = new Map()

		const seedNodeInfo: LinkConfirmation = {
			node: seedNode,
			href: '', // Set this later so any removed virtual files do not affect results
			oldPath
		}

		linkedNodes.set(seedNode.path, seedNodeInfo)
		const dirtyMeta: Set<TreeNode> = new Set()

		if (oldPath) {
			linkedNodes.set(oldPath, seedNodeInfo)

			// Updates in-links for the linked-to nodes
			dirtyMeta.add(seedNode)
			const visitedPaths = new Set<string>()
			for (const outLink of IndexData.outgoingConnections(seedNode.meta)) {
				outLink.from = seedNode.path
				if (visitedPaths.has(outLink.to)) continue

				visitedPaths.add(outLink.to)
				const target = this.store.get(outLink.to)
				if (target?.meta?.inLinks) {
					let dirty = false
					for (const link of target.meta.inLinks) {
						if (link.from === oldPath) {
							link.from = seedNode.path
							dirty = true
						}
					}
					if (dirty) {
						dirtyMeta.add(target)
					}
				}
			}
		}

		// Collect other items that could be affected
		// e.g. Creating or renaming a node to the same name as another note
		// requires other notes to become more specific to retain the link.
		const nameMatchResult = this.store.getMatchesForPath(seedNode.name)
		if (Array.isArray(nameMatchResult)) {

			for (const node of nameMatchResult) {
				if (node === seedNode) continue

				if (node.meta?.virtual) {
					const virtualNode = node
					
					if (virtualNode.meta.inLinks) {
						for (let i = 0; i < virtualNode.meta.inLinks.length; i++) {
							const link = virtualNode.meta.inLinks[i]

							const unvirtualResult = this.store.getMatchesForPath(link.href, {
								bestOnly: true,
								filter: (item) => {
									// Pretend the virtual file doesn't exist.
									if (item === virtualNode) return TreePredicateResult.Ignore
									return defaultStoreFilter(item)
								}
							})

							if (unvirtualResult === seedNode) {
								// This connection should be re-resolved
								const source = this.store.get(link.from)
								const outLink = IndexData.findOutgoingConnection(
									source.meta,
									l => l.start === link.start && l.end === link.end)
								
								if (outLink) {
									// Drop this connection from the virtual node
									virtualNode.meta.inLinks.splice(i, 1)
									i--

									dirtyMeta.add(virtualNode)
									dirtyMeta.add(source)

									// Burn the cached path and reaquire
									outLink.to = seedNode.path
									const target = this.applyLink(source, outLink)
									if (target) {
										dirtyMeta.add(target)
									}
								}
							}
						}

						if (virtualNode.meta.inLinks.length === 0) {
							// Remove the virtual file, replacing it with this one
							this.interop.removeVirtualFile(node.path, seedNode.path)
							// No need to sent updates for something that won't exist
							dirtyMeta.delete(virtualNode)

							continue
						}
					}
				}

				linkedNodes.set(node.path, {
					node,
					href: this.store.getPathToItem(node, {
						includeExtension: false,
						length: 'short' // Use short path in case _this_ node is not the best match
					})
				})
			}
		}
		else if (!oldPath) {
			return
		}

		// Generate target href after removing any virtual nodes
		seedNodeInfo.href = this.store.getPathToItem(seedNode, {
			length: 'short',
			includeExtension: seedNode.fileType.match(parseableFileMatch) == null
		})
		
		// Collect all of the nodes that link into the affected nodes
		let affectedNodes: Set<TreeNode> = new Set()
		for (const info of linkedNodes.values()) {
			if (!info.node.meta?.inLinks) {
				console.debug(`${info.node.name} has no inlinks`)
				continue
			}
			for (const link of info.node.meta.inLinks) {
				const node = this.store.get(link.from)
				if (node) {
					affectedNodes.add(node)
				}
			}
		}

		this.interop.updateMetadata([...mapIterator(dirtyMeta, n => {
			return {
				path: n.path,
				meta: n.meta
			}
		})])

		await Promise.all(mapIterator(affectedNodes, node => {
			return this.confirmLinks(node, linkedNodes)
		}))
	}

	/**
	 * Ensures that a file has the correct meta and text links for a target.
	 **/
	private async confirmLinks(
		target: TreeNode,
		linkedNodes: Map<string, LinkConfirmation>)
	{
		let text = await this.interop.getFileContents(target.path)

		const theLinks = [...IndexData.outgoingConnections(target.meta, link => {
			const linkedNode = linkedNodes.get(link.to)
			// Capture both nodes that need their href updated and nodes that no longer point to the right place
			return linkedNode && (linkedNode.href !== link.href || linkedNode.node.path !== link.to)
		})]
		.sort((a, b) =>  a.start - b.start)

		let adjustStart = 0

		let metaChanged = false

		for (const link of theLinks) {
			const linkedInfo = linkedNodes.get(link.to)
			
			// If something has moved and wouldn't cause a text change,
			// this needs to be updated
			if (link.to !== linkedInfo.node.path) {
				link.to = linkedInfo.node.path
				metaChanged = true;
			}

			if (link.href !== linkedInfo.href) {
				metaChanged = true
				const { start, end } = link
				const pre = text.substring(0, start + adjustStart)
				const linkText = text.substring(start + adjustStart, end + adjustStart)
				const post = text.substring(end + adjustStart)

				link.href = linkedInfo.href
				const newLinkText = linkInfoToText(link)

				adjustStart += newLinkText.length - linkText.length

				// TODO: Could push to an array of text and then join at the end
				text = pre + newLinkText + post
			}
		}

		if (metaChanged) {
			this.interop.updateMetadata([{
				path: target.path,
				meta: target.meta
			}])
		}

		await this.interop.updateFileContents(target.path, text) 
	}

	getBestVirtualFile(filepath: string): TreeNode {
		let extension = paths.extname(filepath)
		if (!extension.match(parseableFileMatch)) return null

		let name = paths.basename(filepath, extension)
		let result = this.store.getMatchesForPath(name, {
			bestOnly: true
		})

		if (!Array.isArray(result) && result?.meta?.virtual) {
			return result
		}
		return null
	}

	async solveQuery(queryText: string): Promise<QueryResult> {
		const query = parseQueryText(queryText)
		if (query.errors) {
			return {
				query
			}
		}

		const result = await solveQuery(query.query, {
			directory: this.store,
			getFileContents: this.interop.getFileContents,
			getFileData: this.interop.getFileData,
			log: queryLog,
			noteFileExtensions
		})

		result.query = query
		return result
	}
}
