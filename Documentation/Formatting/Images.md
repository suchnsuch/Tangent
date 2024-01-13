You can embed images into your notes with both embedded wiki link references and with standard markdown image embeds. Both use the leading `!` character to denote that the following content is intended to be embedded.

A local wiki embed lets you easily embed local files in your workspace. It looks like `![[Lense Selection.png]]` and renders like: ![[Lense Selection.png]]

A markdown embed can embed images from the internet. It looks like `![](https://pixnio.com/free-images/2021/10/18/2021-10-18-06-25-57-550x367.jpg)` and will display as:
![](https://pixnio.com/free-images/2021/10/18/2021-10-18-06-25-57-550x367.jpg)

You can resize images in both the wiki link and markdown syntax.

You can specify the width of an image. Both of the following set the width of their embedded image to 150 pixels:
* `![[image.jpeg|150]]
* `![150](url.com/image.jpg)`

You can also specify the width and height of the image:
* `![[image.jpeg|300x200]]
* `![300x200](url.com/image.jpg)
