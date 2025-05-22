<script lang="ts">
import { flip } from 'svelte/animate'
import { fly } from 'svelte/transition'
import type WindowAPI from 'common/WindowApi'
import type { UserMessage } from 'common/WindowApi';

export let api: WindowAPI

let nextId = 0

interface Message extends UserMessage {
	id: number
	timeout?: number
}

let messages: Message[] = []

api.onMessage(addMessageToStack)

function addMessageToStack(message: UserMessage) {
	const newMessage: Message = {
		...message,
		id: nextId,
	}

	nextId++

	startTimeout(newMessage)

	messages.push(newMessage)
	messages = messages
}

function removeMessage(message: Message) {
	const index = messages.indexOf(message)
	if (index >= 0) {
		messages.splice(index, 1)
		messages = messages
	}
}

function startTimeout(message: Message, time=10000) {
	if (message.type !== 'error') {
		message.timeout = window.setTimeout(() => {
			removeMessage(message)
		}, time);
	}
}

function cancelTimeout(message: Message) {
	if (message.timeout) {
		window.clearTimeout(message.timeout)
	}
}

</script>

<main>
	{#each messages as message (message.id)}
		<article
			class={message.type}
			animate:flip={{ duration: 300 }}
			transition:fly|global={{ x: 500 }}
			on:mouseenter={ e => cancelTimeout(message)}
			on:mouseleave={ e => startTimeout(message, 2000)}
		>
			<button
				on:click={e => removeMessage(message)}
			><svg style={`width: 24px; height: 24px;`}>
					<use href="close.svg#close"/>
			</svg></button>
			{#if message.title}
				<h1>{@html message.title}</h1>
			{/if}
			<p>{@html message.message}</p>
		</article>
	{/each}
</main>

<style lang="scss">
main {
	position: fixed;
	z-index: 100000000000000001; // lol

	top: 1em;
	right: 1em;
}

article {
	position: relative;
	width: 24em;
	font-size: 90%;

	border: 2px solid var(--borderColor);
	background: var(--backgroundColor);

	padding: .5em .75em;
	margin-bottom: 1em;

	border-radius: var(--inputBorderRadius);

	word-wrap: pre-wrap;
	overflow-wrap: break-word;

	button {
		opacity: 0;

		position: absolute;
		top: .25em;
		right: .25em;

		width: 24px;
		height: 24px;
		padding: 0;

		transition: opacity .3s;
	}

	&.error {
		border-color: red;
		background-color: darkred;
		color: white;

		button {
			background-color: darkred;
		}

		h1 {
			&::before {
				content: '⚠️ Error: ';
			}
		}
	}
	&.warning {	
		border-color: darkgoldenrod;

		button {
			background-color: darkgoldenrod;
		}

		h1 {
			color: darkgoldenrod;
			&::before {
				content: '⚠️ ';
			}
		}
	}

	button {
		&:hover {
			background-color: rgba(0, 0, 0, .2);
		}
		&:active {
			background-color: rgba(0, 0, 0, .3);
		}
	}

	&:hover button {
		opacity: 1;
	}

	h1 {
		font-size: 110%;
		margin: 0;
	}

	p {
		margin: 1em 0;
		white-space: pre-wrap;
		&:last-child {
			margin-bottom: 0;
		}
	}
}
</style>
