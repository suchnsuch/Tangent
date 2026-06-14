The database options for Tangent are found in the [[System Menu]].

# Startup Behavior
This lets you choose what workspaces are opened when Tangent starts.
* __Restore__ will open the workspaces that were open the last time Tangent was running.
* __Select__ will open the workspace selection screen, allowing you to choose the workspace to open each time Tangent starts.

# Dirty File Indicators
Tangent automatically saves your notes five seconds after you finish typing or as soon as your note loses focus. Because of this, it has no dirty file indicators by default; you should be able to work without worrying about when your file saves.

The "Show Dirty File Indicators" options let you display dirty indicators when a file has not saved yet (and `Cmd/Ctrl+S` will save your file immediately as is standard). The various options allow you to choose how intrusive these indicators will be to your editing experience.

# Links
Setting __Link Autocomplete__ to "Full Path" will insert the full workspace path of the linked note into the wiki link. For example: `[[Folder/Subfolder/Note]]`.

Setting the value to "Unique Path" will use only the name of the note in the wiki link, so long as there is no other note with that name in the workspace.

# Case Sensitivity
Enabling __Case Sensitive Links__ will require that the text of [[Wiki Links]] must match the case of their linked notes precisely in order for the link to complete.

With this checkbox disabled, `[[example note]]`, `[[Example note]]`, and `[[eXaMpLe NoTe]]` would be successfully linked to a note named "Example Note" .