# Tangent
This is the monorepo for the [Tangent](https://www.tangentnotes.com) project.

Follow Tangent on <a rel="me" href="https://indieapps.space/@tangentnotes">Mastodon</a>!

## Getting Started
Run `npm ci` at the root level of the repository to install all dependencies across the monorepo.

## Modules
There are multiple modules contained within this repo.

### Applications
The `apps` directory contains modules that produce versions of Tangent and other Tangent-related executables.
* [tangent-electron](./apps/tangent-electron/README.md) – The electron-based Tangent application.
* [tangent-test-workspace-generator](./apps/tangent-test-workspace-generator/README.md) – A simple CLI tool for generating test content.

### Packages
The `packages` directory contains modules that provide libraries of Tangent-related functionality.
* [tangent-html-to-markdown](./packages/tangent-html-to-markdown/README.md) – The parser used to convert `text/html` clipboard data to Tangent-specific markdown text.
* [tangent-query-parser](./packages/tangent-query-parser/README.md) – A parser for the Tangent Query language.

### Lib
The `lib` directory contains externally-versioned libraries that have been submoduled for various reasons.
* [typewriter](./lib/typewriter/README.md) – A tangent-specific fork of the [Typewriter](https://github.com/typewriter-editor/typewriter) project.

## Reporting Issues
When creating an issues, be sure to use the appropriate label for the specific module.

When reporting bugs, please include:
1. The version of the relevant app / package.
2. A concise description in the title of the problem.
	* e.g. "Clicking the New Note button does not create a new note"
3. A thorough description of the problem in the body of the issue.
	* The steps required to cause the problem.
		* For example:
			1. "Open a blank workspace"
			2. "Click the New Note button"
			3. "Notice that a new note is not created"
	* Include any additional details or context that can help illuminate the issue.
4. Logs can sometimes be very helpful in sussing out a problem.
	* In-window logs for Tangent can be found from the developer console. You can open this with `Cmd+Option+I` on Mac or `Ctrl+Shift+I` on Windows and Linux. Attaching a screenshot or the contents of these logs can be useful.
	* Application logs for Tangent can be found in the relevant log folder on your system. You can invoke the "Show Logs" command from the Command Palette in Tangent (`Cmd/Ctrl+P` to open the palette) to bring you directly to the logs.
