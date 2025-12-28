<script lang="ts">
import { getContext } from 'svelte'
import { Workspace } from 'app/model'
import type { TreeNode } from 'common/trees'
import NodeLine from '../summaries/NodeLine.svelte'
import SvgIcon from '../smart-icons/SVGIcon.svelte'
import { tooltip } from 'app/utils/tooltips'

const workspace = getContext('workspace') as Workspace
const store = workspace.directoryStore

const {
	availableStyles,
	activeStyles
} = workspace.styleManager

function openStylesFolder() {

	const stylesFolder = workspace.commands.createNewFolder.execute({
		parent: workspace.workspaceFolder,
		name: 'styles',
		creationMode: 'createOrOpen',
		updateSelection: false
	})

	workspace.commands.openInFileBrowser.execute({
		target: stylesFolder.path
	})
}

function openDocumentation() {
	workspace.api.documentation.open('Custom Styles')
}

function disableAll() {
	workspace.workspaceSettings.value.styleFiles.set([])
}

function onActivatedChanged(style: TreeNode, event: Event) {
	const checked = (event.target as any).checked
	
	const styleFiles = workspace.workspaceSettings.value.styleFiles
	const portablePath = store.pathToPortablePath(style.path)
	if (checked) {
		console.log('Adding', portablePath)
		styleFiles.addUnique(portablePath)
	}
	else {
		console.log('Removing', portablePath)
		styleFiles.remove(portablePath)
	}
}

function gotoFileClicked(style: TreeNode) {
	workspace.api.file.openPath(style.path)
}

function createNewStyle() {
	const stylesFolder = workspace.commands.createNewFolder.execute({
		parent: workspace.workspaceFolder,
		name: 'styles',
		creationMode: 'createOrOpen',
		updateSelection: false
	})

	const newStyleFile = workspace.commands.createNewFile.execute({
		folder: stylesFolder,
		name: 'My Custom Style',
		extension: '.css',
		updateSelection: false
	})

	workspace.workspaceSettings.value.styleFiles.addUnique(
		store.pathToPortablePath(newStyleFile.path)
	)

	gotoFileClicked(newStyleFile)
}

</script>

<p class="overview">
	You can further modify Tangent's appearance with custom CSS files.
	Places a CSS file in the "styles" folder and enable it here.
</p>
<p class="overview">
	<!-- svelte-ignore a11y-invalid-attribute -->
	See <a href="#" on:click={openDocumentation} class="local">the documentation</a> for more information.
</p>

<nav class="buttonBar">
	<button
		on:click={disableAll}
		use:tooltip={"Disable all custom styles."}
	>Disable All</button>

	<button class="stylesFolderButton"
		on:click={openStylesFolder}
		use:tooltip={"Opens the 'styles' folder within the workspaces '.tangent' configuration folder."}
	>
		Open Styles Folder
	</button>
</nav>

<main>
	{#each $availableStyles as style}
		<div class="style">
			<input type="checkbox"
				checked={$activeStyles.indexOf(store.pathToPortablePath(style.path)) >= 0}
				on:change={e => onActivatedChanged(style, e)}
			/>
			<span>
				<NodeLine node={style} relativeTo={'.tangent/styles/'} showFileType={true} showIcon={false} />
			</span>
			<button on:click={e => gotoFileClicked(style)}
				use:tooltip={"Edit this CSS file."}
			>
				<SvgIcon ref="arrows.svg#forward" size={16} />
			</button>
		</div>
	{:else}
		<p class="noStyles">No styles found. Place a CSS file in the styles folder to enable it.</p>
	{/each}
</main>

<nav class="buttonBar">
	<button on:click={createNewStyle}>
		<SvgIcon ref="plus.svg#plus" />
		Create New Style
	</button>
</nav>

<style lang="scss">
.overview {
	padding: 0 2em;
	font-size: 90%;
	font-style: italic;
}

nav {
	gap: .25em;
	margin-left: 1em;
}

main {
	padding: 1em;
	gap: .5em;
	display: flex;
	flex-direction: column;
}

.style {
	font-size: 110%;
	background: var(--buttonBackgroundColor);
	padding: 0.4em;
	border-radius: var(--inputBorderRadius);

	display: flex;
	gap: .5em;

	span {
		flex-grow: 1;
	}

	button {
		width: 20px;
		height: 20px;
		padding: 0;
	}
}

.noStyles {
	margin: 2em 4em;
	font-style: italic;
	color: var(--deemphasizedTextColor);
}
</style>