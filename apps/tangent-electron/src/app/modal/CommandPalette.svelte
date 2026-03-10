<script lang="ts">
import { getContext } from 'svelte'
import ModalInputSelect from './ModalInputSelect.svelte'
import type Workspace from '../model/Workspace'

import NodeLine from '../views/summaries/NodeLine.svelte'
import type { PaletteAction } from 'app/model/commands/WorkspaceCommand'
import { iterateOverChildren, TreePredicateResult, type TreeNode } from 'common/trees'
import { isModKey } from 'app/utils/events'
import { stringSort } from 'common/sorting'
import { buildFuzzySegementMatcher, buildMatcher, compareNodeSearch, orderTreeNodesForSearch, type PathMatch, type SearchMatchResult, type SegmentSearchNodePair } from 'common/search'
import PaletteActionView from 'app/utils/PaletteActionView.svelte'
import { getLinkDirectionFromEvent, type NavigationData } from 'app/events'
import { visibleFileTypeMatch, implicitExtensionsMatch } from 'common/fileExtensions'
import { getNode, getPreview, sortReferences, type TreeNodeReference } from 'common/nodeReferences'
import QueryResultItemSummary from 'app/views/summaries/QueryResultItemSummary.svelte'
import { shortcutFromEvent, shortcutHtmlString, shortcutsDisplayString, shortcutsHtmlString } from 'app/utils/shortcuts'
import ShowCommandPaletteCommand from 'app/model/commands/ShowCommandPalette'

let workspace = getContext('workspace') as Workspace

let paletteShortcuts = [
	...Object.values(workspace.commands).filter(c => c instanceof ShowCommandPaletteCommand)
]

export let prefix: string
let searchInput: string = prefix || ''

let inputElement: HTMLInputElement

$: {
	inputElement?.focus()
}

$:placeholder = getPlaceholder(searchInput)

function getPlaceholder(text: string) {
	if (!text) {
		return 'Type to search for a file to jump to'
	}
	switch (text) {
		case '#':
		case '# ':
			return 'Search for a tag'
		case '>':
		case '> ':
			return 'Run a command'
		case '?':
		case '? ':
			return 'Search in files'
	}
	return ''
}

interface Option {
	node?: TreeNode
	ref?: TreeNodeReference
	action?: PaletteAction
	match?: SearchMatchResult
}

let commandActions: PaletteAction[] = null

let options: Option[] = []
let showShortcuts: boolean | 'query' = false
let searchTimeout = null
let selectedIndex = 0
$: updateOptions(searchInput)

function nodeFilter(node: TreeNode) {
	if (node.name.startsWith('.')) {
		return TreePredicateResult.Ignore
	}
	if (node.fileType === 'tag') {
		if (node.name === '#') return TreePredicateResult.OnlyIncludeChildren
		return TreePredicateResult.Include
	}
	if (node.fileType.match(visibleFileTypeMatch)) {
		return TreePredicateResult.Include
	}
	return TreePredicateResult.Ignore
}

function tagNodeFilter(node: TreeNode) {
	if (node.fileType !== 'tag') return TreePredicateResult.Ignore
	if (node.name === '#') return TreePredicateResult.OnlyIncludeChildren
	return TreePredicateResult.Include
}

function getInputMode(text: string) {
	let mode: 'file' | 'command' | 'search' | 'tag' = 'file'

	if (text.startsWith('>')) {
		text = text.substring(1)
		mode = 'command'
	}
	else if (text.startsWith('?')) {
		text = text.substring(1)
		mode = 'search'
	}
	else if (text.startsWith('#')) {
		// Drop the tag leader
		text = text.substring(1)
		mode = 'tag'
	}

	text = text.trim()
	return { mode, text }
}

