Tangent uses a semi-custom flavor of markdown for formatting. You can:
- Link to notes with [[Wiki Links]] or to the internet with [[Markdown Links]]
- Insert [[Headers]]
- Use [[Bold and Italics]]
- Insert [[Lists]] and [[Todos]]
- [[Embedding|Embed Images (and other content)]]
- Insert [[Code]]
- Render [[KaTeX Equations]] for beautiful math
- Add [[Tags]]
- [[Highlights|Highlight]] text
- ~~Cross out text~~ with [[Strikethrough]]
- // Comment lines with [[Comments]]	

As your text cursor enters and leaves a formatted section, the markdown formatting will reveal and hide itself, respectively. This way, your files always look great and are always editable.

# Philosophy
The markdown language is a widely-supported standard of the internet. Even when completely unstyled, markdown is highly readable.

By using and building on markdown syntax, your notes are exceptionally portable. You are fully able to edit your notes with different editors or tools without having to import or export in and out of Tangent. Additionally, since markdown is a plain text format, it works exceptionally well with version control systems like [Git](https://git-scm.com).

# Deviations from the Standard
There are a handful of areas where Tangent deviates from standard markdown.

## [[Code#Code Blocks]]
The most notable is in code block formatting: Tangent exclusively uses the "code fence" style for code blocks, where the block start and end with three back-tick characters.

Tabs or spaces at the beginning of lines simply indents those lines. This grants much more control over the formatting of notes.

## [[Lists]]
Lists support both the `1.`, `2.` standard as well as supporting `A.`, `B.` and `a.`, `b.` as the starts for ordered lists. This gives you more expression and customization in your lists.