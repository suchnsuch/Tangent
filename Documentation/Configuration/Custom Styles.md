You can take full control over how Tangent looks with custom CSS files. Custom CSS lives in the `.tangent/styles` folder of a workspace. This folder can be accessed from the "Custom Styles" section of the [[System Menu]] by clicking on the "Open Styles Folder" button.

Any CSS files in this folder can be activated by ticking their checkbox. Active styles automatically update when saved.


# Styling Guide
A good reference point for how Cascading Style Sheets (CSS) works can be found at the [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS). The rest of this section will assume you have basic knowledge of writing styles with CSS.

When working with styles, the development console is critical. On Mac, you can open it by pressing `Cmd+Option+I`. On Windows and Linux, you can open it with `Ctrl+Shift+I`. This will open a pane that will let you inspect all of the elements that make up Tangent's UI and see how they are styled. See the [documentation on inspecting styles](https://developer.chrome.com/docs/devtools/overview/#elements) for more information.

Note that the version of Electron that Tangent uses supports [native CSS nesting](https://www.sitepoint.com/an-introduction-to-native-css-nesting/)! This makes writing custom styles much more convenient.

## Selector Scope & Specificity
In order to take effect, your styles will need to have higher [specificity](https://developer.mozilla.org/en-US/docs/Web/CSS/Specificity) than the default styling. An easy way to achieve that is to append `!important` on the end of each parameter, but a better way is to match or exceed the specificity of the default selection.

## Global Styling Variables
Tangent makes extensive use of [CSS variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) to control styling. The majority of the variables are defined in `global.css`, which can be viewed from the "Sources" tab of the development tools.

These variables are defined for both **light** and **dark** themes with the `.light` and `.dark` selectors, respectively. By using those selectors, your custom styles can match the global [[Appearance]] of Tangent.

## Styling Notes
Notes are styled under the `article.note` selector. Using this selector yourself will set you up for matching specificity, and will limit the effect your styles will have to just the content of your notes.

## Path-Based Styling
Path based styling lets you control how notes look like within specific folders.

Notes, folders, and other items viewable in Tangent are wrapped in a series of CSS classes based on the folders they are in. These classes are prefixed with `PATH_` to avoid collision with other classes.

Take for example, a note with the workspace path `Outer/Inner/Note.md`. This note will be wrapped in the following classes:
* `PATH_FILES` as the note is a file.
* `PATH_Outer` and `PATH_Inner` for each of the individual items in the path.
* `PATH_FILES--Outer--Inner`, and `PATH_Outer--Inner` to represent the relationship between the various directories. Note how `--` is used as a path separator.

CSS classes are very restrictive in the characters they can use. Non-compliant characters in a directory path will be replaced with `_`. For example a folder called "My Sweet Folder!" would be turned into `My_Sweet_Folder_`, with the spaces and exclamation mark replaced.

## Troubleshooting
It is completely possible to break Tangent by making critical elements inaccessible. There are two ways to disable custom styles that have gone awry: remove the css files from the styles folder, or remove the file from the `styleFiles` list in the `.tangent/workspace-settings.json`.