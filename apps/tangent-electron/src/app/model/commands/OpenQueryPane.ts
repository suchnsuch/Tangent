import QueryInfo, { queryFileType } from 'common/dataTypes/QueryInfo';
import type DataFile from '../DataFile';
import type Workspace from '../Workspace';
import type { CommandContext } from './Command';
import WorkspaceCommand from './WorkspaceCommand';

const queryPath = '.tangent/Temp/Query'

export default class OpenQueryPaneCommand extends WorkspaceCommand {
	constructor(workspace: Workspace) {
		super(workspace, { shortcut: 'Mod+Shift+F' })
	}

	execute(context: CommandContext) {
		// Create a new one or reuse?
		const directoryStore = this.workspace.directoryStore
		const tangent = this.workspace.viewState.tangent
		const session = tangent.activeSession.value

		// Don't reuse a query that is currently on the map
		let number = 1
		let targetPath:string = null
		let allow = false
		do {
			allow = true
			targetPath = directoryStore.files.getFullPath(`${queryPath} ${number}${queryFileType}`)
			const node = directoryStore.get(targetPath)
			if (!node) break // Make this immediately

			for (const key of session.map.nodes.keys()) {
				if (key === node) {
					allow = false
					break
				}
			}
			number++
		} while (!allow)

		const file = this.workspace.commands.createNewFile.execute({
			path: targetPath,
			creationMode: 'createOrOpen'
		}) as DataFile

		file.loadData<QueryInfo>().then(info => {
			info.resetQueryString()
			file.dropFile()
		})

		return 
	}

	getLabel(context: CommandContext) {
		return 'New Search Query'
	}

	getTooltip(context?: CommandContext) {
		return 'Creates and opens a new search query in a new pane.'
	}
}
