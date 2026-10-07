import type { KeyboardExitCallback, NavigationData } from "app/events"
import type { ScrollToCallback } from "app/utils/scrollto"
import type { FocusLevel } from "common/dataTypes/TangentInfo"

export type NodeViewProps = {

	/** Whether or not this is the current view */
	isCurrent?: boolean
	/** The current focus level */
	focusLevel?: FocusLevel
	/** Whether the layout should be absolutely positioned or exist within the flow */
	layout?: 'fill' | 'auto'
	/** Whether the vie should provide its own background color or none */
	background?: 'auto' | 'none'

	/** Extra padding to include at the top */
	extraTop?: number
	/** Extra padding to include at the bottom */
	extraBottom?: number

	/** Call to navigate elsewhere */
	onNavigate?: (data: NavigationData) => void
	/** If bound, call this when presentation is ready */
	onViewReady?: () => void
	/** If bound, call to invoke scrolling in an outer container. Only makes sense in 'auto' layout. */
	onScrollRequest?: ScrollToCallback
	/** If bound, call to indicate that a keyboard event wishes to leave the view. */
	onKeyboardExit?: KeyboardExitCallback
}
