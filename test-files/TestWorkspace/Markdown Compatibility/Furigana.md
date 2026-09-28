Using [DenDenMarkdown](https://github.com/denshoch/DenDenMarkdown)'s `{base|reading}` syntax renders furigana readings as ruby above the base: {漢字|かんじ}, {仮名|かな}, {猫|ねこ}. The syntax doesn't check script: {Tangent|proper noun}, {M☉|Solar Mass}

**Whitespace-insensitive**:
	`{term|reading} · { term | reading } · {  term  |  reading  }`
	{term|reading} · { term | reading } · {  term  |  reading  }

**Malformed / inert spans** — these fall through to plain text, not a half-parsed annotation:
• _Unmatched brace_: {this span never gets its closing brace
• _Escaped braces_: `\{not an | annotation\}` → \{not an | annotation\}.
• _Empty base_: {|no base}
• _Empty annotation_: {no annotation|}
• _Nested braces_:  {outer {inner|nested} outer}
• _Newlines_:
		 {spans
		across a line|break}

**Unicode stress** (surrogate pairs, variation selectors, combining marks):
• _Supplementary-plane emoji as base_: {🀄|red dragon tile}
• _Variation selectors_ shouldn't break parsing: {☺️|emoji-presentation smiley} · {☺︎|text-presentation smiley}
• _Combining marks_ under long readings are a known Chromium limitation:
	`{e̊|e with combining ring above}` →	{e̊|e with combining ring above}
	`{हिन्दी|hindī language}` →	{हिन्दी|hindī language}

**Adjacency and context interaction**:
• _Outer formatting_: _{斜|しゃ}{体|たい}_と**{太|ふと}{字|じ}**
	‣ Rejects inner formatting for simplicity: {**強調**|きょうちょう}{_文字_|もじ}
• _Immediately beside a wikilink_: [[Furigana]]{self-reference|note}.
• _Identical annotations_ back-to-back with no separator:
	‣ {猫|ねこ}{猫|ねこ} (cat~)
	‣ {民|みん}{主|しゅ}{主|しゅ}{義|ぎ} (democracy)
• _Must **not** activate inside inline code_: `{not|furigana}`.
• _Must **not** collide with template tokens_: {{placeholder}} next to {漢字|かんじ}.
