Todo items are a sub-type of [[Lists]]. A list item appended with ` [ ]` will become an incomplete, or "open" checkbox. A list item appended with ` [x]` will become a complete, or "closed" checkbox.

- [ ] Open todo item
- [x] Closed todo item

You can click directly on the checkbox to toggle the state of the todo item.

# Querying Todos
You can write [[Queries]] for todos using the `todo` or `todos` keyword with modifiers.

`Notes with todos` will find all notes with any todo item (open or closed).

`Notes with open todos` will find all notes that have any incomplete todo items. You can also use `incomplete`, `unfinished`, and `unchecked` in place of `open`.

`Notes with closed todos` will find all notes that have any completed todo items. You can also use `complete`, `done`, `finished`, or `checked` in place of `closed`.