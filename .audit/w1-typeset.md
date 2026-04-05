# W1 — Typeset Audit

**Date:** 2026-04-05
**Scope:** All CSS files (`tokens.css`, `base.css`, `layout.css`, `components.css`, `accent-scoping.css`, `interaction-states.css`, `animations.css`, `print.css`), `trust-framework.html`, and JS inline styles.
**Previous audit:** Supersedes prior w1-typeset.md. Prior R1–R5 and R7 have been resolved. R6 (text-mega), R8 (Arial Narrow docs), and R9 (drawer title comment) remain outstanding. This is a fresh assessment against current code.

---

## What's Already Good (Do NOT Change)

- **Three-font system with clear functional roles.** `--ff-body` (Inter) for prose, `--ff-heading` (Arial Narrow) for structural labels and headings, `--ff-mono` (JetBrains Mono) for codes, IDs, and data. Each family has exactly one job. No overlap, no ambiguity.
- **Only two weights loaded per font (400, 700).** Google Fonts URL (`trust-framework.html:9`) loads Inter 400/700 and JetBrains Mono 400/700. No unused weights. All instances of `font-weight: 700` in CSS are consistent — no 500/600/800 anywhere.
- **`rem`-based type scale with defined steps.** All sizes reference browser default (16px). Respects user zoom. No `px` font-size in any CSS file.
- **`font-kerning: normal`** on body (`base.css:16`). Correct.
- **Anti-aliasing enabled.** `-webkit-font-smoothing: antialiased` and `-moz-osx-font-smoothing: grayscale` in `base.css:18-19`.
- **`font-variant-numeric: tabular-nums`** applied to strip cells, completion badges, score tables, page-index states, rating-text strong elements — all numeric data aligns correctly.
- **Line-heights are well-chosen.** `--lh-body: 1.55` (excellent for dense body text), `--lh-heading: 1.2` (correct for large text), `--lh-sub: 1.3` (good middle ground for h3/criterion cards).
- **`max-width: 72ch`** on `.doc-section p` and `.form-section p` — body line lengths are controlled.
- **Semantic letter-spacing tokens.** The graduated scale (`--ls-body: 0`, `--ls-label: 0.02em`, `--ls-heading: 0.03em`, `--ls-uppercase: 0.04em`, `--ls-kicker: 0.08em`, `--ls-panel-title: 0.08em`, `--ls-annotation: 0.04em`, `--ls-section-kicker: 0.1em`) maps cleanly to typographic roles. The h2 tracking fix from the prior audit (changed from `-0.01em` to `0.03em`) is now in place and correct.
- **`text-rendering: optimizeLegibility`** on body (`base.css:17`). Fine for an app with limited long-form text.
- **Print stylesheet** correctly handles typography (`font-size: 11pt`, `line-height: 1.5`, mono for section kickers, `print-color-adjust: exact` on colored elements).
- **Google Fonts `display=swap`** prevents invisible text during font load. `preconnect` hints are present.
- **Monospace applied consistently to data.** `.strip-cell`, `.completion-badge`, `.page-index-code`, `.page-index-state`, `.page-index-status`, `.evidence-meta-item`, `.section-kicker`, `.context-route-code`, `.context-block-label`, `.context-source-item`, `.context-anchor-code`, `.pager-status`, `.pager-shortcuts`, `.score-table td strong`, `.rating-text strong`, `.evidence-file-name`, `.evidence-item-name`, `.validation-message`, `.header-progress-body`, `.header-progress-meta` all use `--ff-mono`. This matches the "expose the machine" principle.
- **Heading font applied consistently to headings/labels.** `.panel-title`, `.sidebar-tab`, `.nav-button`, `.score-table th`, `.field-label`, `.workspace-title`, `.evidence-lightbox-title`, `.context-route-title`, `.about-topic-title`, `.header-progress-title`, `.reference-drawer-summary`, `.page-index-group-label` all use `--ff-heading`. Prior R2 fix is confirmed applied.
- **Chips correctly sized.** `.chip` uses `--text-sm` (12px). Prior R3 fix is confirmed applied.
- **Score values and rating scores use monospace.** `.score-table td strong` and `.rating-text strong` both use `--ff-mono`. Prior R4/R5 fixes confirmed applied.
- **Evidence file names use monospace.** `.evidence-file-name` and `.evidence-item-name` both use `--ff-mono`. Prior R7 fix confirmed applied.
- **Heading hierarchy is clean.** h1 = panel title (`--text-display`), h2 = section headings (`--text-heading`), h3 = sub-sections/criterion cards (`--text-sub`). Only three heading levels — appropriate for this flat, dense structure.
- **h3 treatment is intentional and effective.** h3 uses Arial Narrow 700 at `--text-sub` in mixed case, while h2 is uppercase. This creates a readable two-tier heading system. Do NOT add `text-transform: uppercase` to h3.
- **`font: inherit`** used in JS-generated inline styles for input/textarea/select controls (`dom-factories.js`). Controls inherit body typography correctly.

