Various kinds of content can be embedded into a note. [[Wiki Links]] and [[Markdown Links]] can both be embedded by prefixing their link syntax with a `!`. Raw links on their own line are automatically embedded.

A local wiki embed lets you easily embed local files in your workspace. It looks like `![[Lense Selection.png]]` and renders like: ![[Lense Selection.png]]

A markdown embed can embed content from the internet. It looks like `![](https://pixnio.com/free-images/2021/10/18/2021-10-18-06-25-57-550x367.jpg)` and will display as:
![](https://pixnio.com/free-images/2021/10/18/2021-10-18-06-25-57-550x367.jpg)

# Supported Local Content
Tangent can embed local images, videos and audio.
* Images: `.png`, `.jpeg`, `.gif`, `.bmp`, `.svg`.
* Video: `.mov`, `.mp4`, `.mkv`, `.avi`, `.webm`.
* Audio: `.mp3`, `.m4a`, `.wav`, `.ogg`, `.flac`.

# Supported Remote Content
Tangent can display web link previews:
https://en.wikipedia.org/wiki/Capuchin_monkey

Images:
https://www.tangentnotes.com/shots/thread-short-dark-2x.jpeg

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

# PDF Pages
You can link to specific pages in a PDF by appending `#page=2` to a link. For instance: `[[file.pdf#page=6]]`.

# Audio & Video Time
You can link to a specific time in an audio or video file by appending `#time=hh:mm:ss` to a link. For instance `[[file.mp4#time=1:45]]` or `[[audio.mp3#time=1:34:10]]`.

You can link to sub-second times like `#time=12.45`.

You can copy a link to a video at the current time by right-clicking and selecting the "Copy Link at Current Time" option.