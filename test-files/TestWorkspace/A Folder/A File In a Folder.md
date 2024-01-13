# File In Folder
It even includes spaces in the name! And in the folder!

Simply remarkable. However will we cope.

## Obsidian Link Resolution
[[/Same Name]] - Links to root

[[Same Name]] - Links to adjacent file

[[A Folder/Same Name]] - Treated like an absolute link

[[A Folder/Subfolder/Same Name]] - Works as if it was local

[[Same Name]] - Works as expected

The problem with Obsidian style links is that – by default – they are not portable. A folder of markdown authored with internal references `[[Folder/File]]` will break when moved elsewhere unless they were created as `[[./File]]`, which requires forethought. Obsidian probably provides link renaming functionality to fix this if you move from within the application of course.

A better reason to be explicit is that the addition of new notes *won't break your shit*. Linking to `A Folder/Same Name` with `[[Same Name]]` from root is fine until you add a `Same Name` file at the root level. Now your link is broken! Obsidian's solution to this is to detect that you're about to break a link through the addition of the new file and offers to update other links to fit.

Resolving to absolute links when there is _any_ potential for misunderstanding is a good call. It's certainly the least complicated call. There is something within me that _really_ wants to approach it from the "closest option that fits from here" methodology.

### The Difference
There is really only one fundamental difference between what I want and what Obsidian does.

- Obsidian does not consider the location of current note when resolving links. I want to.

This is the same behavior as not specifying an origin in my current link resolution. This is the easiest path forward _by far_, and it will preserve Obsidian compatibility.

[[TestFile]]