---

## Recommendations

### R1 — HIGH: `.mini-card h3` inherits Inter instead of Arial Narrow in reference panels

| Field        | Value                   |
| ------------ | ----------------------- |
| **ID**       | R1                      |
| **Priority** | HIGH                    |
| **Category** | Consistency / Hierarchy |

**Problem:** `.mini-card h3` (`components.css:235-239`) only sets `margin`, `color`, and `font-size`. It does NOT set `font-family` or `font-weight`. It relies on cascade to inherit these values:

- Inside `.doc-section` or `.form-section` → the `.doc-section h3, .form-section h3` rule (`components.css:147-154`) provides `font-family: var(--ff-heading)` and `font-weight: 700`. **Correct result: Arial Narrow bold.**
- Inside reference panel (NOT a `.doc-section`/`.form-section`) → no h3 rule applies. Browser default `font-weight: bold` (~700) is used, and `font-family` inherits from `body` (Inter). **Wrong result: Inter bold.**

This affects every mini-card heading in the Reference tab panels — the "Criterion rating scale", "Recommendation vocabulary", "Confidence levels", "Critical-fail flags", "Per-principle judgment", "Final recommendation categories", "Decision rules", "Desk review", "Hands-on testing", "Repeated-query test", "Manual source verification", and "Evidence bundle" headings all render in Inter while structurally identical headings in the Guidance tab render in Arial Narrow.

**Fix:** Add `font-family: var(--ff-heading)`, `font-weight: 700`, and `line-height: var(--lh-sub)` to `.mini-card h3`.

**Specifics:**

- File: `components.css` lines 235-239
- Change:

  ```css
  /* Current */
  .mini-card h3 {
    margin: 0 0 8px;
    color: var(--ut-navy);
    font-size: var(--text-sub);
  }

  /* Should be */
  .mini-card h3 {
    margin: 0 0 8px;
    color: var(--ut-navy);
    font-size: var(--text-sub);
    line-height: var(--lh-sub);
    font-family: var(--ff-heading);
    font-weight: 700;
  }
  ```

**Dependencies:** None. Independent change.

---

### R2 — HIGH: `.subhead` class inherits Inter instead of Arial Narrow

| Field        | Value                   |
| ------------ | ----------------------- |
| **ID**       | R2                      |
| **Priority** | HIGH                    |
| **Category** | Consistency / Hierarchy |

**Problem:** `.subhead` (`components.css:984-989`) sets `font-size: var(--text-sub)`, `font-weight: 700`, but does NOT set `font-family`. It inherits `var(--ff-body)` (Inter) from the body cascade. This class occupies the same visual role as `.doc-section h3` / `.form-section h3` (subheading at `--text-sub` size, bold), but renders in Inter while h3 elements render in Arial Narrow. If `.subhead` is used in JS-rendered content alongside h3 elements, the font mismatch is visible.

**Fix:** Add `font-family: var(--ff-heading)` to `.subhead`.

**Specifics:**

- File: `components.css` lines 984-989
- Change:

  ```css
  /* Current */
  .subhead {
    margin: 24px 0 12px;
    color: var(--ut-navy);
    font-size: var(--text-sub);
    font-weight: 700;
  }

  /* Should be */
  .subhead {
    margin: 24px 0 12px;
    color: var(--ut-navy);
    font-size: var(--text-sub);
    font-weight: 700;
    font-family: var(--ff-heading);
  }
  ```

