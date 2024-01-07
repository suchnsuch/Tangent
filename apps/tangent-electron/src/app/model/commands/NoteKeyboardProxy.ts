import type Workspace from '../Workspace';
import KeyboardEventProxyCommand, { KeyboardEventProxyCommandOptions } from './KeyboardEventProxy';

export type NoteKeyboardProxyCommandOptions =
	Partial<KeyboardEventProxyCommandOptions>
	& Pick<KeyboardEventProxyCommandOptions, "label">

export default class NoteKeyboardProxyCommand extends KeyboardEventProxyCommand {

	constructor(workspace: Workspace, options: NoteKeyboardProxyCommandOptions) {
		const opts: KeyboardEventProxyCommandOptions = {
			selector: '.nodeContainer.current main.noteEditor article',
			...options
		}
		super(workspace, opts)
	}
}
