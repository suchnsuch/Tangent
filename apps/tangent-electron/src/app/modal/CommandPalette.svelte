<script lang="ts">
import { getContext } from 'svelte'
import ModalInputSelect from './ModalInputSelect.svelte'
import type Workspace from '../model/Workspace'

import NodeLine from '../views/summaries/NodeLine.svelte'
import type { PaletteAction } from 'app/model/commands/WorkspaceCommand'
import { iterateOverChildren, TreePredicateResult, TreeNode } from 'common/trees'
import { isModKey } from 'app/utils/events'
import { stringSort } from 'common/sorting'
import { buildFuzzySegementMatcher, buildMatcher, compareNodeSearch, orderTreeNodesForSearch, PathMatch, SearchMatchResult, SegmentSearchNodePair } from 'common/search'
import SearchSegmentHighlight from 'app/utils/SearchSegmentHighlight.svelte'
import PaletteActionView from 'app/utils/PaletteActionView.svelte'
import type { NavigationData } from 'app/events'
import { visibleFileTypeMatch, implicitExtensionsMatch } from 'common/fileExtensions'

let workspace = getContext('workspace') as Workspace

export let prefix: string
let text: string = prefix || ''

let inputElement: HTMLInputElement

$: {
	inputElement?.focus()
}

$:placeholder = getPlaceholder(text)

function getPlaceholder(text: string) {
	if (!text) {
		return 'Type to search for a file to jump to'
	}
	switch (text) {
		case '>':
		case '> ':
			return 'Run a command'
	}
	return ''
}

interface Option {
	node?: TreeNode
	action?: PaletteAction
	match?: SearchMatchResult
}

let commandActions: PaletteAction[] = null

let options: Option[] = []
let selectedIndex = 0
$: updateOptions(text)

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

function updateOptions(text: string) {
	let mode: 'file' | 'command' | 'tag' = 'file'

	if (text.startsWith('>')) {
		text = text.substring(1)
		mode = 'command'
	}
	else if (text.startsWith('#')) {
		// Drop the tag leader
		text = text.substring(1)
		mode = 'tag'
	}
	text = text.trim()

	switch (mode) {
		case 'file':
		{
			let nodes: SegmentSearchNodePair[] = null
			let pathMatch: PathMatch = null
			if (text) {
				pathMatch = buildMatcher(text, { fuzzy: true })
				nodes = workspace.directoryStore.getMatchesForPath(pathMatch, {
					alwaysReturnArray: true,
					includeMatches: 'best',
					fuzzy: true,
					filter: nodeFilter
				})
			}
			else {
				nodes = [...iterateOverChildren(workspace.directoryStore.files, nodeFilter)].map(node => ({
					node, match: undefined
				}))
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
		case 'tag':
		{
			let nodes: SegmentSearchNodePair[] = null
			let pathMatch: PathMatch = null
			if (text) {
				pathMatch = buildMatcher(text, { fuzzy: true })
				nodes = workspace.directoryStore.getMatchesForPath(pathMatch, {
					alwaysReturnArray: true,
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

function autocomplete(event: CustomEvent) {
	let option = event.detail as Option
	const tabOption = options[selectedIndex]
	if (tabOption) {
		if (tabOption.node) {
			text = workspace.directoryStore.getPathToItem(tabOption.node, {
				includeExtension: false
			})
		}
		else if (tabOption.action) {
			text = '> ' + tabOption.action.name
		}
	}
}

function selectOption(selectEvent: CustomEvent<{option: Option, event: KeyboardEvent | MouseEvent}>) {
	let { option, event } = selectEvent.detail
	if (option.node) {

		const nav: NavigationData = {
			target: option.node
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
			nav.direction = 'out'
			if (event.shiftKey !== (workspace.settings.linkClickPaneBehavior.value === 'replace')) {
				nav.direction = 'replace'
			}
			if (event.altKey) {
				nav.direction = 'in'
			}
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

function optionID(option) {
	if (option.action) {
		return option.action.name
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
	if (action.shortcuts === null) return false
	return action.command.shortcuts && action.command.isTopShortcutCommand
}

</script>

<main class="ModalContainer">
	<ModalInputSelect
		{options}
		{placeholder}
		placeholderMode={'always'}
		bind:selectedIndex
		bind:text
		on:autocomplete={autocomplete}
		on:select={selectOption}
		itemID={optionID}
		getItemTooltip={optionTooltip}>
		<svelte:fragment slot="option" let:option>
			{#if option.node}
				<NodeLine
					node={option.node}
					showFileType={!option.node.fileType.match(implicitExtensionsMatch)}
					showModDate={true}
					nameMatch={option.match} />
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
</style>