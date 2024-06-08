Todo items are a sub-type of [[Lists]]. A list item appended with ` [ ]` will become an incomplete, or "open" checkbox. A list item appended with ` [x]` will become a complete, or "done" checkbox. You can also cancel a checkbox with ` [-]`.

- [ ] Open todo item
- [x] Closed todo item
- [-] Canceled todo item

You can click directly on the checkbox to toggle the state of the todo item from open to done. You can right-click on the checkbox to choose from all options.

# Querying Todos
You can write [[Queries]] for todos using the `todo` or `todos` keyword with modifiers.

`Notes with todos` will find all notes with any todo item (open or closed).

`Notes with open todos` will find all notes that have any incomplete todo items. You can also use `incomplete`, `unfinished`, and `unchecked` in place of `open`.

`Notes with complete todos` will find all notes that have any completed todo items. You can also use , `done`, `finished`, or `checked` in place of `complete`.

`Notes with canceled todos` will find all notes that have any canceled todo items.

`Notes with closed todos` will find all notes that have _either_ complete or canceled todos.