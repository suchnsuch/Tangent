Sometimes you don't want Tangent to be aware of all of the files or folders in your workspace. This can especially be the case when using Tangent within a development repository alongside source code and build artifacts.

Tangent will check for and use a `.tangentignore` file at the root of its workspace. The files is parsed by the [ignore](https://www.npmjs.com/package/ignore) NPM package and follows the same rules as `.gitignore`.

For example:
```gitignore
# This folder and all of its children will be ignored
my-folder/
```
