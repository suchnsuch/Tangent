import { FocusLevel } from 'common/dataTypes/TangentInfo'
import type Workspace from '../Workspace'
import Command from './Command'
import CommandAction from './CommandAction'
import ChangeCurrentFileCommand from './ChangeCurrentFile'
import CloseFileCommand from './CloseFile'
import CreateNewFileCommand from './CreateNewFile'
import CreateNewFolderCommand from './CreateNewFolder'
import ShowCommandPaletteCommand from './ShowCommandPalette'
import ToggleSidebarCommand from './ToggleSidebar'
import ShowInFileBrowserCommand from './ShowInFileBrowser'
import type WorkspaceCommand from './WorkspaceCommand'
import MoveFileCommand from './MoveFileCommand'
import DeleteNodeCommand from './DeleteNode'
import SetFocusLevelCommand from './SetFocusLevel'
import ToggleFocusModeCommand from './ToggleFocusMode'
import OpenPreferencesCommand from './OpenPreferences'
import OpenLogsCommand from './OpenLogs'
import OpenWorkspaceCommand from './OpenWorkspace'
import ZoomCommand from './Zoom'
import SaveCurrentFileCommand from './SaveCurrentFile'
import FloatWindowCommand from './FloatWindow'
import NoteKeyboardProxyCommand from './NoteKeyboardProxy'
import OpenChangelogCommand from './OpenChangelog'
import OpenQueryPaneCommand from './OpenQueryPane'
import { RemoveEverythingButNodeFromMapCommand, RemoveEverythingButThreadFromMapCommand, RemoveNodeAndChildrenFromMapCommand, RemoveNodeFromMapCommand } from './RemoveFromMap'
import MergeWithPreviousSessionCommand from './MergeWithPreviousSession'
import { CreateNewSessionCommand, CreateNewSessionFromThreadCommand } from './CreateNewSession'
import ArchivePreviousSessionsCommand from './ArchivePreviousSessions'
import ShiftThreadHistoryCommand from './ShiftThreadHistory'
import ShowAllChildMapNodesCommand from './ShowAllChildMapNodes'
import ShowPreviousSessionCommand from './ShowPreviousSession'
import DuplicateNodeCommand from './DuplicateNode'
import { CollapseCurrentSectionCommand } from './CollapseSectionCommands'
export { Command, CommandAction }

export interface WorkspaceCommands {
	[key: string]: WorkspaceCommand

	openWorkspace: OpenWorkspaceCommand

	toggleLeftSidebar: ToggleSidebarCommand
	openPreferences: OpenPreferencesCommand

	createNewFile: CreateNewFileCommand
	createNewNoteFromRule: ShowCommandPaletteCommand
	createNewFolder: CreateNewFolderCommand

	openQueryPane: OpenQueryPaneCommand

	toggleBold: NoteKeyboardProxyCommand
	toggleItalics: NoteKeyboardProxyCommand
	toggleHighlight: NoteKeyboardProxyCommand
	toggleInlineCode: NoteKeyboardProxyCommand
	toggleWikiLink: NoteKeyboardProxyCommand
	toggleMDLink: NoteKeyboardProxyCommand
	showIncomingLinks: NoteKeyboardProxyCommand

	setHeader1: NoteKeyboardProxyCommand
	setHeader2: NoteKeyboardProxyCommand
	setHeader3: NoteKeyboardProxyCommand
	setHeader4: NoteKeyboardProxyCommand
	setHeader5: NoteKeyboardProxyCommand
	setHeader6: NoteKeyboardProxyCommand

	setParagraph: NoteKeyboardProxyCommand

	collapseCurrentSection: CollapseCurrentSectionCommand

	goTo: ShowCommandPaletteCommand
	openInFileBrowser: ShowInFileBrowserCommand

	do: ShowCommandPaletteCommand

	closeCurrentFile: CloseFileCommand
	closeOtherFiles: CloseFileCommand
	closeLeftFiles: CloseFileCommand
	closeRightFiles: CloseFileCommand

	saveCurrentFile: SaveCurrentFileCommand

	moveToLeftFile: ChangeCurrentFileCommand
	moveToRightFile: ChangeCurrentFileCommand

	moveFile: MoveFileCommand
	duplicateNode: DuplicateNodeCommand
	deleteNode: DeleteNodeCommand

