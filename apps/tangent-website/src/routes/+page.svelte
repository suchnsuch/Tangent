<script>
import ImageSwitch from './ImageSwitch.svelte'
import './style.css'
</script>

<article class="note">
	<ImageSwitch class="example_notes screenshot" path="/shots/thread-short" alt="An example of Tangent's threaded sliding panels."/>
	
	<p style="font-style: italic; text-align: center;">
		A clean and powerful open source notes app for Mac, Windows, and Linux
	</p>

	<p class="action"><a class="local buttonLink" href="/Download">Download Tangent</a></p>

	<h1>Write Tangentially</h1>
	<p>
		Tangent is designed to let you write the way you think.
		Your thoughts are connected;
		Tangent lets you link to existing notes and make new ones with ease.
	</p>
	<p>
		Let your mind wander along the path of interest.
		Don't suppress thoughts, embrace them.
	</p>

	
	<h1>Explore With Confidence</h1>
	
	<p>
		Tangent visualizes the path of your thoughts with elegant sliding panels
		and a branching map that builds itself as you write. You always know where you are and where you've been.
	</p>
	<img class="example_map" src="/map.png" alt="An example of a map of connections between visited notes."/>
	<p>
		Follow the thread of your thoughts in any direction they take you. Never get lost.
	</p>

	<h1>Own Your Own Thoughts</h1>
	<p>
		Tangent works with local files directly on your device.
		Notes are stored as markdown files. They can be read or written to by any text editor.
	</p>
	<p>
		Nothing is hidden from you. Everything is yours.
	</p>

	<h1>Free Forever</h1>
	<p>
		Tangent is open source under the Apache 2.0 license. Its source code can be found on
		<a href="https://github.com/suchnsuch/Tangent" target="_blank">Github</a>.
	</p>

	<p class="action"><a class="local buttonLink" href="/Download">Get Started</a></p>
</article>

<style lang="scss">
article :global(img) {
	display: block;
	margin: 0 auto;
}

article :global(.example_notes) {
	width: min(90em, 100%);
}

.example_map {
	width: min(60em, 100%);
	border-radius: 1em;
}
</style>