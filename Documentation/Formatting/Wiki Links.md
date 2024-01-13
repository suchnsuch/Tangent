Tangent supports the standard `[[Double Bracket]]` wiki link syntax for linking to a note by name within the same workspace.

You can follow a link goes by command-clicking on Mac or control-clicking on Windows. You can also follow a link that the typing cursor is hovering over by pressing `Command+Enter` on Mac or `Control+Enter` on Windows.

Wiki links to notes will resolve to your chosen accent color (green by default). Wiki links to notes that do not exist will show in red. This is not necessarily a bad thing! I can be useful to create a link to a topic or thought without adding content. Tangent will autocomplete to that link either way.

## Autocomplete
Typing the first two brackets `[[` will bring up the autocomplete menu. You can also summon autocomplete from within an existing wiki link by pressing `Control+Space`.
![[Wiki Link Autocomplete Example.png|250]]
The autocomplete menu will present a series of notes that you have recently edited. You can type to search for a note by name. You can autocomplete a link to the note by clicking on an option or using the cursor keys to select and the enter key to accept.

## Custom Wiki Link Text
Linking to notes by name is convenient, but sometimes it's not good enough. You can change the text that a wiki link appears as by adding a `|` character to the end of the note name and typing whatever text you please. For example: `[[Note Name|the text you want]]`.

## Linking to Headers
You can link to headers by adding the `#` character and then the name of the header: `[[Note Name#Note Header]]`.

You can link to headers within the same note by not including the note name: `[[#Note Header]]`.

The autocomplete menu will assist you in finding and linking to the right header.

## Advanced Link Interactions
You can open a link in the current pane by `Cmd/Ctrl+Shift`-clicking it or pressing `Cmd/Ctrl+Shift+Enter` with the cursor in the link. This effectively replaces the current item in the thread with the linked item.

You can open a link to the _left_ of the current pane by `Cmd/Ctrl+Alt`-clocking it or pressing `Cmd/Ctrl+Alt+Enter` with the cursor in the link. This effectively "rebases" the thread with the linked item acting as the new root of the thread.

When creating a new link in autocomplete, the following shortcuts may be useful:
* `Cmd/Ctrl+Enter` will complete and open the link immediately.
* `Shift+Enter` will end autocomplete with the current text, making it quick and easy to create new notes that have names similar to other notes.