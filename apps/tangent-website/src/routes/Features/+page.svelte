<script>
import ImageSwitch from '../ImageSwitch.svelte'
import '../style.css'

</script>
<article>
	<section>
		<h1>Threads of Thought</h1>
		<ImageSwitch path="/shots/thread" class="screenshot" alt="An example of Tangent's thread view, with many notes stacked on top." />
		<p>
			As you follow and create links, the path behind you is retained and represented with horizontally sliding panels in the <span class="accentText">Thread View</span>.
			These panels let you easily slide up and down the path of your thought process.
		</p>
		<p>
			Explore freely without losing your place.
		</p>
	</section>

	<section>
		<h1>Maps of Cognition</h1>
		<ImageSwitch path="/shots/blades-map" class="screenshot" alt="Able to track the complex connections between many notes, Tangent can be an excellent tabletop RPG companion." />
		<p>
			Get a bird's eye view of your thought process with the <span class="accentText">Map View</span>.
			Nodes and connections are automatically created as you write and navigate.
		</p>
		<p>
			Gain perspective after diving into a warren of your own thoughts.
			Remind yourself of what you were doing yesterday.
			Find new connections and dive back in.
		</p>
		<p>
			Never get lost.
		</p>
	</section>
	


	<section>
		<h1>Beautiful, Accessible Markdown<sup>ish</sup></h1>
		<ImageSwitch path="/shots/markdown-syntax" class="screenshot" alt="An example of Tangent's display of markdown text." />
		<p>
			Tangent fully styles your markdown as you type.
			Markup notation melts away as you leave it behind and reappears as soon as you need it.
		</p>
		<p>
			Supports headers, bold, italics, highlights, web links, embedded images, lists, YAML front matter, LaTeX math, Mermaid Diagrams, and code blocks with syntax highlighting.
		</p>
	</section>


	<section>
		<h1>Effortless Wiki Links</h1>
		<ImageSwitch path="/shots/wiki-links" class="screenshot" alt="An example of how many wiki links to a topic can be viewed as back links." />
		<p>
			Tangent uses wiki-style <span class="accentText">[[Double Bracket Links]]</span> to connect notes together by filename.
			Autocomplete makes this easy.
		</p>
		<p>
			Notes know what they link to <em>and</em> what links to <em>them.</em>
			If you're coming from Obsidian, the links between your notes already work!
		</p>
	</section>


	<section>
		<h1>Embedded Media</h1>
		<ImageSwitch path="/shots/embeds" class="screenshot" alt="A showcase of embedded audio, video, and images." />
		<p>
			Tangent displays images, audio, video, and PDFs within your workspace. Embed local and remote media directly into your notes.
		</p>
	</section>


	<section>
		<h1>Minimalist Focus Mode</h1>
		<ImageSwitch path="/shots/focus-mode" class="screenshot" alt="An example of Tangent's sentence-level focus mode." />
		<p>
			Dial in your focus to one note, one paragraph, one sentence.
			Tangent clears everything else out of the way while keeping your place.
		</p>
	</section>

	<section>
		<h1>Tags</h1>
		<ImageSwitch path="/shots/todo-tag" class="screenshot" alt="An example of using tags and to-do items in Tangent."/>
		<p>
			Easily mark up your notes with additional context.
			Includes support for nested tags for the organizational extremists.
		</p>

		<h1>To-Do Items</h1>
		<p>
			Add to-do checkboxes to your list items to keep track of elements still in progress.
		</p>
	</section>
	

	<section>
		<h1>Custom Query Language</h1>
		<ImageSwitch path="/shots/queries" class="screenshot" alt="An example of Tangent's query language in action." />
		<p>
			Easily find notes from across your workspace based on links, tags, todos, or just any bit of text, using a custom query language.
		</p>
		<p>
			Save those queries and reference them at any time. You can even use them in other queries!
		</p>
	</section>


	<section>
		<h1>Robust Keyboard Control</h1>
		<ImageSwitch path="/shots/command-palette" class="screenshot" alt="An example of Tangent's command palette." />
		<p>
			A shortcut for nearly every action, and a command palette for all of the rest. All customizable.
		</p>
		<p>
			Create and move between notes. Add and follow connections. Reorganize your files.
			All without taking your fingers from your keyboard.
		</p>
	</section>


	<section>
		<h1>Customizable Environment</h1>
		<ImageSwitch path="/shots/settings" class="screenshot six" alt="An example of Tangent's Settings." />
		<p>
			Customize essential fonts, colors, and spacing settings directly in Tangent.
		</p>
		<p>
			Configure <span class="accentText">Creation Rules</span> to automate the process of creating new notes with templated names and automatic folder locations.
		</p>
		<p>
			Dive deep into customization with custom CSS, including built-in support for targeting specific folders with custom styles.
		</p>
		<p>
			Make your workspace your own. Make it comfortable.
		</p>
	</section>
	


	<h1>Plain Text Under Your Control</h1>
	<p>
		Tangent reads and writes markdown files directly on your computer.
		There is no server to connect to.
		Your notes are always ready for you, no matter what the internet is doing.
	</p>
	<p>
		Your notes are not locked away in a proprietary format.
		They remain open to any program that can read plain text.
	</p>
	<p>
		Sync and version your notes with whatever system you prefer.
		Git, iCloud, Drive, Dropbox, it all just works.
	</p>

	<p class="action">
		<a href="/Download" class="local buttonLink">Download Tangent</a>
	</p>
</article>

<style lang="scss">
h1 sup {
	font-size: 40%;
}

:global(.screenshot) {
	display: block;
	width: min(var(--pageWidth), 100%);
	margin-left: auto;
	margin-right: auto;
	border-radius: 4px !important;
}

@media (min-width: 1024px) {
	section {
		max-width: calc(var(--pageWidth) * 2);
		margin: 12rem auto;

		display: grid;
		grid-template-columns: 50% 50%;
		grid-template-rows: auto;

		row-gap: 1rem;
		column-gap: 2rem;

		h1, p {
			max-width: unset;
			margin: unset;
			grid-column: 1;
		}

		p {
			padding-left: 0;//.5em;
		}

		:global(picture) {
			grid-column: 2;
			grid-row: 1 / span 6;
		}

		:global(.screenshot) {
			display: block;
			//width: min(var(--pageWidth), 100%);
			width: 100%;
			margin-left: unset;
			margin-right: unset;
			border-radius: 4px !important;
		}

		&:nth-child(even) {
			h1, p {
				grid-column: 2;
			}
			:global(picture) {
				grid-column: 1;
			}
		}
	}
}

@media (min-width: 1500px) {
	section {
		max-width: calc(var(--pageWidth) * 2.5);

		grid-template-columns: 33% 66%;
		grid-template-rows: auto;

		&:nth-child(even) {
			grid-template-columns: 66% 33%;
		}
	}
}

</style>