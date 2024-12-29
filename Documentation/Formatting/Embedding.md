Various kinds of content can be embedded into a note. [[Wiki Links]] and [[Markdown Links]] can both be embedded by prefixing their link syntax with a `!`. Raw links on their own line are automatically embedded.

A local wiki embed lets you easily embed local files in your workspace. It looks like `![[Lense Selection.png]]` and renders like: ![[Lense Selection.png]]

A markdown embed can embed content from the internet. It looks like `![](https://pixnio.com/free-images/2021/10/18/2021-10-18-06-25-57-550x367.jpg)` and will display as:
![](https://pixnio.com/free-images/2021/10/18/2021-10-18-06-25-57-550x367.jpg)

# Supported Content
Tangent can display web link previews:
https://en.wikipedia.org/wiki/Capuchin_monkey

Images:
https://pixnio.com/free-images/2021/10/18/2021-10-18-06-25-57-550x367.jpg

Audio:
https://www.computerhope.com/jargon/m/example.mp3

Video:
https://download.samplelib.com/mp4/sample-5s.mp4

And YouTube links:
https://www.youtube.com/watch?v=qAuwW7Wzrng

# Image Sizing
You can resize images in both the wiki link and markdown syntax.

You can specify the width of an image. Both of the following set the width of their embedded image to 150 pixels:
* `![[image.jpeg|150]]
* `![150](url.com/image.jpg)`

You can also specify the width and height of the image:
* `![[image.jpeg|300x200]]`
* `![300x200](url.com/image.jpg)`
