Queries form the backbone of "serious search" within Tangent. They are designed around finding files by way of their connections and relationships to others. In the future, queries will also allow for searching for tags and values, and selecting elements of a note like headers or To Do items.

You can pull up a query pane by pressing `Cmd/Ctrl+Shift+F`.
![[Query Example.png|300px]]

# Syntax Overview
Queries are powered by the [[Query Syntax]].

The simplest query looks like this:

```tangentquery
Notes with "something I am searching for"
```

This query will find notes whose content contains the exact text "something I am searching for". The results are case-sensitive.

A more useful way of searching for text is to use single-quotes, e.g.

```tangentquery
Notes with 'something else to find'
```

This query converts the search string into tokens and finds notes whose content contains those tokens in that order with anything in between. The results are _not_ case sensitive.

You can do a lot with queries. Explore the examples in the [[Query Syntax]] page to see what is possible.

# Visualizing Query Results
A query simply defines a set of files and folders. That set can then be visualized by any of the compatible [[Lenses]].

Defining the how a the results of a is visualized is firmly out of scope of the query syntax itself. Those particularities are better handled by custom data structures and custom controls.

# Saving Queries
You can save queries simply by renaming the default "Query 1" name to any name of your choosing. Saved queries live in your workspaces with the `.tangentquery` extension. They can be in any folder in your workspace.

Saved queries can be referenced by other queries, allowing you to create complex chains of logic. See [[Query Syntax#Subqueries]] for more information.