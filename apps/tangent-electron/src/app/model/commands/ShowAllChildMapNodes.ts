import Session from 'common/dataTypes/Session'
import { SomeNode } from 'common/tangentMap/TangentMap'
import { Workspace } from '..'
import { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'
import { MapStrength } from 'common/tangentMap/MapNode'
import { FocusLevel } from 'common/dataTypes/TangentInfo'

interface ShowAllChildMapNodesCommandContext extends CommandContext {
	node: SomeNode
	session?: Session
}

export default class ShowAllChildMapNodesCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { group: 'Map' })
	}

	getSession(context?: ShowAllChildMapNodesCommandContext) {
		return context?.session ?? this.workspace.viewState.tangent.activeSession.value 
	}

	getNode(context?: ShowAllChildMapNodesCommandContext) {
		const session = this.getSession(context)
		if (!session) return null

		let node = context?.node
		if (!node) {
			node = session.currentThread.value?.currentNode
		}

		if (!node) return null

		return session.map.get(node)
	}

	canExecute(context?: ShowAllChildMapNodesCommandContext): boolean {
		const node = this.getNode(context)
		return node && node.getOutLinks().length > 0
	}

	execute(context?: ShowAllChildMapNodesCommandContext): void {
		const session = this.getSession(context)
		if (!session) return

		const node = this.getNode(context)
		if (!node) return

		const outlinks = node.getOutLinks()
		session.undoStack.withUndoGroup(() => {
			for (const link of outlinks) {
				session.map.connect({
					from: node,
					to: link,
					strength: MapStrength.Connected
				})
			}
		})

		this.workspace.commands.setFocusLevel.execute({ targetFocusLevel: FocusLevel.Map, toggle: false })
	}

	getLabel() {
		return 'Show All Outgoing Connections in Map'
	}

	getTooltip(context?: ShowAllChildMapNodesCommandContext) {
		const name = this.getNode(context)?.node.value?.name
		if (name) {
			return 'Adds all of the nodes connected to ' + name + ' to the map.'
		}
		return ''
	}
}
