You can make a list by starting a line with one of the several list sigils followed by a space. Lists can be started at any indent level.

1. Ordered lists can start with a number followed by a period (`.`) or closing parenthesis (`)`).
	a. They can also start with a capital or lowercase single letter followed by a period.
		- This [[Markdown Syntax#Deviations from the Standard|deviates from standard markdown]], but gives more options.
	b. Ordered lists will automatically try to keep their numbers & letters in the correct order with consistent sigils, but they remain as text.
2.  Unordered lists are started with one of the following:
	* Asterisks `*` are rendered as a disk.
	- Dashes `-` as a dash.
	+ Plusses `+` as a plus.


# Large Lists
Unordered list items starting with a `*` and ordered list items ending in a `)` are  differentiated from the others.  These "large list" items get extra margin around them.
* Here is an example of a `*` list item with extra space. Note how there is more margin above and below, while the line spacing of the list item itself remains the same.
* This makes `*` list items easier to differentiate from others in a long list, letting them act as more "stand-alone" units.
* The `-` and `+` list items are designed to _not_ create more margin when underneath a `*` list item:
	- Here, we have some sub-items.
	- They are directly underneath their parent `*` list item. The spacing implies they are a single unit.
* These different list items provide a slight semantic difference on what you're trying to express.


# Automatic Glyphs
By default, list glyphs will automatically change when you indent them. Children of `*` list items become `-` items. Ordered lists progress from `A. -> 1. -> a. -> -`. This can be disabled in the [[Notes#Editing Options]].


# Extended Bullets
Tangent supports multiple UTF characters as native unordered bullets. You may use these characters instead of the standard `+`, `-`, `*` characters and they will be displayed natively. Use these as expressive alternatives in your lists!

The following characters are treated as "large" lists:
• `U+2022 (Bullet)
⁌ `U+204c (Black Leftwards Bullet)`
⁍ `U+204d (Black Rightwards Bullet)`
◘ `U+25d8 (Inverse Bullet)`
❥ `U+2765 (Rotated Heavy Black Heart Bullet)`
⦾ `U+29be (Circled White Bullet)`
⦿ `U+29bf (Circled Bullet)
◉ `U+25c9 (Fisheye (Japanese Bullet))`

The following characters are treated as "small" lists:
∙ `U+2219 (Bullet Operator)`
⋅ `U+22C5 (Dot Operator)`
‣ `U+2023 (Triangular Bullet)`
⁃ `U+2043 (Hyphen Bullet)`
◦ `U+25e6 (White Bullet)`
☙ `U+2619 (Reversed Rotated Floral Heart Bullet)`
❧ `U+2767 (Rotated Floral Heart Bullet)`
