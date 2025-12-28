<script lang="ts">
import { fade, fly } from 'svelte/transition'
import type ModalState from 'app/model/ModalState'
import './ModalStyles.scss'
export let modalState: ModalState

$: modalComponent = modalState.currentComponent
$: modalProps = modalState.currentProperties

$: {
	if ($modalComponent) {
		const element = document.activeElement
		if (element && element instanceof HTMLElement) {
			element.blur()
		}
	}
}

function closeModal() {
	modalState.close()
}
</script>

{#if $modalComponent}
<div class="modal">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modalBack"
		transition:fade|global={{ duration: 100 }}
		on:click={closeModal}></div>
	<div class="modalFront"
		transition:fly|global={{ duration: 100, y: -100 }}>
		<svelte:component this={$modalComponent} {...($modalProps || {})}/>
	</div>
</div>
{/if}

<style>
.modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;

	display: flex;
	justify-content: center;

	z-index: 10000;
}

.modalBack {
	position: fixed;
	inset: 0;

	background-color: black;
	opacity: .3;
	z-index: 10000;
}

.modalFront {
	position: fixed;
	top: 0;
	margin: 0 auto;
	z-index: 10001;

	box-shadow: 0 0 20px rgba(0, 0, 0, .3);
}
</style>