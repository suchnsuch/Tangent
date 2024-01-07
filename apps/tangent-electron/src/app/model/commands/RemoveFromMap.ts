import { Point } from 'common/geometry'
import type { TreeNode } from 'common/trees'
import type Session from 'common/dataTypes/Session'
import type MapNode from 'common/tangentMap/MapNode'
import type { Workspace } from '..'
import type { CommandContext, CommandOptions } from './Command'
import WorkspaceCommand from './WorkspaceCommand'

export interface RemoveFromMapCommandContext extends CommandContext {
	session?: Session
	node?: TreeNode
}

export abstract class RemoveFromMapCommand extends WorkspaceCommand {
	constructor(workspace: Workspace, options?: CommandOptions) {
		super(workspace, options)
	}

	protected fillContext(context?: RemoveFromMapCommandContext): RemoveFromMapCommandContext {
		const tangent = this.workspace.viewState.tangent

		if (!context) context = {}
		context.session = context.session ?? tangent.activeSession.value
		context.node = context.node ?? context.session?.currentThread.value?.currentNode

		return context
	}

	protected getFallbackCurrentNode(session: Session, seed: MapNode): MapNode {
		const thread = session.currentThread.value?.thread
		const map = session.map
		if (!thread) {
			console.error('Cannot get fallback for current node without a session!')
			return
		}

		const threadIndex = thread.indexOf(seed.node.value)
		if (threadIndex > 0) {
			return map.get(thread[threadIndex - 1])
		}
		else if (threadIndex === 0 && thread.length >= 2) {
			return map.get(thread[threadIndex + 1])
		}

		if (seed.incoming.length) {
			return seed.incoming[0].from.value
		}

		let closest: MapNode = null
		let closestDistance = Number.MAX_VALUE
		const seedPoint = seed.position()
		for (const item of map.nodes.values()) {
			if (item === seed) continue

			const itemPoint = item.position()
			if (itemPoint.x > seedPoint.x) continue

			const distance = Point.squareDistance(
				seedPoint,
				itemPoint)
		
			if (!closest || distance < closestDistance) {
				closest = item
				closestDistance = distance
			}
		}

		return closest
	}

	protected reactToMapRemovals(session: Session, potentialNewCurrentNode: MapNode) {
		const map = session.map
		let { thread, currentNode } = session.currentThread.value

		if (!map.get(currentNode)) {
			if (potentialNewCurrentNode && map.get(potentialNewCurrentNode.node.value)) {
				const currentThreadIndex = thread.indexOf(currentNode)
				const potentialNodeThreadIndex = thread.indexOf(potentialNewCurrentNode.node.value)

				currentNode = potentialNewCurrentNode.node.value

				if (potentialNodeThreadIndex > 0) {
					if (currentThreadIndex < potentialNodeThreadIndex) {
						session.updateThread({
							currentNode,
							to: thread[potentialNodeThreadIndex + 1]
						})
					}
					else {
						session.updateThread({
							currentNode,
							from: thread[potentialNodeThreadIndex - 1]
						})
					}
				}
				else {
					session.updateThread({ currentNode })
				}
			}
			else {
				for (const node of map.nodes.values()) {
					if (node.isRoot) {
						session.updateThread({ currentNode: node.node.value })
						return
					}
				}
				session.updateThread({ thread: [] })
			}
		}
	}

	get isTopShortcutCommand() { return false }
}

export class RemoveNodeFromMapCommand extends RemoveFromMapCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcuts: ['Backspace'] })
	}

	execute(context?: RemoveFromMapCommandContext): void {
		context = this.fillContext(context)
		const { session, node } = context
		const { map } = session
		const mapNode = map.get(node)
		if (!mapNode) return

		session.undoStack.withUndoGroup(() => {
			const fallback = this.getFallbackCurrentNode(session, mapNode)
			map.delete(mapNode)
			this.reactToMapRemovals(session, fallback)
		})
	}

	getLabel(context: RemoveFromMapCommandContext) {
		context = this.fillContext(context)
		return `Remove ${context?.node?.name} from Map`
	}

	getTooltip(context?: RemoveFromMapCommandContext) {
		context = this.fillContext(context)
		return `Removes the node representing ${context?.node?.name} from the map.`
	}
}

