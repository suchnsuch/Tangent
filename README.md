# Tangent
This is the monorepo for the [Tangent](https://www.tangentnotes.com) project.

### Applications
The `apps` directory contains modules that produce versions of Tangent and other Tangent-related executables.

## Packages
The `packages` directory contains modules that provide libraries of Tangent-related functionality.
* [tangent-html-to-markdown](./packages/tangent-html-to-markdown/README.md) – The parser used to convert `text/html` clipboard data to Tangent-specific markdown text.

### Lib
The `lib` directory contains externally-versioned libraries that have been submoduled for various reasons.

## Reporting Tangent Issues
When reporting issues for Tangent itself, be sure to use the "Tangent App" label to differentiate the issue from others. https://github.com/suchnsuch/tangent-public/labels/Tangent%20App

When reporting issues, please include:
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
	* In-window logs can be found from the developer console. You can open this with `Cmd+Option+I` on Mac or `Ctrl+Shift+I` on Windows and Linux. Attaching a screenshot or the contents of these logs can be useful.
	* Application logs can be found in the relevant log folder on your system. You can invoke the "Show Logs" command from the Command Palette in Tangent (`Cmd/Ctrl+P` to open the palette) to bring you directly to the logs.