**Dependencies:** None.

---

### R3 — HIGH: Missing intermediate type-scale step for readable secondary text

| Field        | Value                 |
| ------------ | --------------------- |
| **ID**       | R3                    |
| **Priority** | HIGH                  |
| **Category** | Density / Readability |

**Problem:** The type scale jumps 33% from `--text-sm: 0.75rem` (12px) to `--text-body: 1rem` (16px). Several text elements that need to be read — not just glanced at — currently sit at `--text-sm` (12px):

| Selector                      | File:Line            | Content                            | Current Size | Problem                                                    |
| ----------------------------- | -------------------- | ---------------------------------- | ------------ | ---------------------------------------------------------- |
| `.field-help`                 | `components.css:468` | Field instructions and guidance    | 12px         | Readable secondary text at 12px is below comfort threshold |
| `.evidence-block-description` | `components.css:649` | Evidence block purpose description | 12px         | Prose that explains evidence workflow                      |
| `.evidence-selection-summary` | `components.css:649` | Selected evidence summary          | 12px         | Summary text that needs scanning                           |
| `.evidence-status`            | `components.css:649` | Evidence status prose              | 12px         | Status description                                         |
| `.evidence-note`              | `components.css:649` | Reviewer notes                     | 12px         | Prose notes needing readability                            |
| `.evidence-lightbox-note`     | `components.css:649` | Lightbox context notes             | 12px         | Supporting prose                                           |

For a dense data application, 12px is correct for labels, tags, badges, and codes (annotation-level text). But these elements are not annotations — they are instructional and descriptive prose that the reviewer reads. A 14px (0.875rem) intermediate step would maintain density while providing readable secondary text.

The existing scale steps above body already follow a coherent progression: body (16px) → sub (19.2px, ~1.2x) → heading (25px, ~1.3x) → display (36px, ~1.44x). Adding 14px below body creates a tighter sub-scale for secondary text while keeping body at 16px.

**Fix:** Add `--text-md: 0.875rem` token and apply it to readable secondary text elements.

**Specifics:**

1. `tokens.css` line ~292 — Add new token between `--text-sm` and `--text-body`:

   ```css
   --text-sm: 0.75rem;
   --text-md: 0.875rem; /* NEW: secondary readable text */
   --text-body: 1rem;
   ```

2. Update the comment at line 289 from "Type scale -- 6 steps" to "Type scale -- 7 steps" (or whichever count is accurate after this change).

3. Update these selectors in `components.css`:

   | Selector                                 | Current                     | Change To                   |
   | ---------------------------------------- | --------------------------- | --------------------------- |
   | `.field-help` (line 469)                 | `font-size: var(--text-sm)` | `font-size: var(--text-md)` |
   | `.evidence-block-description` (line 649) | `font-size: var(--text-sm)` | `font-size: var(--text-md)` |
   | `.evidence-selection-summary` (line 649) | `font-size: var(--text-sm)` | `font-size: var(--text-md)` |
   | `.evidence-status` (line 649)            | `font-size: var(--text-sm)` | `font-size: var(--text-md)` |
   | `.evidence-note` (line 649)              | `font-size: var(--text-sm)` | `font-size: var(--text-md)` |
   | `.evidence-lightbox-note` (line 649)     | `font-size: var(--text-sm)` | `font-size: var(--text-md)` |

4. Also consider for `.reference-drawer-subtitle` (`components.css:1659`): currently `font-size: var(--text-body)` (16px), which is the same size as body text. Changing to `--text-md` would better differentiate it as a subtitle/secondary description.

**Dependencies:** None. The new token is purely additive. All `--text-sm` usages for labels, buttons, UI chrome, tags, badges, and codes remain at 12px — correct for their annotation/label roles.

---

### R4 — MEDIUM: `.criterion-card h3` missing explicit `font-weight: 700`

| Field        | Value                    |
| ------------ | ------------------------ |
| **ID**       | R4                       |
| **Priority** | MEDIUM                   |
| **Category** | Robustness / Consistency |

