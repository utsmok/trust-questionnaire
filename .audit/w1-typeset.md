# W1 — Typeset Audit

**Scope:** All CSS files (`tokens.css`, `base.css`, `layout.css`, `components.css`, `accent-scoping.css`, `interaction-states.css`, `animations.css`, `print.css`), `trust-framework.html`, and JS inline styles.

---

## What's Already Good (Do NOT Change)

- **Font family tokens are well-structured.** Three distinct families (`--ff-body`, `--ff-heading`, `--ff-mono`) with semantic names. Inter for body, Arial Narrow for headings, JetBrains Mono for data/codes. This matches the design context and the brand personality of "Efficient, Explicit, Engineered."
- **Type scale uses `rem` throughout.** All sizes in `tokens.css` use `rem` — respects user zoom settings. No `px` font-size values found anywhere in the CSS.
- **`font-kerning: normal` on body.** Good baseline in `base.css:16`.
- **`font-variant-numeric: tabular-nums` applied consistently** to all numerical/data elements (strip cells, score tables, completion badges, page index statuses, rating scores). Exactly right for tabular data alignment.
- **Letter-spacing tokens are intentional and purposeful.** The graduated scale (`--ls-body: 0`, `--ls-label: 0.02em`, `--ls-uppercase: 0.04em`, `--ls-kicker: 0.08em`, `--ls-panel-title: 0.12em`) maps cleanly to typographic roles from body text through display headings.
- **Measure constraints are present.** `max-width: 72ch` on `.doc-section p` and `.form-section p`, `max-width: 44ch` on `.panel-caption`. Both are appropriate for their contexts.
- **Uppercase heading treatment with Arial Narrow** is coherent and matches the "condensed, uppercase, tight tracking" specification from `.impeccable.md`.
- **Print stylesheet correctly overrides body text** to `11pt` with `line-height: 1.5` and forces black-on-white. Uses `print-color-adjust: exact` where needed.
- **Font loading uses `preconnect`** for Google Fonts. Inter loads 400/700/800; JetBrains Mono loads 400/700. No unnecessary weights.
- **Heading hierarchy is clean.** h1 = panel title (`--text-display`), h2 = section headings (`--text-heading`), h3 = sub-sections and criterion cards (`--text-sub`). No h4-h6 used, which is appropriate for this flat, dense structure.

---

## Recommendations

### R1 — HIGH: Inter weight 800 is used extensively but NOT loaded

**Description:** The Google Fonts URL loads Inter at weights `400;700;800`, but the font link uses `family=Inter:wght@400;700;800` — this is actually correct. However, Arial Narrow is used at `font-weight: 800` in ~12 selectors (`.panel-title`, `.nav-button`, `.section-kicker`, `.score-table th`, `.workspace-title`, `.subhead`, `.reference-drawer-summary`, `.surface-kicker`, `.header-progress-title`, `.context-route-title`, `.evidence-lightbox-title`, `.evidence-item-name`). Arial Narrow only ships at weights 400 (Regular) and 700 (Bold) in most system font stacks. Weight 800 on Arial Narrow will be indistinguishable from 700, making it a silent no-op.

**Specifics:**

- `trust-framework.html:9` — Font URL is fine for Inter.
- All selectors using `font-weight: 800` with `font-family: var(--ff-heading)` (Arial Narrow): change to `font-weight: 700` to reflect actual rendering, OR add a web font for Arial Narrow if the extra weight distinction is desired.
- Affected selectors in `components.css`: `.nav-button` (L65), `.section-kicker` (L124), `.doc-section h2, .form-section h2` (L148), `.score-table th` (L233), `.score-table td strong` (L238), `.workspace-title` (L1001), `.reference-drawer-summary` (L1401), `.evidence-lightbox-title` (L888), `.evidence-item-name` (L830).
- Affected in `layout.css`: `.panel-title` (L135), `.surface-kicker` (L386).
- Affected in `interaction-states.css`: `.header-progress-title` (L1170).

**Dependencies:** None. This is a standalone correction.

---

### R2 — HIGH: `--ls-heading: -0.01em` is defined but never used

**Description:** The token `--ls-heading` (`tokens.css:206`) is declared at `-0.01em` and intended for headings, but no selector in any CSS file references `var(--ls-heading)`. Instead, most headings either inherit `--ls-body` (0) or use inline values like `letter-spacing: 0.02em` (field labels) or `letter-spacing: 0.04em`/`0.06em`/`0.08em`/`0.1em`/`0.12em` (uppercase elements). The heading styles (`.doc-section h2`, `.form-section h2`) set no `letter-spacing` at all, so they inherit `0` from body. Meanwhile `.context-route-title` at `components.css:1120` has no letter-spacing despite being an uppercase heading.

