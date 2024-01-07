If you have a note that you want to be able to find and refer to by multiple different names, you can set those names in the `aliases` array property in the [[Front Matter]] of your note.

As front matter is YAML, you can format it like this:
```yaml
aliases: ['My Cool Note', 'Cool Note']
```

Or like this:
```yaml
aliases:
	- My Cool Note
	- Cool Note
```

The two examples above are equivalent.

When searching for notes, if your search term matches an alias for a note better than the note's actual title, the alias will show up in the search results.

When creating [[Wiki Links]] to notes with aliases, you will be shown all aliases for the note that match your search input. If you select an alias to link to, that alias will be autofilled as customized link text.