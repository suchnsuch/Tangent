Tags are a categorization tool that let you organize your notes outside of a folder structure.

#example-tag

Tags start with the `#` character proceeded immediately by the name of the tag. Spaces are not allowed, but you can use `camelCase`, `underscore_characters`, and `dash-characters` to deliminate between words.

You can `Mod+Click` on tags or press `Mod+Enter` while the editing cursor is within a tag to navigate to the set of all notes with that tag in a new pane.


# Child Tags
Tags can include `/` or `.` characters to denote child tags.

#example-tag/example-child

Child tags are implicitly members of their parent tags. Searching for `#example-tag` will show any note tagged with `#example-tag/example-child`.


# Querying for Tags
Tags can be searched for directly in [[Queries]] by using the tag as a target value. For example, `Notes with #example-tag` will find all notes containing #example-tag or any of its children.


# Tags In Front Matter
You can also include tags in the [[Front Matter]] for your notes by listing them under a `tags` property. For example:

```yml
tags: ['my-tag', 'my-other-tag']
```

Or:

```yml
tags:
	- my-tag
	- my-other-tag
```

---

# Tags vs Links for Categorization
Many people have a preference for whether they categorize their notes via Tags or via [[Wiki Links]]. I personally prefer links when trying to denote "x pertains to y". This matches with the practice of having notes named after a particular topic. By linking to the note for a topic, you have both marked a note as relating to a topic and provided an easy way for a reader (you) to get more information on that topic.

Naturally, you can use tags for this as well. It's all down to personal preference. I prefer to use tags as information embedded within a note rather than as a way to group notes around a similar topic. For example, a "user story" note might have the tag #status.in-progress or #status.done. This certainly categorizes the note, but that categorization is more about the note itself than its relationship to other notes.
