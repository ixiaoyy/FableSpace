# User-Facing UI Copy Contract

> This is a mandatory product contract, not a tone preference.

## Core Rule

User-facing product screens must not contain explanatory copy.

Render the world, character, current state, and available actions directly. Do
not explain the page, the product flow, the design intent, the data model, or
how the user should interpret what is on screen.

## Forbidden Copy

Do not render:

- paragraphs that explain what a page or section is for;
- instructions that restate what visible controls already do;
- explanations of why a character, Space, result, or status is shown;
- product, AI, privacy, access, data, rollout, or implementation boundaries;
- labels that teach the content model instead of presenting content;
- empty/error/loading prose that describes fallback or internal behavior.

Examples that must not appear in the UI:

```tsx
// Wrong: explains the navigation model.
<p>先认识一个角色，再走进 TA 所在的独立世界。</p>

// Wrong: explains content provenance and availability.
<span>真实历史背景中的原创角色</span>
<span>所在空间可进入</span>

// Wrong: exposes fallback behavior.
<p>页面不会用其他公开角色填补这个入口。</p>
```

## Allowed Copy

Keep only content or interface state that the user directly needs:

- character, Space, place, chapter, and item names;
- in-world dialogue, scene prose, and authored story content;
- short action labels such as `进入`, `回应`, `重试`, and `回访`;
- concise field labels, values, dates, counts, and necessary status words;
- validation or failure messages that tell the user what happened or what
  action is available, without explaining implementation.
- a single, standardized provenance notice inside a user-opened historical
  reference surface, plus per-entry content-integrity status labels.

```tsx
// Correct: content and action carry the meaning.
<h1>今天想见谁？</h1>
<h2>安妮</h2>
<span>伦敦宽街 · 1854</span>
<Link to={target}>回应</Link>
```

## Narrow Exception: Historical Reference Integrity

A user-opened historical reference surface may display:

```tsx
<p>含 AI 总结；剧情设定可能包含虚构。</p>
<Badge>史实</Badge>
<Badge>剧情设定</Badge>
<Badge>待核验</Badge>
```

This exception exists so players can distinguish reviewed history from
fictional story material. It is not permission to add product explanations,
AI disclaimers, or provenance paragraphs elsewhere.

Contract:

- Show the notice once inside the historical reference surface only.
- Do not show it on the homepage, character cards, or the mobile chat first screen.
- Every historical reference entry must be classified as `史实`, `剧情设定`,
  or `待核验`.
- `史实` requires a reviewed source. AI-only or source-incomplete text must
  remain `待核验`.
- Split mixed fact and fiction into separate entries instead of hiding both
  behind one generic warning.
- Runtime AI may summarize published reference entries but must preserve their
  classification and sources; it may not mint a new `史实` entry.

## Information Architecture Contract

- A temporary content count must not redefine the page structure.
- The homepage is an expandable character-discovery surface. If the API
  currently returns one character, render one ordinary list/card item in the
  existing collection. Do not turn it into a one-off campaign, tutorial, or
  full-page encounter layout.
- Adding another character must only add another collection item; it must not
  require another homepage redesign.
- Empty space in a partially populated collection is preferable to invented
  placeholders or explanatory filler.

## Review Checklist

- [ ] Remove any sentence whose only job is to explain purpose, flow, rules, or intent.
- [ ] Prefer name, state, metadata, and action over a descriptive paragraph.
- [ ] Keep story prose inside the story or character content, not in product explanations.
- [ ] Verify the mobile first viewport contains no explanatory paragraph.
- [ ] Verify one returned character uses the same collection component and card size as multiple characters.
- [ ] Search changed UI for explanatory patterns such as `先认识`, `为什么`, `这里会`, `页面不会`, `用于`, and `说明`.
- [ ] If a historical reference surface is present, verify the single allowed notice and every entry's `史实` / `剧情设定` / `待核验` status.
- [ ] Verify the historical-reference exception has not leaked into homepage cards or the mobile chat first screen.