**Specifics:**

- Either remove `--ls-heading` from `tokens.css:206` (dead token), or start using it consistently on heading selectors.
- `.doc-section h2, .form-section h2` (`components.css:139-149`) — currently has no `letter-spacing`. Add `letter-spacing: var(--ls-heading)` if tight tracking for headings is desired, or confirm that `0` is intentional for these large uppercase headings.
- `.context-route-title` (`components.css:1113-1120`) — uppercase heading with no letter-spacing. Should it use `--ls-uppercase` (0.04em)?

**Dependencies:** Relates to R5 (heading consistency).

---

### R3 — MEDIUM: `--ls-label: 0.02em` is only used in JS, not in CSS

**Description:** The token `--ls-label` is defined at `0.02em` in `tokens.css:208` but only referenced in `static/js/utils/confirm-dialog.js:42`. The CSS `.field-label` at `components.css:301` uses the inline value `letter-spacing: 0.02em` instead of `var(--ls-label)`. This defeats the purpose of having a token.

**Specifics:**

- `components.css:301` — Change `letter-spacing: 0.02em` to `letter-spacing: var(--ls-label)`.
- Audit for any other `0.02em` values that should reference the token.

**Dependencies:** None.

---

### R4 — MEDIUM: Inconsistent letter-spacing on uppercase elements

**Description:** There are at least 5 different letter-spacing values used across uppercase elements without clear mapping to the token system:

| Value    | Selectors                                                                                                                                       |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `0.04em` | `.nav-button`, `.pager-button`, `.evidence-button`, `.condition-tag`, `.display-tag`, `.criterion-card::after`, `.completion-badge` (via reset) |
| `0.06em` | `.trust-label p`, `.reference-drawer-summary`                                                                                                   |
| `0.08em` | `.score-table th`, `.workspace-title`, `.header-progress-title`                                                                                 |
| `0.1em`  | `.section-kicker`, `.surface-kicker`                                                                                                            |
| `0.12em` | `.panel-title`                                                                                                                                  |

The tokens define `--ls-uppercase: 0.04em`, `--ls-kicker: 0.08em`, `--ls-panel-title: 0.12em`, but these tokens are only used for `.panel-title` and `.surface-kicker`. Everything else uses raw values.

**Specifics:**

- `.nav-button` (L68), `.pager-button` (L1357), `.evidence-button` (L724) — Change `letter-spacing: 0.04em` to `letter-spacing: var(--ls-uppercase)`.
- `.score-table th` (L232), `.workspace-title` (L1004), `.header-progress-title` (L1173) — Change `letter-spacing: 0.08em` to `letter-spacing: var(--ls-kicker)`.
- `.section-kicker` (L126), `.surface-kicker` (L388) — Already use `0.1em` inline, not `var(--ls-kicker)`. Either add a `--ls-section-kicker: 0.1em` token or unify with `--ls-kicker`.
- `.trust-label p` (L73), `.reference-drawer-summary` (L1403) — Change `letter-spacing: 0.06em` to a new token `--ls-nav-label: 0.06em` or consolidate with `--ls-uppercase`.

**Dependencies:** May require adding 1 new token (`--ls-nav-label`).

---

### R5 — MEDIUM: `h3` headings lack `font-family` declaration

**Description:** `.doc-section h3, .form-section h3` (`components.css:151-158`) do not set `font-family`, so they inherit `var(--ff-body)` (Inter) from the body. Meanwhile `.criterion-card h3` (`components.css:546-551`) also inherits Inter. However, `.mini-card h3` (`components.css:194-198`) and `.context-route-title` (`components.css:1113-1120`) explicitly set `font-family: var(--ff-heading)`. This means h3 elements are split between two typefaces with no clear rule for which gets which.

**Specifics:**

- Decide whether h3 should be body (Inter) or heading (Arial Narrow).
- If h3 is a heading level, it should probably use `var(--ff-heading)` for visual consistency with h1/h2. Add `font-family: var(--ff-heading)` to `.doc-section h3, .form-section h3` and `.criterion-card h3`.
- Alternatively, if h3 is intentionally a "sub-heading" that should read as body-weight, document this as a deliberate choice.

**Dependencies:** None.

---

### R6 — MEDIUM: `.brand-sep` uses `font-weight: 300` on Arial Narrow

**Description:** `layout.css:63` sets `font-weight: 300` on `.brand-sep`. Arial Narrow does not have a 300 weight variant on any major OS. It will fall back to 400 (Regular), making this a silent no-op like R1.

**Specifics:**

- `layout.css:63` — Change `font-weight: 300` to `font-weight: 400` to match actual rendering.