**Problem:** `.criterion-card h3` (`components.css:596-604`) sets `font-family: var(--ff-heading)` but does not explicitly set `font-weight: 700`. It relies on the browser default bold for `<h3>` elements. While this works in practice, it's fragile: any CSS reset or inheritance change could strip the weight. Every other heading-level rule that explicitly sets `font-family` also explicitly sets `font-weight` (`.doc-section h2`, `.doc-section h3`, `.panel-title`, `.evidence-lightbox-title`, `.section-kicker`). `.criterion-card h3` is the only one that omits it.

**Fix:** Add `font-weight: 700` to `.criterion-card h3`.

**Specifics:**

- File: `components.css` lines 596-604
- Change:

  ```css
  /* Current */
  .criterion-card h3 {
    margin: 0 0 8px;
    color: var(--ut-navy);
    font-size: var(--text-sub);
    line-height: var(--lh-sub);
    font-family: var(--ff-heading);
    border-bottom: 1px solid var(--ut-border);
    padding-bottom: 6px;
  }

  /* Should be */
  .criterion-card h3 {
    margin: 0 0 8px;
    color: var(--ut-navy);
    font-size: var(--text-sub);
    line-height: var(--lh-sub);
    font-family: var(--ff-heading);
    font-weight: 700;
    border-bottom: 1px solid var(--ut-border);
    padding-bottom: 6px;
  }
  ```

**Dependencies:** None.

---

### R5 — MEDIUM: `--text-mega` token is dead (carried from prior audit R6)

| Field        | Value         |
| ------------ | ------------- |
| **ID**       | R5            |
| **Priority** | MEDIUM        |
| **Category** | Token hygiene |

**Problem:** `--text-mega: 2.75rem` is defined at `tokens.css:297` but is never referenced in any CSS file or JS file. The comment at line 289 says "Type scale -- 6 steps" but 7 values are defined. Dead tokens add maintenance burden and suggest incomplete implementation. Carried from prior audit R6 — not yet resolved.

**Fix:** Remove the token. The panel title (`.panel-title`) uses `--text-display` (2.25rem / 36px), which is appropriate. There is no UI element that needs 44px text in this dense data application.

**Specifics:**

