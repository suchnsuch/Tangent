# Inline Code
Tangent supports the standard markdown formatting for inline code by surrounding text in `` `backtick characters` ``. If you want to show back-tick characters in an inline code span, you can use two back-ticks.

You can toggle inline code with the `Cmd/Ctrl+\` shortcut.

# Code Blocks
You can create code blocks by starting a line with three back-tick characters at the start and end of an area that you want to be rendered as code. On the opening line, you can also specify a language that will be used for syntax highlighting. For example:

```js
// Here is some js code
let foo = { bar: 'bat' }

function zoomify(target) {
	target.zoom = 'zoom' // IDK, you get it
}
```

Tangent [[Markdown Syntax#CodeCode Blocks|deviates from standard markdown]] and _does not_ support the standard code block syntax of indenting text by four spaces or a tab.