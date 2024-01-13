Tangent's query syntax powers its query-based search system. See [[Queries]] for an overview.

```tangentquery
Notes in [[Inbox]] with 'pending'
```
(An example query that finds notes within the "Inbox" folder with the text "pending")

A query is built out of two primary parts: __Forms__ and __Clauses__. The essential structure is:
	`{<form list> (<clause groups>)}`

# Forms
The forms defined for a query determine what types of items the query will return. The forms have a small hierarchy, with some form keywords implicitly including multiple sub-forms.

* `Files` looks for all files that Tangent is prepared to visualize. 
	* `Notes` looks for files with the `.md` extension: the notes Tangent works with on a regular basis.
	* `Images` looks for image files. This includes `.png`, `.jpeg`, `.tiff`, `.svg` and more.
* `Sets` looks for items that can contain files.
	* `Folders` looks for standard folders.
	* `Queries` looks for saved queries. (These are _technically_ files, but we'll ignore that.)

# Clauses
A clause filters a form by some criteria. Clauses are built out of __Keywords__ and __Values__.

For example, in the query `Notes with "thing"`:
	* `Notes` is the form.
	* `with` is the clause keyword.
	* `"thing"` is the clause value.

The clause keyword provides context for how Tangent should process the clause value. There are several keywords, each of which are capable of handling different values.

## Keywords and Supported Values
`named`
	Filters items based on their name
	`"<string>"`
		Looks for the exact match in items' names. Case sensitive.
	`'<string>'`
		Searches items' names with a tokenized search. Not case sensitive.
	`/<regex>/`
		Searches items' names with the provided regex.

`with`
	Filters items based on their contents
	`[[<wiki link>]]`
		For `Notes`, requires that they contain a link to the given note. For `Sets`, requires that the set includes the file in question.
	`#tag`
		Looks for notes that contain the given tag or any children of that tag.
	`<open|closed>? todo`
		Looks for notes that contain todo items. See [[Todos#Querying Todos]] for a full breakdown of the supported modifiers.
	`{<subquery>}`
		Items containing or linking to items in the subquery.
	`"<string>"`	
		Looks for the exact match in note contents. Case sensitive.
	`'<string>'`	
		Searches note contents with a tokenized search. Not case sensitive.
	`/<regex>/`
		Searches note contents with the provided regex.

`in`	
	Filters items based on the sets that contain them.
	`[[<wiki link>]]`
		Selects items within the linked set or note.
	`{<subquery>}`
		Selects the items within the defined subquery.
		

# Clause Groups
Clauses can be combined together to create complex compound queries. The keywords `and` and `or` and parenthetical groups `()` let you apply boolean logic to the queries.

Selection keywords on the same level are `and` joins unless overridden.
	The following are equivalent:
		* `in [[my folder]] with [[note link]]`
		* `in [[my folder]] and with [[note link]]`
		* `(in [[my folder]] with [[note link]])`
		* `(in [[my folder]]) and (with [[note link]])`
	The following are equivalent:
		* `in [[my folder]] or with [[note link]]`
		* `(in [[my folder]]) or (with [[note link]])`

When you want to select for multiple values with the same clause keyword, you can do that without repeating the keyword.
	The following are equivalent:
		* `with [[my folder]] and [[my note]]`
		* `with [[my folder]] and with [[my note]]`
		* `with ([[my folder]] and [[my note]])`

When using this condensed form, the `or` keyword only applies to values within the same keyword.
	The following are equivalent:
		* `with [[Note 1]] or [[Note 2]] in [[my folder]]`
		* `(with [[Note 1]] or [[Note 2]]) and in [[my folder]]`

Parenthetical groups can always be used to break up the default way clauses are joined. e.g. `with [[Note 1]] or (with [[Note 2]] and in [[my folder]])` will only return notes linking to "Note 2" if they are also in "my folder", but will return _any_ note that links to "Note 1".


# Clause Negation
You can invert the effect of a clause with the `not` keyword. For example, `Notes not in [[my folder]]` would find all notes not within the folder named "my folder". 

The `not` keyword will continue to apply to values that elide the clause keyword.
* `Notes not with 'foo' and 'bar'` can be read as `Notes not (with 'foo' and 'bar')`, with both clauses negated.

This continuation will be broken with the inclusion of a clause keyword.
* `Notes not with 'foo' and with 'bar'` is read as `Notes (not with 'foo') and (with 'bar')`.
* `Notes not with 'foo' or 'bar' and with 'sat'` is read as `Notes (not with 'foo' and 'bar') and with 'sat'`.

When in front of an explicit group, `not` only pertains to that group.
* In `Notes not (with 'foo' or named 'bar') and with 'sat'`, the `not` only applies to the group immediately after it.


# Subqueries
Sometimes, you want to use the results of one query to feed into the results of another.
* You can embed subqueries into your queries using curly brackets: `{}`.
* You can also save queries and reference them in a query with wiki links, e.g. `[[My Query]]`.

Subqueries can be used with the `in` and `with` keywords. These keywords can be further modified with `any` or `all`.

`<x> in {<y>}` is a straightforward check that items appear in the query.
	* `Notes in {Notes with 'text'}` is the same as `Notes with 'text'`.
		* This can still be useful if you use saved queries, e.g.:
			* `Notes in [[Notes About Text]]`
	* `Notes in {Folders named 'Dog'}` will not find anything, because the subquery `{Folders named 'Dog'}` does not find any `Notes`.

`<x> in any {<y>}` or `<x> in all {<y>}` does an `in` check on all of the items in the query.
	* `Notes in any {Folders named 'Dog'}` will find all of the notes in all of the folders that contain 'Dog'.
	* `Notes in all {Folders named 'Dog'}` will only find anything if there is only one folder with 'Dog' in the name. A note cannot be in two folders at once!

`<x> with {<y>}` is equivalent to `<x> with all {<y>}`. It requires that items have _all_ of the elements found in the query. to pass.
	* `<x> with any {<y>}` simply requires that an item has one of the items within itself.

# Examples
### Find Notes within a folder
`Notes in [[Your Folder]]`

### Find Notes with content within a folder
`Notes in [[Your Folder]] with 'your content'`

### Find Notes within one of three different folders whose names contain "meeting"
`Notes in [[Folder 1]] or [[Folder 2]] or [[Folder 3]] named 'meeting'`
This could be rewritten with [[#Subqueries]]:
	`Notes in any { Folders named "Folder" } named 'meeting'`