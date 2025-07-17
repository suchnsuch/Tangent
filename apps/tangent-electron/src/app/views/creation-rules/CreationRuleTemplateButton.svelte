<script lang="ts">
import {tooltip} from "../../utils/tooltips";

/**
 * The TemplateButtonCallback interface specifies how a Template button will call back to the parent
 * component that is using this button to offer click-to-insert behavior.
 *
 * @param templateText the template text that the button wishes to insert
 */
interface TemplateButtonCallback {
	(templateText: string): void;
}

export let templateText: string;
export let insertTemplateText: TemplateButtonCallback;

// Handler function that calls the prop function
function handleClick() {
	insertTemplateText(templateText);
}
</script>

<!--
@component
CreationRule TemplateButton is a specific utility component that mainly exists to ensure that what a button *says* it will
insert and is actually inserted, only has a single source of truth.

This component accepts one callback: it is fired when the button has been clicked, and follows the TemplateButtonCallback interface to
request insertion of the template string into the Template input.
-->

<button use:tooltip={`Click to insert template token "${templateText}" into template string`} on:click={handleClick}>
	{templateText}
</button>

