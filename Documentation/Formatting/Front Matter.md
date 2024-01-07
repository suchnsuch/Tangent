Tangent supports [YAML](https://yaml.org) front matter in your notes.

To create a YAML front matter block, the first line of your note _must_ be three dashes on their own line: `---`. Anything after this will be interpreted as YAML until a closing `---` line.

Here is a simple example of a markdown file with front matter:
```md
---
title: 'My Note'
date-published: 2022-03-27
---

The markdown content of my note.
```