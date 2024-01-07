Creation Rules let you set up quick ways to create notes with a specific name format in specific folders. Creation Rules are shown in the "New Note" dropdown in the upper-left of the window, and within the [[Command Palette]].

# Managing Creation Rules
The Creation Rules manager for Tangent is found in the [[System Menu]].

This section shows a list of all Creation Rules within the current [[The Workspace|workspace]]. You can click on any of the rules in the list to enter the editing interface. You can also reorder the rules by dragging and dropping.

Creation rules can have any title you wish. If the first character of the name is an emoji, that emoji will become the icon for the rule.

## Name Template
The Name Template setting lets you inject automatic values into a note name when it is created. This is used in the default "Daily Note" creation rule to create notes with a simple Year-Month-Day timestamp. The "Name Template Tokens" dropdown will show all of the tokens available to you.

If your rule's name template doesn't use the `%name%` token, it is deterministic and doesn't require any additional input to create a new note. For example, the name template `%YYYY% Yearly Theme` is deterministic and will create notes like "2023 Yearly Theme". On the other hand `%YYYY% Yearly Theme – %name%` will ask you to fill in the `%name%` template on creation and will create notes like "2022 Yearly Theme – The Year of Tangent".

## Creation Mode
The Creation Mode determines what happens when there is already a note with the given name in the given folder when the rule is invoked. 
* The __Create__ option will always create a new note, appending numbers to the end of the note's title to create a unique name if necessary.
* The __Create or Open__ option will instead open an existing note. The default "Daily Note" rule uses this option so that you only ever have a single note for a day.

## Other Settings
__Target Folder__ lets you select the folder the new note will be created in. If the folder does not exist when a note is created through the rule, the folder will be created.

__Show In Menu__ controls whether or not the creation rule is displayed in the "New Note" button's drop-down menu. Creation rules are _always_ shown in the [[Command Palette]].

The __Description__ field lets you describe what the rule is for. This text will show up as a tooltip in the New Note button menu or in the Command Palette.