function updateOptions(input: string) {
	
	const { mode, text } = getInputMode(input)

	if (searchTimeout && mode !== 'search') {
		clearTimeout(searchTimeout)
		searchTimeout = null
	}

	switch (mode) {
		case 'file':
		{
			let nodes: SegmentSearchNodePair[] = null
			let pathMatch: PathMatch = null
			if (text) {
				pathMatch = buildMatcher(text, { fuzzy: true })
				nodes = workspace.directoryStore.getMatchesForPath(pathMatch, {
					includeMatches: 'best',
					fuzzy: true,
					filter: nodeFilter
				})
				showShortcuts = 'query'
			}
			else {
				nodes = [...iterateOverChildren(workspace.directoryStore.files, nodeFilter)].map(node => ({
					node, match: undefined
				}))
				showShortcuts = true
			}
			nodes.sort((a, b) => orderTreeNodesForSearch(a, b))
			if (!text) {
				nodes = nodes.slice(0, 16)
			}
			options = nodes

			if (text) {
				// Always allow users to create a file with the given text
				options.push({
					action: {
						name: 'Create "' + text + '"',
						command: workspace.commands.createNewFile,
						context: {
							name: text
						},
						shortcuts: null
					}
				})
			}
		}
		break
		case 'search':
		{
			if (searchTimeout) clearTimeout(searchTimeout)

			searchTimeout = setTimeout(() => {
				searchTimeout = 'pending-query'
				workspace.api.query.resultsForQuery(`Files named '${text}' or with '${text}'`).then(result => {
					console.log(result)
					if (searchTimeout == null) return

					if (result.items) {
						result.items.sort(sortReferences)
						options = result.items.map(i => {
							return { ref: i }
						})
						showShortcuts = 'query'
					}
					else {
						options = []
						showShortcuts = false
					}
					searchTimeout = 0
				})
			}, 150)
		}
		break
		case 'tag':
		{
			showShortcuts = false
			let nodes: SegmentSearchNodePair[] = null
			let pathMatch: PathMatch = null
			if (text) {
				pathMatch = buildMatcher(text, { fuzzy: true })
				nodes = workspace.directoryStore.getMatchesForPath(pathMatch, {
					includeMatches: 'best',
					fuzzy: true,
					filter: tagNodeFilter
				})
			}
			else {
				nodes = [...iterateOverChildren(workspace.directoryStore.tags, tagNodeFilter)].map(node => ({
					node, match: undefined
				}))
			}
			nodes.sort((a, b) => orderTreeNodesForSearch(a, b, false))
			if (!text) {
				nodes = nodes.slice(0, 16)
			}
			options = nodes
		}
		break
		case 'command':
			showShortcuts = false
			const searchMatcher = buildFuzzySegementMatcher(text)
			if (commandActions === null) {
				// Only build the actions once per palette opening
				let result: PaletteAction[] = []

				for (const key of Object.keys(workspace.commands)) {
					const command = workspace.commands[key]
					const actions = command.getPaletteActions()
					if (actions) {
						for (const action of actions) {
							result.push(action)
						}
					}
				}

				commandActions = result
			}

			let annotatedActions = []

			for (const action of commandActions) {
				const match = action.name.match(searchMatcher)
				if (match) {
					annotatedActions.push({
						action,
						match
					})
				}
			}

			annotatedActions.sort((a, b) => {
				const aCanExecute = a.action.command.canExecute(a.action.context)
				const bCanExecute = b.action.command.canExecute(b.action.context)

				if (aCanExecute === bCanExecute) {

					const matchResult = compareNodeSearch(a.match, b.match)
					if (matchResult !== 0) return matchResult

					return stringSort(a.action.name, b.action.name)
				}
				if (aCanExecute && !bCanExecute) {
					return -1
				}
				if (!aCanExecute && bCanExecute) {
					return 1
				}
			})

			options = annotatedActions
		break
	}

	if (options.length === 0) {
		selectedIndex = 0
	}
	else if (options.length <= selectedIndex) {
		selectedIndex = options.length - 1
	}
}

function onKeydown(event: KeyboardEvent) {
	if (event.defaultPrevented) return

	const shortcut = shortcutFromEvent(event)

	for (const command of paletteShortcuts) {
		if (command.shortcuts.includes(shortcut)) {
			const { mode, text } = getInputMode(searchInput)
			searchInput = (command.prefix ?? '') + text
			event.preventDefault()
			return
		}
	}

	if (workspace.commands.openQueryPane.shortcuts.includes(shortcut)) {
		return goToQuery(event)
	}
}

function goToQuery(event: KeyboardEvent | MouseEvent) {
	const { mode, text } = getInputMode(searchInput)
	if (mode === 'file') {
		workspace.commands.openQueryPane.execute({
			queryText: `Files Named '${text}'`
		})
		event.preventDefault()
		workspace.viewState.modal.close()
		return
	}
	if (mode === 'search') {
		workspace.commands.openQueryPane.execute({
			queryText: `Files Named '${text}' or With '${text}'`
		})
		event.preventDefault()
		workspace.viewState.modal.close()
		return
	}
}

