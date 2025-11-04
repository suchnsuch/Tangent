import type DataType from './DataType'
import WorkspaceSettings from './WorkspaceSettings'
import FolderInfo from './FolderInfo'
import NoteViewInfo from './NoteViewInfo'
import QueryInfo from './QueryInfo'
import TagSettingsSet from './TagSettingsSet'
import TagInfo from './TagInfo'
import Session from './Session'
import TangentInfo from './TangentInfo'
import AudioVideoViewInfo from './AudioVideoViewInfo'

export const dataTypes: DataType[] = [
	WorkspaceSettings,
	FolderInfo,
	NoteViewInfo,
	AudioVideoViewInfo,
	QueryInfo,
	Session,
	TagSettingsSet,
	TagInfo,
	TangentInfo
]

export type { DataType }
