# Creating Icons
__Windows__ needs a `.icns` file. I am using [ImageMagick](https://imagemagick.org/index.php) by [recommendation](https://superuser.com/questions/491180/how-do-i-embed-multiple-sizes-in-an-ico-file).

```bash
convert icon_16.png icon_32.png icon_48.png icon_64.png icon_128.png icon_256.png -colors 256 icon.ico
```

I use "tangent-icon-small" for the 32x32 size, which looks much nicer than the naively scaled down original.

__Mac__ needs a `.ico` file. [Convertio](https://convertio.co) does a good job with this.