function onAutocomplete(option: Option) {
	const tabOption = options[selectedIndex]
	if (tabOption) {
		if (tabOption.node) {
			searchInput = workspace.directoryStore.getPathToItem(tabOption.node, {
				includeExtension: false
			})
		}
		else if (tabOption.action) {
			searchInput = '> ' + tabOption.action.name
		}
	}
}

function selectOption(option: Option, event: KeyboardEvent | MouseEvent) {
	if (option.node || option.ref) {

		const node = option.node ?? getNode(option.ref, workspace.directoryStore)

		const nav: NavigationData = {
			target: node
		}

		if (option.match?.type === 'header') {
			// Provide a fake link for the content_id to the header
			const content_id = option.match.input.substring(option.match.input.lastIndexOf('#') + 1)
			if (content_id) {
				nav.link = {
					form: 'wiki',
					href: '',
					content_id
				}
			}
		}

		if (isModKey(event) || event.shiftKey || event.altKey) {
			nav.origin = 'current'
			nav.direction = getLinkDirectionFromEvent(event, workspace)
		}

		workspace.navigateTo(nav)
	}
	else if (option.action) {
		let { command, context } = option.action

		if (!command.canExecute(context)) {
			return
		}

		context = Object.assign({}, context)
		context.initiatingEvent = event

		const modal = workspace.viewState.modal
		const modalStack = modal.stack
		const modalDepth = modal.depth

		command.execute(context)

		if (modalStack !== modal.stack || modalDepth < modal.depth) {
			// The called command has either pushed a modal or replaced the modal stack
			return
		}
	}

	workspace.viewState.modal.close()
}

function optionID(option: Option) {
	if (option.action) {
		return option.action.name
	}
	if (option.ref) {
		return option.ref
	}
	else {
		return option.node
	}
}

function optionTooltip(option) {
	if (option.action?.command) {
		return option.action.command.getTooltip(option.action.context)
	}
}

function shouldShowShortcut(action: PaletteAction) {
	return action.shortcuts?.length > 0
}

</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<main class="ModalContainer"
	on:keydown={onKeydown}
>
	<ModalInputSelect
		{options}
		{placeholder}
		placeholderMode={'always'}
		bind:selectedIndex
		bind:text={searchInput}
		{onAutocomplete}
		onSelect={selectOption}
		itemID={optionID}
		getItemTooltip={optionTooltip}>
		<svelte:fragment slot="option" let:option>
			{#if option.node}
				<NodeLine
					node={option.node}
					showFileType={!option.node.fileType.match(implicitExtensionsMatch)}
					showModDate={true}
					nameMatch={option.match} />
			{:else if option.ref}
				<QueryResultItemSummary reference={option.ref} />
			{:else if option.action}
				<PaletteActionView
					action={option.action}
					match={option.match}
					showShortcut={shouldShowShortcut(option.action)}
				/>
			{/if}
		</svelte:fragment>
		<div class="empty" slot="empty">
			Nothing found. Try a different search query.
		</div>
	</ModalInputSelect>
	{#if options[selectedIndex]?.action}
		{@const selectedAction = options[selectedIndex].action}
		{#if selectedAction.command}
			{@const tooltip = selectedAction.command.getTooltip(selectedAction.context)}
			{#if tooltip}
				<div class="tooltip">{tooltip}</div>
			{/if}
		{/if}
	{/if}
	{#if workspace.settings.showPromptInstructions.value && (showShortcuts === 'query' || !searchInput)}
		<div class="instructions">
			{#if !searchInput}
				<div>Type <span class="key">?</span> to search content. Type <span class="key">&gt;</span> to search commands.</div>
			{/if}
			{#if showShortcuts === 'query'}
				<button
					class="subtle"
					on:click={goToQuery}
				>Press <span class="key">{@html shortcutsHtmlString(workspace.commands.openQueryPane.shortcuts)}</span> to open as a Query.</button>
			{/if}
		</div>
	{/if}
</main>

<style lang="scss">
.empty {
	color: var(--deemphasizedTextColor);
	text-align: center;
	margin: 1.5em 0;
}

.tooltip {
	border: 2px solid transparent;
	padding: .2rem .4rem;
	margin-top: .5em;
	color: var(--deemphasizedTextColor);
}

.instructions {
	margin-top: 1em;

	button {
		width: 100%;
		text-align: left;
	}
}

</style>