import type { TreeNode, DirectoryLookup } from 'common/trees'
import { ObjectStore } from 'common/stores'
import MapConnection from './MapConnection'
import { MapConnectionList } from './MapConnection'
import MapNode, { collectDescendants, MapStrength } from './MapNode'
import { MapNodeStore } from './MapNodeStore'
import { IndexData } from 'common/indexing/indexTypes'
import Logger from 'js-logger'

export type SomeNode = MapNode | TreeNode | string

const log = Logger.get('TangentMap')

type ConnectionOptions = {
	from: SomeNode
	to: SomeNode
	strength?: MapStrength
	date?: Date
	preventRecursiveLinks?: boolean
}

export default class TangentMap extends ObjectStore {
	nodes: MapNodeStore
	connections: MapConnectionList

	constructor(directory: DirectoryLookup, initialPatch?: any) {
		super()

		this.nodes = new MapNodeStore(directory)
		this.connections = new MapConnectionList(this.nodes)

		if (initialPatch) {
			this.applyPatch(initialPatch)
		}
		this.setupObservables()
	}

	get(node: SomeNode) {
		if (node instanceof MapNode) return node
		if (typeof node === 'string') {
			node = this.nodes.directory.get(node)
		}
		return this.nodes.get(node)
	}

	getOrCreate(node: SomeNode, strength: MapStrength) {
		if (!node) {
			console.error('Cannot get or create a map node from falsy value', node)
			return null
		}
		
		let foundNode: MapNode = null
		if (!(node instanceof MapNode)) {
			if (typeof node === 'string') node = this.nodes.directory.get(node)
			foundNode = this.nodes.get(node)
			if (foundNode) {
				node = foundNode
			}
			else {
				const createdNode = this.nodes.getOrCreate(node, { strength })
				if (createdNode) {
					node = createdNode
				}
				else {
					console.error('Could not create a map node from', node)
					return null
				}
			}
		}
		
		const foundStrength = node.strength.value
		if ((foundStrength & strength) === MapStrength.None) {
			node.strength.set(foundStrength | strength)
		}
		return node
	}

	connect(options?: ConnectionOptions) {

		let strength = options?.strength ?? MapStrength.None

		const from = this.getOrCreate(options?.from, strength)
		const to = this.getOrCreate(options?.to, strength)

		const preventRecursiveLinks = options?.preventRecursiveLinks ?? false

		if (!from || !to) {
			console.warn('Could not connect', from, to)
			return null
		}

		if (from === to) throw new Error('Connecting a map node to itself is invalid')

		let connection = this.findConnection(from, to)
		if (!connection) {

			if (preventRecursiveLinks) {
				// If we can get to 'from' from 'to', this new connection would be recursive
				if (collectDescendants(to).has(from)) return
			}

			if (this.nodes.directory.isParentOf(from.node.value, to.node.value)) {
				strength |= MapStrength.Connected
			}
			else {
				const toPath = to.node.value.path
				for (const connection of IndexData.outgoingConnections(from.node.value.meta)) {
					if (connection.to === toPath) {
						strength |= MapStrength.Connected
						break
					}
				}
			}

			connection = new MapConnection(this.nodes, from, to, strength, options?.date)
			this.connections.add(connection)
		}
		else if (options?.date) {
			// Backdate existing links if requested
			if (connection.dateCreated.getTime() > options.date.getTime()) {
				connection.dateCreated = options.date
			}
		}
		
		// Elevate the connection & node strength
		connection.strength.add(strength)
		from.strength.add(strength)
		to.strength.add(strength)
	}

	findConnection(from: SomeNode, to: SomeNode) {
		from = this.get(from)
		to = this.get(to)

		if (!from || !to) return null

		return this.connections.findConnection(from, to)
	}

	disconnect(connection: MapConnection): void
	disconnect(from: MapNode, to: MapNode): void
	disconnect(from: MapNode | MapConnection, to?: MapNode) {
		if (from instanceof MapNode) {
			let connectionIndex = this.connections.value.findIndex(c => c.from.value === from && c.to.value === to)
			if (connectionIndex >= 0) {
				// TODO: Order is not important; should use a swap action instead
				this.connections.removeAt(connectionIndex)
			}
		}
		else {
			this.connections.remove(from)
		}
	}

	delete(node: MapNode) {

		// TODO: lol this is the worst
		const finder = c => c.from.value === node || c.to.value === node
		let found = this.connections.value.findIndex(finder)
		while (found >= 0) {
			this.connections.removeAt(found)
			found = this.connections.value.findIndex(finder)
		}

		this.nodes.delete(node.node.value)
	}

	clear() {
		this.connections.set([])
		this.nodes.clear()
	}

	notifyNodeReplaced(newPath: string, oldPath: string) {
		this.nodes.notifyNodeReplaced(newPath, oldPath)

		// Handle connection replacement here so that connect() can operate
		for (let i = 0; i < this.connections.length; i++) {
			const connection = this.connections.get(i)

			if (connection.from.value.node.value.path === oldPath) {
				const newTreeNode = this.nodes.directory.get(newPath)
				if (!newTreeNode) {
					log.error('Could not merge nodes from', oldPath, 'to', newPath, '; New node could not be found.')
					continue
				}
				const newNode = this.nodes.getOrCreate(newTreeNode)

				this.connections.removeAt(i)
				i--

				this.connect({
					from: newNode,
					to: connection.to.value,
					strength: connection.strength.value,
					date: connection.dateCreated
				})
			}
			else if (connection.to.value.node.value.path === oldPath) {
				const newTreeNode = this.nodes.directory.get(newPath)
				if (!newTreeNode) {
					log.error('Could not merge nodes from', oldPath, 'to', newPath, '; New node could not be found.')
					continue
				}
				const newNode = this.nodes.getOrCreate(newTreeNode)

				this.connections.removeAt(i)
				i--
				
				this.connect({
					from: connection.from.value,
					to: newNode,
					strength: connection.strength.value,
					date: connection.dateCreated
				})
			}
		}
	}
}
