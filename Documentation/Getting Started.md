Tangent is a note writing application based on [[Markdown Syntax]]. It reads and edits files within a local [[The Workspace|workspace]], and creates an index of all [[Wiki Links]] between notes.

You can follow links by Control/Command clicking on them.

Tangent is a cross-platform application. Mac and Windows have different shortcut conventions, and this documentation uses `Cmd/Ctrl` as a shorthand way of directing you to use the Command key on a Mac and the Control key on a machine running Windows.

# Core Concepts
Tangent operates on a [[The Workspace|Workspace]], a local folder of files on your computer. You can see the notes and folders within that folder in [[The Sidebar]].

Double bracket [[Wiki Links]] are the heart of Tangent. They let you easily connect different thoughts together. Notes are aware that other notes link to them; you can see all incoming links in a note's [[Backlinks]].

The default view of your notes is the [[Thread View]]. As you follow links, the linked notes stack up to the right in a series of sliding panels. If you want to focus on just one note without loosing the context of the Thread, you can use one of the [[Focus Modes]] to zero in on a particular note. If you need a larger view of your thoughts, Tangent builds a [[Map View]] as you add and follow links in your workspace.

The [[Command Palette]] lets you search for notes (`Cmd/Ctrl+O`) and actions you can take on notes without (`Cmd/Ctrl+P`) needing to take your hands off of your keyboard.

# Theory
Tangent is being developed to support [Wikilogging](https://everything-abridged.com/wikilogging), a relatively free-form note writing system where [Daily Log ](https://everything-abridged.com/daily_log)notes and [transient Inbox](https://everything-abridged.com/transient_notes) notes serve as [development and jumping-off points](https://everything-abridged.com/temporal_notes_anchor_evergreen_notes) for [highly-interconnected](https://everything-abridged.com/infinitely-connected_infinite-depth_tangents) [evergreen notes](https://everything-abridged.com/evergreen_memetic_notes). Here is how [I](https://everything-abridged.com/me) use Tangent in my note writing.

Tangent implements Daily Logs through [[Creation Rules]]. When writing notes, I will start by using the [[Command Palette]] to invoke the "Daily Note" creation rule, opening the note for the day. From there, I will write out my thoughts with as little filtering as possible. Sometimes, from these thoughts, concrete concepts will be brought up (or conceived), and I will create a [[Wiki Links|wiki link]] to that concept by name, command-click on it to open it in the [[Thread View]], and start writing or updating the connected note.

This process can nest; thinking through one concept often brings up others. I will let my self dive down this rabbit hole, chaining notes together through links, until I feel like I have explored an avenue to my satisfaction. Then, I will move back up the thread to pick up another train of thought and continue from there, creating a new thought tangent.

These different threads are a lot to keep track of. When I feel like I need to reset my thought process, I will open the [[Map View]] to get a bird's eye view of my thought process. From there, I can quickly jump directly to the note (or thread of notes) I want to consider.

I treat the [[Map View]] as a scratch pad; as a fancy "recent items" display. After a time, old threads can clutter up the space and make working through what I am thinking at that exact moment more difficult. In those moments, I will remove notes from the map so that only the things I am interested in remains.

A core assumption of this practice is that a rigid organizational structure can be harmful to expressing my thoughts. Instead of architecting complicated indexes or hierarchy, I rely on the graph created by [[Wiki Links]] to create an implicit organizational structure.

All this said, just because _I_ use Tangent this way, doesn't mean you need to. Tangent tries to be as non-prescriptive as is reasonable.

If you find Tangent is helpful, I would love to know about it! You can find me through the [[Feedback|links on this page]].