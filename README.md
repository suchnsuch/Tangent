Feb 14, 2025 - starting the DH Primer Project

The goal is to integrate tutorials and lessons I've built over the years (including ODATE) into a single application. Tangent makes a fantastic base because of the way it imagines knowledge management and note taking. By integrating all of our tutorial materials as a default library/workspace in Tangent, a student could use the app as a combination textbook and zettlekasten-like notes/observation platform. ODATE pushed the reader to Binder to explore code. I want to do that locally instead through Tangent. Can I do that? Only one way to find out!

Stage 1 - Text
+ integrate all of the various tutorials etc into Tangent.
+ develop templates for student use with the tutorials
+ develop a teaching guide

Stage 2 - Computational Notebooks
+ integrate ipynb notebooks with Python & R packaged in as well
+ bundle appropriate packages
+ edit ipynb from within Tangent, bundle jupyter notebook for code execution


# Original Readme:

# Tangent
This is the monorepo for the [Tangent](https://www.tangentnotes.com) project. Pre-built binaries can be found [on the downloads page](https://www.tangentnotes.com/Download) and [on Flathub](https://flathub.org/apps/io.github.suchnsuch.Tangent).


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
