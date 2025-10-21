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
import { CollapseAllSectionsCommand, CollapseCurrentSectionCommand } from './CollapseSectionCommands'
import { InlineFormatCommand, NoteLinePrefixCommand, ShiftNoteGroupCommand, ToggleMDLinkCommand as ToggleMarkdownLinkCommand, ToggleWikiLinkCommand } from './NoteFormattingCommands'
import { attr } from 'cheerio/dist/commonjs/api/attributes'
import { isMac } from 'common/platform'
export { Command, CommandAction, WorkspaceCommand }

export interface WorkspaceCommands {
	[key: string]: WorkspaceCommand

	// Global
	openWorkspace: OpenWorkspaceCommand

	toggleLeftSidebar: ToggleSidebarCommand
	openPreferences: OpenPreferencesCommand

	createNewFile: CreateNewFileCommand
	createNewNoteFromRule: ShowCommandPaletteCommand
	createNewFolder: CreateNewFolderCommand

	openQueryPane: OpenQueryPaneCommand

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

	shiftHistoryBack: ShiftThreadHistoryCommand
	shiftHistoryForward: ShiftThreadHistoryCommand

	zoomIn: ZoomCommand
	zoomOut: ZoomCommand
	resetZoom: ZoomCommand

	floatWindow: FloatWindowCommand

	openLogs: OpenLogsCommand
	openChangelog: OpenChangelogCommand


	// Maps
	mergeWithPreviousSession: MergeWithPreviousSessionCommand
	createNewSession: CreateNewSessionCommand
	createNewSessionFromThread: CreateNewSessionFromThreadCommand
	archivePreviousSessions: ArchivePreviousSessionsCommand
	showPreviousSession: ShowPreviousSessionCommand

	showAllChildMapNodes: ShowAllChildMapNodesCommand
	
	removeNodeFromMap: RemoveNodeFromMapCommand
	removeNodeAndChildrenFromMap: RemoveNodeAndChildrenFromMapCommand
	removeEverythingButNodeFromMap: RemoveEverythingButNodeFromMapCommand
	removeEverythingButThreadFromMap: RemoveEverythingButThreadFromMapCommand

	
	// Notes
	toggleBold: InlineFormatCommand
	toggleItalics: InlineFormatCommand
	toggleHighlight: InlineFormatCommand
	toggleInlineCode: InlineFormatCommand
	toggleWikiLink: ToggleWikiLinkCommand
	toggleWikiLinkDisplay: ToggleWikiLinkCommand
	toggleMDLink: ToggleMarkdownLinkCommand
	showIncomingLinks: NoteKeyboardProxyCommand

	setHeader1: NoteLinePrefixCommand
	setHeader2: NoteLinePrefixCommand
	setHeader3: NoteLinePrefixCommand
	setHeader4: NoteLinePrefixCommand
	setHeader5: NoteLinePrefixCommand
	setHeader6: NoteLinePrefixCommand

	setParagraph: NoteLinePrefixCommand

	shiftLinesUp: ShiftNoteGroupCommand
	shiftLinesDown: ShiftNoteGroupCommand
	shiftGroupUp: ShiftNoteGroupCommand
	shiftGroupDown: ShiftNoteGroupCommand

	collapseCurrentSection: CollapseCurrentSectionCommand
	collapseAllSections: CollapseAllSectionsCommand
	expandAllSections: CollapseAllSectionsCommand
	collapseSmallestSections: CollapseAllSectionsCommand
	expandLargestSections: CollapseAllSectionsCommand
}

