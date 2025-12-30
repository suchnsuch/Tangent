<article>
	<div class="accross">
		<img class="me" src="my_face.jpg" alt="Taylor Hadden, the developer." />
		<div>
			<p>
				
				Tangent was created by
				<a href="http://everything-abridged.com/me/" target="_blank">Taylor Hadden</a>.
				It is designed to better enable his
				<a href='https://everything-abridged.com/wikilogging' target="_blank">Wikiblogging</a>
				note taking style.
			</p>
			<p>
				He hopes you find it as useful as he does.
			</p>
			<p>
				You can toot at him
				<a href="https://mastodon.social/@taylorhadden" target="_blank">@Cptn_ChillPill</a>.
			</p>
		</div>
	</div>
	
	<div class="icons">
		<a href="https://github.com/suchnsuch/Tangent" target="_blank" title="Tangent on Github!">
			<picture>
				<source srcset="GitHub_Invertocat_Light.svg" media="(prefers-color-scheme:dark)" />
				<img src="GitHub_Invertocat_Dark.svg" width="64" height="64" alt="The Github Logo" />
			</picture>
		</a>
		<a href="https://discord.gg/6VpvhUnxFe" target="_blank" title="Join the Discord!">
			<img src="discord-icon.svg" width="64" height="64" alt="The Discord Logo"/>
		</a>
		<a href="https://indieapps.space/@tangentnotes" target="_blank" title="Follow Tangent on Mastodon!">
			<img src="mastodon-icon.svg" width="64" height="64" alt="The Mastodon Logo"/>
		</a>
	</div>
	<p>
		Tangent is developed on <a href="https://github.com/suchnsuch/Tangent" target="_blank">Github</a>.
		It is open source under the Apache 2.0 license.
	</p>
	<p>
		If you have questions, requests, or just want to talk about Tangent, you can do so in the
		<a href="https://discord.gg/6VpvhUnxFe" target="_blank">community Discord server</a>,
		or by
		<a href="https://indieapps.space/@tangentnotes" target="_blank">Tooting @TangentNotes</a>.
	</p>

	<div class="icons">
		<a href="https://svelte.dev" target="_blank">
			<img src="svelte-icon.svg" width="64" height="64" alt="The Svelte Logo"/>
		</a>
		<a href="https://www.electronjs.org" target="_blank">
			<img src="electron-icon.svg" width="64" height="64" alt="The Electron Logo"/>
		</a>
	</div>

	<p>
		Tangent proudly uses 
		<a href="https://svelte.dev" target="_blank">Svelte</a>.
		
		It is built for desktop using
		<a href="https://www.electronjs.org" target="_blank">Electron</a>.
		
		The text editor is based on a heavily customized version of the 
		<a href="https://github.com/typewriter-editor/typewriter" target="_blank">Typewriter</a>
		editor.
	</p>
</article>

<style lang="scss">
.accross {
	max-width: var(--pageWidth);
	margin: 6em auto;
	display: flex;

	align-items: center;
}
img.me {
	margin-right: 2em;
	margin-left: -100px;
	width: 225px;
	height: 225px;

	border-radius: 200px;

	box-shadow: 0 0 10px rgba(0, 0, 0, .3);
}

.icons {
	max-width: var(--pageWidth);
	margin: 1.5em auto;
	margin-top: 6em;
	text-align: center;

	a {
		margin: 0 1em;
	}
}

@media (max-width: 550px) {
	.accross {
		flex-direction: column;
		margin-top: 1em;
	}
	img.me {
		margin: 0;
		width: 200px;
		height: 200px;
	}
}
</style>