	setFocusLevel: SetFocusLevelCommand
	setMapFocusLevel: SetFocusLevelCommand
	setThreadFocusLevel: SetFocusLevelCommand
	setFileFocusLevel: SetFocusLevelCommand
	setTypewriterFocusLevel: SetFocusLevelCommand
	setParagraphFocusLevel: SetFocusLevelCommand
	setLineFocusLevel: SetFocusLevelCommand
	setSentenceFocusLevel: SetFocusLevelCommand
	toggleFocusMode: ToggleFocusModeCommand

	mergeWithPreviousSession: MergeWithPreviousSessionCommand
	createNewSession: CreateNewSessionCommand
	createNewSessionFromThread: CreateNewSessionFromThreadCommand
	archivePreviousSessions: ArchivePreviousSessionsCommand
	showPreviousSession: ShowPreviousSessionCommand

	shiftHistoryBack: ShiftThreadHistoryCommand
	shiftHistoryForward: ShiftThreadHistoryCommand

	showAllChildMapNodes: ShowAllChildMapNodesCommand
	
	removeNodeFromMap: RemoveNodeFromMapCommand
	removeNodeAndChildrenFromMap: RemoveNodeAndChildrenFromMapCommand
	removeEverythingButNodeFromMap: RemoveEverythingButNodeFromMapCommand
	removeEverythingButThreadFromMap: RemoveEverythingButThreadFromMapCommand
	
	zoomIn: ZoomCommand
	zoomOut: ZoomCommand
	resetZoom: ZoomCommand

	floatWindow: FloatWindowCommand

	openLogs: OpenLogsCommand
	openChangelog: OpenChangelogCommand
}

