You can make text _italic_ by surrounding text in single `_` or `*` characters. You can make __bold__ text by surrounding text in `__` or `**`. For example:

```md
Here is some _italicized text!_ And **this** is bolded.

You can use __either__ *character* to affect text.
```
Becomes:

> Here is some _italicized text!_ And **this** is bolded.
> 
> You can use __either__ *character* to affect text.

You can use the standard `Cmd/Ctrl+B` and `Cmd/Cmd+I` shortcuts to toggle whether or not the selected text is bold or italic, respectively. If you do not have text selected, Tangent will embolden/italicize the current word or remove the formatting of an already formatted range of text. You can choose which characters Tangent will use when emboldening or italicizing with these shortcuts in the [[Notes#Editing Options]] settings.

# Inter-Text Underscores
By default, Tangent ignores underscores that are surrounded on both sides with text. Thus `em_pha_sis` is displayed as "em_pha_sis". This follows [Github's](https://github.github.com/gfm/#emphasis-and-strong-emphasis) and many other common markdown parsing rules. You can always use asterisks for this: `em*pha*sis` becomes "em*pha*sis".

This behavior can be changed with the **Inter-Text Underscore Emphasis** setting the [[Notes]] configuration panel. With this enabled, underscores and asterisks operate identically.