import { Workspace } from 'app/model'
import { ForwardingStore } from 'common/stores'

class CodeThemeItem {
	readonly workspace: Workspace
	readonly form: 'inline'|'block'
	readonly color: 'light'|'dark'
	readonly store: ForwardingStore<string>

	element: HTMLStyleElement

	unsub: () => void

	constructor(workspace: Workspace, form: 'inline'|'block', color: 'light'|'dark') {
		this.workspace = workspace
		this.form = form
		this.color = color
		this.store = new ForwardingStore(null)

		this.unsub = this.store.subscribe(value => this.onChanged(value))
	}

	onChanged(value: string) {
		if (value) {
			this.workspace.api.theme.getCodeTheme(value)
			.then(content => {
				if (!this.element) {
					const newElement = document.createElement('style')
					document.head.appendChild(newElement)
					this.element = newElement
				}

				if (this.form === 'inline') {
					this.element.innerHTML = `:where(.${this.color}) { ${content.tokens} }`
				}
				else {
					let style = `:where(.${this.color}) {`

					style += content.block
					style += `pre code { ${content.tokens} }`

					style += '}'

					this.element.innerHTML = style
				}
			}).catch(error => {
				console.error('Failed to get theme', value, error)
			})
		}
		else {
			this.removeElement()
		}
	}

	removeElement() {
		if (this.element) {
			this.element.remove()
			this.element = null
		}
	}

	dispose() {
		this.removeElement()
	}
}

export default class CodeThemeManager {
	workspace: Workspace

	inlineLight: CodeThemeItem
	inlineDark: CodeThemeItem
	blockLight: CodeThemeItem
	blockDark: CodeThemeItem

	settingsSub: () => void
	unsubs: (() => void)[] = []

	constructor(workspace: Workspace) {
		this.workspace = workspace

		this.inlineLight = new CodeThemeItem(workspace, 'inline', 'light')
		this.inlineDark = new CodeThemeItem(workspace, 'inline', 'dark')
		this.blockLight = new CodeThemeItem(workspace, 'block', 'light')
		this.blockDark = new CodeThemeItem(workspace, 'block', 'dark')

		this.settingsSub = workspace.settings.subscribe(settings => {
			this.inlineLight.store.forwardFrom(settings.noteCodeInlineLightTheme)
			this.inlineDark.store.forwardFrom(settings.noteCodeInlineDarkTheme)
			this.blockLight.store.forwardFrom(settings.noteCodeBlockLightTheme)
			this.blockDark.store.forwardFrom(settings.noteCodeBlockDarkTheme)
		})
	}

	dispose() {
		if (this.settingsSub) {
			this.settingsSub()
			this.settingsSub = null
		}

		this.inlineLight.dispose()
		this.inlineDark.dispose()
		this.blockLight.dispose()
		this.blockDark.dispose()
	}
}