**Dependencies:** None.

---

### R7 — MEDIUM: `.small` class is misleading — it sets `font-size` to body, not small

**Description:** `base.css:98-100` defines `.small { font-size: var(--text-body); }`. The token `--text-body` is `1rem`. This class name implies a reduced size but applies the default body size. It appears to be a no-op override or a leftover from refactoring.

**Specifics:**

- If `.small` should actually be small, change to `font-size: var(--text-sm)` (0.75rem).
- If `.small` is intentionally the same as body (perhaps it used to set something else), rename it to avoid confusion (e.g., `.text-base`) or remove it entirely if no longer used.
- Search JS for `.small` usage to confirm.

**Dependencies:** None.

---

### R8 — MEDIUM: No `text-rendering` or `font-smooth` optimization

**Description:** For a text-heavy questionnaire where readability is paramount, `text-rendering: optimizeLegibility` on body would enable OpenType ligatures and kerning. Additionally, `-webkit-font-smoothing: antialiased` can improve rendering of thin strokes on Inter at small sizes on macOS/Chrome.

**Specifics:**

- Add to `body` in `base.css`:
  ```css
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  ```
- This is safe for this application since there are no long runs of body text where subpixel rendering would matter more (the questionnaire is mostly labels, fields, and short descriptions).

**Dependencies:** None.

---

### R9 — LOW: `line-height: 1.5` hardcoded in print stylesheet

**Description:** `print.css:129` sets `line-height: 1.5` directly instead of using the token `--lh-body` (which is `1.55`). The screen value is `1.55`; print is `1.5`. This 0.05 difference is negligible and may be intentional (slightly tighter for print), but it breaks the token pattern.

**Specifics:**

- Either change to `line-height: var(--lh-body)` for consistency, or if tighter print leading is deliberate, add a comment explaining the deviation.

**Dependencies:** None.

---

### R10 — LOW: `font-size: 12pt` hardcoded in print stylesheet

**Description:** `print.css:111` uses `font-size: 12pt` in `.section-kicker::before` content, while the body uses `11pt`. The `12pt` is appropriate for print kicker labels but bypasses the type scale tokens.

**Specifics:**

- This is acceptable as a print-specific override. No change needed, but document why `12pt` was chosen (slightly larger for section kickers to stand out in print).

**Dependencies:** None.

---

### R11 — LOW: `--text-xs` (0.625rem = 10px) may be below minimum readable size

**Description:** `--text-xs` at `0.625rem` (10px at default) is used extensively for chip labels, completion badges, meta tags, and code references. While WCAG does not set a minimum font size (it's about contrast), 10px is small for extended reading. In this app it's used only for short labels/codes, which is appropriate. However, it's worth noting.

**Specifics:**

- No change recommended — usage is limited to short labels, codes, and metadata where small size is intentional for information density.
- Consider adding `line-height: 1.4` as a minimum for `--text-xs` contexts if any are multi-line.

**Dependencies:** None.

---

### R12 — LOW: No `h4`–`h6` styles defined

**Description:** The HTML uses only h1, h2, and h3. No h4-h6 elements exist in the markup. The CSS defines no styles for them either, so they would inherit body styles. This is fine for the current structure but worth documenting as a convention.

**Specifics:**

- No change needed. If h4+ are ever introduced, they should follow the type scale (use `--text-body` or `--text-sub` with appropriate weight).

**Dependencies:** None.

---

## Summary Table

| ID  | Priority | Area           | Action                                              |
| --- | -------- | -------------- | --------------------------------------------------- |
| R1  | HIGH     | Font weights   | Normalize `font-weight: 800` on Arial Narrow to 700 |
| R2  | HIGH     | Tokens         | Use or remove `--ls-heading`                        |
| R3  | MEDIUM   | Tokens         | Use `var(--ls-label)` in `.field-label` CSS         |
| R4  | MEDIUM   | Letter-spacing | Replace raw values with tokens across ~10 selectors |
| R5  | MEDIUM   | Font family    | Add `font-family: var(--ff-heading)` to h3 rules    |
| R6  | MEDIUM   | Font weights   | Change `.brand-sep` weight 300 → 400                |
| R7  | MEDIUM   | Class naming   | Fix or remove misleading `.small` class             |
| R8  | MEDIUM   | Rendering      | Add `text-rendering: optimizeLegibility` to body    |
| R9  | LOW      | Print          | Tokenize or document print `line-height` deviation  |
| R10 | LOW      | Print          | Document `12pt` print kicker size rationale         |
| R11 | LOW      | Minimum size   | Acknowledge 10px usage is acceptable for labels     |
| R12 | LOW      | Hierarchy      | Document h1-h3-only convention                      |
