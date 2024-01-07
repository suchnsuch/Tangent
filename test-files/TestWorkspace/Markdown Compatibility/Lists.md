# Unordered Lists
- Insert lists
+ with different
* Prefixes
* This is a test and this test is wrapping all over the place. I just need to type long enough for the damned thing to wrap. Perfection.

	And here is an indented paragraph that wraps around. Here it goes, I just need to type enough!
	
## Semantic "Big" and "Little" List Items
We want bit list items to stand distinct.
* List items with `*` should separate themselves from the rest of the pack.
* There should be obvious differences
	- But indented "little" list items should ideally be close to their parent
	- That way things flow
* And then back to big.
- And this is fine. I don't think this is super common.
And we want that to work really well.

* Here's a funky case
	
# Checkboxes
- [x] Checkboxes!
- [ ] Another checkbox
- [ ] Checkboxes should sort to the top of a line, rather than anywhere else. This is some extra text that ensures this item gets really large and extends well past a single line.
* [ ] Okay!

# Ordered Lists
1. We also want ordered lists to work.
2. These should have proper ordering.
	1. Inner list items should start from their own number context and not interrupt outer item.
	2. Also, we should be able to
		
		Support having paragraphs embedded into lists. Those paragraphs should not interrupt the numbering of the outer list, and the paragraph content should wrap at the appropriate indent level.
		
	3. This is all part of the markdown spec. Supporting it is nice.
3. Here's another sublist context
	1. Thing one
	2. Thing two
4. And this list ends
5. Another two items

A. I also want to break markdown and support alpha glyphs for lists.
B. Lookit that B
C. Much awesome
	a. Lower case is supported too
	b. Very useful
	c. I think it adds differentiation
		1. This one has _third_ level items
		2. Heck yeah