- File: `tokens.css` line 297
- Remove: `--text-mega: 2.75rem;`
- Update comment at line 289 to reflect the final step count (6 or 7, depending on whether R3's new `--text-md` is adopted)

**Dependencies:** Grep JS source to confirm no dynamic references to `--text-mega` before removing.

---

### R6 — MEDIUM: `.field-label` line-height too generous for uppercase condensed text

| Field        | Value                     |
| ------------ | ------------------------- |
| **ID**       | R6                        |
| **Priority** | MEDIUM                    |
| **Category** | Density / Vertical rhythm |

**Problem:** `.field-label` (`components.css:333-345`) is `text-transform: uppercase` with `font-family: var(--ff-heading)` (Arial Narrow) and `letter-spacing: var(--ls-label)` (0.02em), but does not set `line-height`. It inherits `--lh-body: 1.55` from the body cascade. For a single-line uppercase condensed label at 12px, a line-height of 1.55 is overly generous — it adds ~5px of extra vertical space per label. In a form with 132+ fields, this accumulates into significant wasted vertical space.

Compare with other uppercase/heading elements that DO set line-height:

- `.doc-section h2` → `--lh-heading: 1.2`
- `.criterion-card h3` → `--lh-sub: 1.3`
- `.panel-title` → not explicitly set, but it's a single line with `white-space: nowrap`

**Fix:** Add `line-height: var(--lh-heading)` (1.2) to `.field-label`.

**Specifics:**

- File: `components.css` lines 333-345
- Add to the rule: `line-height: var(--lh-heading);`

**Dependencies:** None. Field labels are typically single-line. If any labels wrap to two lines, 1.2 line-height is still readable at 12px.

---

### R7 — LOW: Arial Narrow fallback documentation (carried from prior audit R8)

| Field        | Value                     |
| ------------ | ------------------------- |
| **ID**       | R7                        |
| **Priority** | LOW                       |
| **Category** | Font loading / Robustness |

**Problem:** Arial Narrow is specified via `--ff-heading: 'Arial Narrow', Arial, sans-serif` (`tokens.css:328`) with no `@font-face` declaration or documentation. It relies entirely on being a system font. Arial Narrow IS included with Windows and macOS, so desktop users are covered. However: (1) not available on Linux, ChromeOS, or mobile, (2) fallback to standard Arial loses condensed character, (3) no documentation of this assumption. For a tool used by a specific team on managed workstations, risk is minimal, but the assumption should be documented. Carried from prior audit R8.

**Fix:** Add a comment documenting the system font assumption.

**Specifics:**

- File: `tokens.css` above line 328
- Add:
  ```css
  /* Arial Narrow: system font (Windows, macOS). Fallback to Arial is wider —
     acceptable for managed desktop deployment. */
  --ff-heading: 'Arial Narrow', Arial, sans-serif;
  ```

**Dependencies:** None. Documentation only, no visual change.

---

### R8 — LOW: Reference drawer title mixed-case intent should be documented (carried from prior audit R9)

| Field        | Value                            |
| ------------ | -------------------------------- |
| **Priority** | LOW                              |
| **Category** | Consistency (likely intentional) |
| **ID**       | R8                               |

**Problem:** `.reference-drawer-title` (`components.css:1631-1637`) explicitly sets `text-transform: none` and uses `font-size: var(--text-body)` with `font-weight: 700`. Its parent `.reference-drawer-summary` uses `font-family: var(--ff-heading)` with `text-transform: uppercase` and `letter-spacing: var(--ls-uppercase)`. The title breaks out of the uppercase pattern to show the criterion or reference name in mixed case. This is likely intentional — criterion names are proper nouns that read better in mixed case — but there is no comment explaining the design decision, so a future contributor might "fix" it. Carried from prior audit R9.

**Fix:** Add a comment explaining the intentional deviation.

**Specifics:**

- File: `components.css` before the `.reference-drawer-title` rule
- Add:
  ```css
  /* Title intentionally mixed-case for readability of proper nouns,
     despite uppercase context in parent summary. */
  ```

**Dependencies:** None.

---

## Summary Table

| ID  | Priority | Area          | Action                                                                       | Files                          | Status  |
| --- | -------- | ------------- | ---------------------------------------------------------------------------- | ------------------------------ | ------- |
| R1  | HIGH     | Font family   | Add `--ff-heading` + `font-weight: 700` + `line-height` to `.mini-card h3`   | `components.css`               | New     |
| R2  | HIGH     | Font family   | Add `--ff-heading` to `.subhead`                                             | `components.css`               | New     |
| R3  | HIGH     | Sizing/Scale  | Add `--text-md: 0.875rem` token; apply to field help + evidence descriptions | `tokens.css`, `components.css` | New     |
| R4  | MEDIUM   | Robustness    | Add explicit `font-weight: 700` to `.criterion-card h3`                      | `components.css`               | New     |
| R5  | MEDIUM   | Token hygiene | Remove unused `--text-mega`                                                  | `tokens.css`                   | Carried |
| R6  | MEDIUM   | Density       | Add `line-height: var(--lh-heading)` to `.field-label`                       | `components.css`               | New     |
| R7  | LOW      | Documentation | Document Arial Narrow system font assumption                                 | `tokens.css`                   | Carried |
| R8  | LOW      | Documentation | Comment mixed-case intent in `.reference-drawer-title`                       | `components.css`               | Carried |

**Total:** 3 HIGH, 3 MEDIUM, 2 LOW

## Implementation Order

Recommended sequence (no cross-dependencies, but order minimizes review friction):

1. **R5** — `tokens.css` token removal (cleanup first)
2. **R3** — `tokens.css` new token + `components.css` value updates (scale change)
3. **R7** — `tokens.css` comment addition
4. **R1** — `components.css` add properties to `.mini-card h3`
5. **R2** — `components.css` add property to `.subhead`
6. **R4** — `components.css` add property to `.criterion-card h3`
7. **R6** — `components.css` add property to `.field-label`
8. **R8** — `components.css` add comment

All changes are confined to `tokens.css` and `components.css`. No changes needed to: `base.css`, `layout.css`, `interaction-states.css`, `animations.css`, `accent-scoping.css`, `print.css`, `trust-framework.html`, or any JS files.
