Furigana are small readings placed above text, most often kana above kanji to show how they're pronounced. Tangent supports the `{base|reading}` syntax from [DenDenMarkdown](https://github.com/denshoch/DenDenMarkdown).

It looks like `{漢字|かんじ}` and renders like: {漢字|かんじ}

Spaces around the base and the reading are ignored, so `{ 漢字 | かんじ }` renders the same way.

# Per-Character Readings
A reading can span a whole word, like {東京|とうきょう}, or you can give each character its own reading by writing them back to back: `{東|とう}{京|きょう}` renders like {東|とう}{京|きょう}.

Per-character readings are handy for words that mix kanji and kana, like {食|た}べる.

# Other Scripts
The base and reading can be any text, so the same syntax works for things like pinyin over Chinese characters: {汉|hàn}{字|zì}

# Details
Furigana have to open and close on the same line, and can't be nested inside each other.

The base and reading are plain text, so formatting goes around furigana rather than inside them: `**{太|ふと}{字|じ}**` renders like **{太|ふと}{字|じ}**

To write braces without creating furigana, escape them with a backslash, like `\{this\}`. A backslash also lets you use a literal `|` in the base: `{A\|B|reading}`. See [[Backslash Escapes]].
