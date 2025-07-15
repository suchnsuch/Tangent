<script lang="ts">
	import {TemplateButtonCallback} from "../../../common/templatebuttons";
	import {tooltip} from "../../utils/tooltips";

    export let templateText: string;
	export let saveCurrentSelection;
	export let insertTemplateText: TemplateButtonCallback;

	// Handler function that calls the prop function
	function handleClick() {
		insertTemplateText(templateText);
	}

	function handleMouseDown() {
		saveCurrentSelection();
	}
</script>

<!--
@component
CreationRule TemplateButton is a specific utility component that mainly exists to ensure that what a button *says* it will
insert and is actually inserted, only has a single source of truth.

This component accepts two callbacks: one to save the current focus, which should fire before the button steals focus from
the template input (and erases the selection start and end) The other callback is fired when the button has definitely been
engaged, and follows the TemplateButtonCallback interface to  request insertion of the template string into the Template input.
-->

<button use:tooltip={`Click to insert template token "${templateText}" into template string`} on:mousedown={handleMouseDown} on:click={handleClick}>
	{templateText}
</button>

