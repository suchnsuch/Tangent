import { numberOr } from '@such-n-such/core'
import { ObjectStore, ValidatingStore, WritableStore } from 'common/stores'

export enum SidebarMode {
	closed = -1,
	hoverable = 0,
	pinned = 1
}

export interface RawSidebarState {
	size: number
	mode: SidebarMode
	lastUnfocusedMode: SidebarMode
	lastFocusedMode: SidebarMode
	currentTab: string
}

const knownTabs = ['files', 'tags', 'contents']

const defaultState: RawSidebarState = {
	size: 300,
	mode: SidebarMode.pinned,
	lastUnfocusedMode: SidebarMode.pinned,
	lastFocusedMode: SidebarMode.hoverable,
	currentTab: knownTabs[0]
}

export default class SidebarState extends ObjectStore {

	size: WritableStore<number>
	mode: WritableStore<SidebarMode>
	lastUnfocusedMode: WritableStore<SidebarMode>
	lastFocusedMode: WritableStore<SidebarMode>

	currentTab: WritableStore<string>

	constructor(state?: RawSidebarState) {
		super()
		state = state || defaultState
		
		this.size = new WritableStore(numberOr(state.size, defaultState.size))
		this.mode = new WritableStore(numberOr(state.mode, defaultState.mode))

		this.lastUnfocusedMode = new WritableStore(numberOr(
			state.lastUnfocusedMode,
			defaultState.lastUnfocusedMode))
		
		this.lastFocusedMode = new WritableStore(numberOr(
			state.lastFocusedMode,
			defaultState.lastFocusedMode
		))

		this.currentTab = new ValidatingStore(
			knownTabs.includes(state.currentTab) ? state.currentTab : defaultState.currentTab,
			v => {
				if (knownTabs.includes(v)) return v
				return defaultState.currentTab
			}
		)
	}
}
