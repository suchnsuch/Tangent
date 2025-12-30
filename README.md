# Tangent
This is the monorepo for the [Tangent](https://www.tangentnotes.com) project.

Pre-built binaries can be found [on the downloads page](https://www.tangentnotes.com/Download) and [on Flathub](https://flathub.org/apps/io.github.suchnsuch.Tangent). Pre-release versions are also available on [Flathub Beta](https://docs.flathub.org/docs/for-users/installation#flathub-beta-repository).

Tangent is a local note writing / personal knowledge management tool. It was heavily inspired by Obsidian, and has drifted in its own direction. It uses `[[Wiki Links]]` and a slightly customized markdown syntax. Notes are fully styled as you write. Markdown syntax is hidden and revealed as needed.

Other key features:
* An innovative, two-dimensional connected map of your navigation and linking history.
* "Sliding Panel" UX inspired by [Andy Matuschak's notes](https://notes.andymatuschak.org/About_these_notes).
* Writing focus mode: highlight your current paragraph, line, or sentence.
* Customizable note views: view your collections of notes as cards or an infinite, dynamically loaded feed.
* A custom query language (with autocomplete!) for custom complex searches.
* Support for embedded images, link previews, pdfs, audio, and video—including YouTube links!

## Modules
There are multiple modules contained within this repo.

### Applications
The `apps` directory contains modules that produce versions of Tangent and other Tangent-related executables.
* [tangent-electron](./apps/tangent-electron/README.md) – The electron-based Tangent application.
* [tangent-website](./apps/tangent-website/README.md) – The source code of [tangentnotes.com](https://www.tangentnotes.com).
* [tangent-test-workspace-generator](./apps/tangent-test-workspace-generator/README.md) – A simple CLI tool for generating test content.

### Packages
The `packages` directory contains modules that provide libraries of Tangent-related functionality.
* [tangent-html-to-markdown](./packages/tangent-html-to-markdown/README.md) – The parser used to convert `text/html` clipboard data to Tangent-specific markdown text.
* [tangent-query-parser](./packages/tangent-query-parser/README.md) – A parser for the Tangent Query language.

### Lib
The `lib` directory contains externally-versioned libraries that have been added as a git submodule for various reasons.
* [typewriter](./lib/typewriter/README.md) – A tangent-specific fork of the [Typewriter](https://github.com/typewriter-editor/typewriter) project.


## Building Locally
1. Ensure that all submodules are synced (e.g. `git submodule update`).
2. Run `npm ci` at the root level of the repository to install all dependencies across the monorepo.
3. Run `npm run build` at the root level of the repository to build all dependencies.
4. Run `npm run dev` (or `dev:win` on Windows) in `./apps/tangent-electron` to run tangent in development mode.


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
