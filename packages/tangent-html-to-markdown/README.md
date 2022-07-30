# Tangent's HTML to Markdown
This package converts an HTML string to the specific needs and desires of [Tangent's](https://www.tangentnotes.com) flavor of markdown. This is currently used as the converter when copy/pasting text from the web or other rich text sources that provide `text/html` data when copied.

The current implementation wraps [Turndown}(https://github.com/mixmark-io/turndown) with many custom rules and pre/post-processing to get the desired result.

## Design Goals
The overarching goal is that when you copy/paste text from the web or other source, pasting it into Tangent should result in something as close as possible to the source given the restrictions of Markdown.

This includes basics like **bold** and _italic_ text or links, but this package also makes some attempts to make apparent line spacing match in a reasonable fashion. How this is achieved will be heavily dependent on the source.

## Bug Reports
Is Tangent not handling a copy/paste in the way you expect? Open an issue describing the problem!

The most helpful bug reports will have the source html in the clipboard. When you paste a clipboard containing `text/html` data into Tangent, Tangent prints out the content of that data to the window's developer console (open with `Ctrl+Shift-i` or `Cmd+Opt+i`). Including this in a bug report along with the output you're seeing and the output you expect will help a lot when fixing problems.

## Contributing & Bug Reports
This package is published so that enterprising Tangent users can provide new test cases and new updates to those test cases. See the `tests/` and `tests/compare-files.test.ts` for existing tests.

The source `text/html` data logged to the Tangent developer console can be used as the source for a test (e.g. `my-pasted-problem.html`). An accompanying `.md` file (`my-pasted-problem.md`) is then used as the expected output that the actual parser will be compared against. A small update to `compare-files.test.ts` (which should be essentially self-explanatory given the existing examples) adds the input/output pair to the test suite.

The ideal pull request includes both the input and expected output files as well as any necessary updates to the parsing system that solve the parsing problem.

Pull requests that just add input/output pairs are also great! Those branches can be used as the basis for PRs that include the solution to whatever problem exists.