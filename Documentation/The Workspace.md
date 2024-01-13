Tangent uses the context of a folder on your local computer to understand what files your [[Wiki Links]] should resolve to.

Your workspace can have anything inside of it. Currently, Tangent will recognize and present:
1. Markdown files (`.md`, `.mdx`)
2. Folders
3. Images (`.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.svg`)

You will see these files in [[The Sidebar]].

At the moment, Tangent does not offer any versioning or syncing features. I encourage you to use your favorite cloud syncing service (iCloud, OneDrive, Dropbox, etc), or your favorite version control system (e.g. Git, Perforce, SVN).

# Tangent-Specific Files
In addition to creating and editing markdown files, Tangent creates a handful of files in your workspace to better aid in presenting your notes. These files are hidden by default, and still plain text.

A `.tangent` folder will be created at the root level of your workspace. This contains all files that affect settings or state across the workspace.

A `.tangentfolder` file will be created inside of folders within your workspace. This is where Tangent stores settings regarding how folders should be presented and interact with the system.