export default function workspaceCommands(workspace: Workspace): WorkspaceCommands {
	return {

		openWorkspace: new OpenWorkspaceCommand(workspace),

		toggleLeftSidebar: new ToggleSidebarCommand(workspace),
		openPreferences: new OpenPreferencesCommand(workspace),

		createNewFile: new CreateNewFileCommand(workspace),
		createNewNoteFromRule: new ShowCommandPaletteCommand(workspace, {
			prefix: '> Create ',
			tooltip: 'Creates a new note using a define Note Creation Rule',
			shortcut: 'Mod+Shift+N'
		}),
		createNewFolder: new CreateNewFolderCommand(workspace),

		openQueryPane: new OpenQueryPaneCommand(workspace),

		toggleBold: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+B',
			label: 'Toggle Bold',
			tooltip: 'Toggles whether the selected text is bold.'
		}),
		toggleItalics: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+I',
			label: 'Toggle Italics',
			tooltip: 'Toggles whether the selected text is italic.'
		}),
		toggleHighlight: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+=',
			label: 'Toggle Highlight',
			tooltip: 'Toggles whether the selected text is highlighted.'
		}),
		toggleInlineCode: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+\\',
			label: 'Toggle Inline Code',
			tooltip: 'Toggles whether the selected text is rendered as code.'
		}),
		toggleWikiLink: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+Alt+K',
			label: 'Toggle Wiki Link',
			tooltip: 'Turns selected text into a wiki link or removes an existing wiki link.'
		}),
		toggleMDLink: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+K',
			label: 'Toggle Markdown Link',
			tooltip: 'Turns selected text into a markdown link or removes an existing link.'
		}),

		setHeader1: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+1',
			label: 'Header 1',
			paletteLabel: 'Set Header 1',
			tooltip: 'Changes the currently selected line(s) to a 1st level header.'
		}),
		setHeader2: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+2',
			label: 'Header 2',
			paletteLabel: 'Set Header 2',
			tooltip: 'Changes the currently selected line(s) to a 2nd level header.'
		}),
		setHeader3: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+3',
			label: 'Header 3',
			paletteLabel: 'Set Header 3',
			tooltip: 'Changes the currently selected line(s) to a 3rd level header.'
		}),
		setHeader4: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+4',
			label: 'Header 4',
			paletteLabel: 'Set Header 4',
			tooltip: 'Changes the currently selected line(s) to a 4th level header.'
		}),
		setHeader5: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+5',
			label: 'Header 5',
			paletteLabel: 'Set Header 5',
			tooltip: 'Changes the currently selected line(s) to a 5th level header.'
		}),
		setHeader6: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+6',
			label: 'Header 6',
			paletteLabel: 'Set Header 6',
			tooltip: 'Changes the currently selected line(s) to a 6th level header.'
		}),

		setParagraph: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+0',
			label: 'Paragraph',
			paletteLabel: 'Set Paragraph',
			tooltip: 'Changes the currently selected line(s) to be paragraphs.'
		}),

		collapseCurrentSection: new CollapseCurrentSectionCommand(workspace, {
			shortcut: 'Mod+Alt+Enter'
		}),

		showIncomingLinks: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+Alt+Down',
			label: 'Show Incoming Links',
			focus: true,
			tooltip: 'Opens the information panel of the current note, revealing any links to that note from other notes.'
		}),

		goTo: new ShowCommandPaletteCommand(workspace, { shortcut: 'Mod+O' }),
		openInFileBrowser: new ShowInFileBrowserCommand(workspace),
		
		do: new ShowCommandPaletteCommand(workspace, { shortcut: 'Mod+P', prefix: '> ' }),

		closeCurrentFile: new CloseFileCommand(workspace, { mode: 'current', shortcut: 'Mod+W' }),
		closeOtherFiles: new CloseFileCommand(workspace, { mode: 'others', shortcut: 'Mod+Shift+W'}),
		closeLeftFiles: new CloseFileCommand(workspace, { mode: 'left' }),
		closeRightFiles: new CloseFileCommand(workspace, { mode: 'right' }),

		saveCurrentFile: new SaveCurrentFileCommand(workspace),

		moveToLeftFile: new ChangeCurrentFileCommand(workspace, { mode: 'left', shortcut: 'Mod+Alt+Left' }),
		moveToRightFile: new ChangeCurrentFileCommand(workspace, { mode: 'right', shortcut: 'Mod+Alt+Right' }),

		moveFile: new MoveFileCommand(workspace),
		duplicateNode: new DuplicateNodeCommand(workspace),
		deleteNode: new DeleteNodeCommand(workspace),

		setFocusLevel: new SetFocusLevelCommand(workspace, null, true),
		setMapFocusLevel: new SetFocusLevelCommand(workspace, {
			targetFocusLevel: FocusLevel.Map,
			toggle: true,
			shortcut: 'Mod+G'
		}),
		setThreadFocusLevel: new SetFocusLevelCommand(workspace, {
			targetFocusLevel: FocusLevel.Thread
		}),
		setFileFocusLevel: new SetFocusLevelCommand(workspace, {
			targetFocusLevel: FocusLevel.File
		}),
		setTypewriterFocusLevel: new SetFocusLevelCommand(workspace, {
			targetFocusLevel: FocusLevel.Typewriter
		}),
		setParagraphFocusLevel: new SetFocusLevelCommand(workspace, {
			targetFocusLevel: FocusLevel.Paragraph
		}),
		setLineFocusLevel: new SetFocusLevelCommand(workspace, {
			targetFocusLevel: FocusLevel.Line
		}),
		setSentenceFocusLevel: new SetFocusLevelCommand(workspace, {
			targetFocusLevel: FocusLevel.Sentence
		}),
		toggleFocusMode: new ToggleFocusModeCommand(workspace),

		showAllChildMapNodes: new ShowAllChildMapNodesCommand(workspace),

		removeNodeFromMap: new RemoveNodeFromMapCommand(workspace),
		removeNodeAndChildrenFromMap: new RemoveNodeAndChildrenFromMapCommand(workspace),
		removeEverythingButNodeFromMap: new RemoveEverythingButNodeFromMapCommand(workspace),
		removeEverythingButThreadFromMap: new RemoveEverythingButThreadFromMapCommand(workspace),
		
		mergeWithPreviousSession: new MergeWithPreviousSessionCommand(workspace),
		createNewSession: new CreateNewSessionCommand(workspace),
		createNewSessionFromThread: new CreateNewSessionFromThreadCommand(workspace),
		archivePreviousSessions: new ArchivePreviousSessionsCommand(workspace),
		showPreviousSession: new ShowPreviousSessionCommand(workspace),

		shiftHistoryBack: new ShiftThreadHistoryCommand(workspace, {
			direction: -1,
			shortcut: 'Mod+Shift+['
		}),
		shiftHistoryForward: new ShiftThreadHistoryCommand(workspace, {
			direction: 1,
			shortcut: 'Mod+Shift+]'
		}),

		zoomIn: new ZoomCommand(workspace, {
			direction: 1,
			shortcut: 'Mod+Shift+='
		}),
		zoomOut: new ZoomCommand(workspace, {
			direction: -1,
			shortcut: 'Mod+Shift+-'
		}),
		resetZoom: new ZoomCommand(workspace, {
			direction: 'reset',
			shortcut: 'Mod+Shift+0'
		}),

		floatWindow: new FloatWindowCommand(workspace),

		openLogs: new OpenLogsCommand(workspace),
		openChangelog: new OpenChangelogCommand(workspace)
	}
}
