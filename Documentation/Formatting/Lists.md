You can make a list by starting a line with one of the several list sigils followed by a space. Lists can be started at any indent level.

1. Ordered lists can start with a number followed by a period.
	a. They can also start with a capital or lowercase single letter followed by a period.
		- This [[Markdown Syntax#Deviations from the Standard|deviates from standard markdown]], but gives more options.
	b. Ordered lists will automatically try to keep their numbers & letters in the correct order with consistent sigils, but they remain as text.
2.  Unordered lists are started with one of the following:
	* Asterisks `*` are rendered as a disk.
	- Dashes `-` as a dash.
	+ Plusses `+` as a plus.


List items starting with a `*` are differentiated from the others. `*` list items get extra margin around them.
* Here is an example of a `*` list item with extra space. Note how there is more margin above and below, while the line spacing of the list item itself remains the same.
* This makes `*` list items easier to differentiate from others in a long list, letting them act as more "stand-alone" units.
* The `-` and `+` list items are designed to _not_ create more margin when underneath a `*` list item:
	- Here, we have some sub-items.
	- They are directly underneath their parent `*` list item. The spacing implies they are a single unit.
* These different list items provide a slight semantic difference on what you're trying to express.