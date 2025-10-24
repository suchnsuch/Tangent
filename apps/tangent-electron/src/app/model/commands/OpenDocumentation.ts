import { CommandContext } from './Command';
import WorkspaceCommand from './WorkspaceCommand';

export class OpenDocumentationCommand extends WorkspaceCommand {

	execute(context?: CommandContext): void {
		this.workspace.api.documentation.open('Getting Started')
	}

	getLabel(context?: CommandContext) {
		return 'Open Documentation'
	}

	getTooltip(context?: CommandContext) {
		return 'Opens Tangent\'s documentation as a separate workspace.'
	}
}
