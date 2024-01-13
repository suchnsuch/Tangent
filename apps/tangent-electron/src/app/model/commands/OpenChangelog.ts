import type { CommandContext } from './Command'
import WorkspaceCommand from './WorkspaceCommand'

import Changelog from '../../modal/Changelog.svelte'

export default class OpenChangelogCommand extends WorkspaceCommand {
	execute(context: CommandContext): void {
		this.workspace.viewState.modal.set(Changelog, {})
	}

	getLabel(context: CommandContext) {
		return 'Open Changelog'
	}

	getTooltip(context?: CommandContext) {
		return 'Opens Tangent\'s changelog dialog.'
	}
}