export default function workspaceCommands(workspace: Workspace): WorkspaceCommands {
	return {

		openWorkspace: new OpenWorkspaceCommand(workspace),

		toggleLeftSidebar: new ToggleSidebarCommand(workspace),
		openPreferences: new OpenPreferencesCommand(workspace),

		createNewFile: new CreateNewFileCommand(workspace),
		createNewNoteFromRule: new ShowCommandPaletteCommand(workspace, {
			name: 'Create New Note From Rule',
			prefix: '> Create ',
			tooltip: 'Creates a new note using a define Note Creation Rule',
			shortcut: 'Mod+Shift+N'
		}),
		createNewFolder: new CreateNewFolderCommand(workspace),

		openQueryPane: new OpenQueryPaneCommand(workspace),

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
		openChangelog: new OpenChangelogCommand(workspace),


		// Maps
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


		// Notes
		toggleBold: new InlineFormatCommand(workspace, {
			label: 'Bold',
			tooltip: 'Toggles whether the selected text is bold.',
			shortcut: 'Mod+B',
			formattingCharacters: () => workspace.settings?.boldCharacters.value ?? '**',
			attributePredicate: attr => attr?.bold
		}),
		toggleItalics: new InlineFormatCommand(workspace, {
			label: 'Italics',
			tooltip: 'Toggles whether the selected text is italic.',
			shortcut: 'Mod+I',
			formattingCharacters: () => workspace.settings?.italicsCharacters.value ?? '_',
			attributePredicate: attr => attr?.italic
		}),
		toggleHighlight: new InlineFormatCommand(workspace, {
			label: 'Highlight',
			tooltip: 'Toggles whether the selected text is highlighted.',
			shortcut: 'Mod+=',
			formattingCharacters: () => '==',
			attributePredicate: attr => attr?.highlight
		}),
		toggleInlineCode: new InlineFormatCommand(workspace, {
			label: 'Inline Code',
			tooltip: 'Toggles whether the selected text is rendered as code.',
			shortcut: 'Mod+\\',
			formattingCharacters: () => '`',
			attributePredicate: attr => attr?.inline_code
		}),
		toggleWikiLink: new ToggleWikiLinkCommand(workspace, {
			shortcut: 'Mod+Alt+K',
			mode: 'name'
		}),
		toggleWikiLinkDisplay: new ToggleWikiLinkCommand(workspace, {
			shortcut: 'Mod+Alt+Shift+K',
			mode: 'display'
		}),
		toggleMDLink: new ToggleMarkdownLinkCommand(workspace, {
			shortcut: 'Mod+K'
		}),

		setHeader1: new NoteLinePrefixCommand(workspace, {
			shortcut: 'Mod+1',
			label: 'Header 1',
			tooltip: 'Changes the currently selected line(s) to a 1st level header.',
			prefix: '#'
		}),
		setHeader2: new NoteLinePrefixCommand(workspace, {
			shortcut: 'Mod+2',
			label: 'Header 2',
			tooltip: 'Changes the currently selected line(s) to a 2nd level header.',
			prefix: '##'
		}),
		setHeader3: new NoteLinePrefixCommand(workspace, {
			shortcut: 'Mod+3',
			label: 'Header 3',
			tooltip: 'Changes the currently selected line(s) to a 3rd level header.',
			prefix: '###'
		}),
		setHeader4: new NoteLinePrefixCommand(workspace, {
			shortcut: 'Mod+4',
			label: 'Header 4',
			tooltip: 'Changes the currently selected line(s) to a 4th level header.',
			prefix: '####'
		}),
		setHeader5: new NoteLinePrefixCommand(workspace, {
			shortcut: 'Mod+5',
			label: 'Header 5',
			tooltip: 'Changes the currently selected line(s) to a 5th level header.',
			prefix: '#####'
		}),
		setHeader6: new NoteLinePrefixCommand(workspace, {
			shortcut: 'Mod+6',
			label: 'Header 6',
			tooltip: 'Changes the currently selected line(s) to a 6th level header.',
			prefix: '######'
		}),

		setParagraph: new NoteLinePrefixCommand(workspace, {
			shortcut: 'Mod+0',
			label: 'Paragraph',
			tooltip: 'Changes the currently selected line(s) to be paragraphs.',
			prefix: ''
		}),

		shiftLinesUp: new ShiftNoteGroupCommand(workspace, {
			mode: 'lines',
			direction: -1,
			shortcut: 'Alt+ArrowUp'
		}),
		shiftLinesDown: new ShiftNoteGroupCommand(workspace, {
			mode: 'lines',
			direction: 1,
			shortcut: 'Alt+ArrowDown'
		}),
		shiftGroupUp: new ShiftNoteGroupCommand(workspace, {
			mode: 'section',
			direction: -1,
			shortcut: isMac ? 'Ctrl+Alt+ArrowUp' : 'Alt+Shift+ArrowUp'
		}),
		shiftGroupDown: new ShiftNoteGroupCommand(workspace, {
			mode: 'section',
			direction: 1,
			shortcut: isMac ? 'Ctrl+Alt+ArrowDown' : 'Alt+Shift+ArrowDown'
		}),

		collapseCurrentSection: new CollapseCurrentSectionCommand(workspace, {
			shortcut: 'Mod+Alt+Enter'
		}),
		collapseAllSections: new CollapseAllSectionsCommand(workspace, {
			scope: 'all',
			mode: 'collapse',
			shortcut: 'Mod+Alt+Shift+,'
		}),
		expandAllSections: new CollapseAllSectionsCommand(workspace, {
			scope: 'all',
			mode: 'expand',
			shortcut: 'Mod+Alt+Shift+.'
		}),
		collapseSmallestSections: new CollapseAllSectionsCommand(workspace, {
			scope: 'edge',
			mode: 'collapse',
			shortcut: 'Mod+Alt+,'
		}),
		expandLargestSections: new CollapseAllSectionsCommand(workspace, {
			scope: 'edge',
			mode: 'expand',
			shortcut: 'Mod+Alt+.'
		}),

		showIncomingLinks: new NoteKeyboardProxyCommand(workspace, {
			shortcut: 'Mod+Alt+Down',
			label: 'Show Incoming Links',
			focus: true,
			tooltip: 'Opens the information panel of the current note, revealing any links to that note from other notes.'
		}),
	}
}