export class RemoveNodeAndChildrenFromMapCommand extends RemoveFromMapCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcuts: ['Mod+Backspace'] })
	}

	execute(context?: RemoveFromMapCommandContext): void {
		context = this.fillContext(context)
		const { session, node } = context
		const { map } = session
		const mapNode = map.get(node)
		if (!mapNode) return

		session.undoStack.withUndoGroup(() => {
			const fallback = this.getFallbackCurrentNode(session, mapNode)
			
			const findList = [mapNode]
			while (findList.length) {
				const n = findList.pop()
				if (n.incoming.length <= 1) {
					for (const connection of n.outgoing) {
						findList.push(connection.to.value)
					}
					map.delete(n)
				}
			}
			
			this.reactToMapRemovals(session, fallback)
		})
	}

	getLabel(context: RemoveFromMapCommandContext) {
		context = this.fillContext(context)
		return `Remove ${context?.node?.name} and All Children from Map`
	}

	getTooltip(context: RemoveFromMapCommandContext) {
		context = this.fillContext(context)
		return `Removes the nodes representing ${context?.node?.name} and all of its connected children from the map.`
	}
}

export class RemoveEverythingButNodeFromMapCommand extends RemoveFromMapCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcuts: ['Mod+Alt+Backspace'] })
	}

	execute(context?: RemoveFromMapCommandContext): void {
		context = this.fillContext(context)
		const { session, node } = context
		const { map } = session
		const mapNode = map.get(node)
		if (!mapNode) return

		const thisNodeAndDecendants = new Set<MapNode>()
		const findList = [mapNode]
		while (findList.length) {
			const n = findList.pop()
			if (!thisNodeAndDecendants.has(n)) {
				thisNodeAndDecendants.add(n)
				for (const connection of n.outgoing) {
					findList.push(connection.to.value)
				}
			}
		}

		session.undoStack.withUndoGroup(() => {
			const allNodes = [...map.nodes.values()]
			for (const n of allNodes) {
				if (!thisNodeAndDecendants.has(n)) {
					map.delete(n)
				}
			}
			
			this.reactToMapRemovals(session, mapNode)
		})
	}

	getLabel(context: RemoveFromMapCommandContext) {
		context = this.fillContext(context)
		return `Remove All But ${context?.node?.name} and Children from Map`
	}

	getTooltip(context: RemoveFromMapCommandContext) {
		context = this.fillContext(context)
		return `Removes all nodes from the map except those representing ${context?.node?.name} and its connected children.`
	}
}

export class RemoveEverythingButThreadFromMapCommand extends RemoveFromMapCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcuts: ['Mod+Alt+Shift+Backspace'] })
	}

	execute(context?: RemoveFromMapCommandContext): void {
		context = this.fillContext(context)
		const { session } = context
		const { map } = session
		const thread = session.currentThread.value.thread

		const threadNodes = new Set<MapNode>()
		for (const n of thread) {
			const mapNode = map.get(n)
			if (mapNode) {
				threadNodes.add(mapNode)
			}
		}

		session.undoStack.withUndoGroup(() => {
			const allNodes = [...map.nodes.values()]
			for (const n of allNodes) {
				if (!threadNodes.has(n)) {
					map.delete(n)
				}
			}
		})
	}

	getLabel(context: RemoveFromMapCommandContext) {
		return `Remove All But Current Thread from Map`
	}

	getTooltip(context: RemoveFromMapCommandContext) {
		return `Removes nodes but those representing the items in the current thread from the map.`
	}
}
