# Wave 1 Typography Recommendations

**Date:** 2026-04-04
**Scope:** trust-framework.html demo and all CSS in `static/css/`
**Context:** EIS-IS team evaluating AI search tools against the TRUST framework. Aesthetic direction is "regimented functionalism" -- dense, flat, engineered. Typography must serve information density and instrument-like clarity.

---

## Current State Summary

The type system is already well-structured for a dense app UI. Three font families are defined with clear roles:

| Role | Token | Current | Purpose |
|------|-------|---------|---------|
| Body | `--ff-body` | Inter | Readable body text |
| Heading | `--ff-heading` | Arial Narrow | Condensed uppercase headings |
| Mono | `--ff-mono` | JetBrains Mono | Field IDs, codes, data |

Five type scale steps are defined (xs through heading) with dedicated line-height and letter-spacing tokens. Body text is set at `0.9375rem` (15px). `font-kerning: normal` is set on `<body>`. `font-variant-numeric: tabular-nums` is used on data tables and strip cells. Paragraph measure is capped at `72ch`.

### What Is Working

- Three font families with distinct, non-overlapping roles
- Token-based scale in `tokens.css` rather than magic numbers
- Consistent use of `var(--ff-heading)` for all structural labels/kickers/nav buttons
- Consistent use of `var(--ff-mono)` for codes, IDs, metadata, and data
- `font-kerning: normal` on body
- `tabular-nums` on score tables and completion strip
- `max-width: 72ch` on section paragraphs for readable measure
- Systematic letter-spacing tokens (`--ls-heading`, `--ls-label`, `--ls-kicker`, etc.)
- Weights loaded match weights used (Inter: 400, 600, 700, 800; JetBrains Mono: 400, 700)

### What Needs Fixing

The issues fall into categories: body text undersized, heading scale too compressed, weight roles muddied, missing typographic features, and inconsistency in how weights are applied across elements.

---

## HIGH Priority

### 1. Body Text Size Is Below Readability Threshold

**Problem:** `--text-body: 0.9375rem` renders at 15px on most browsers. This is below the 16px minimum recommended for sustained reading. For domain experts processing 132+ fields of evaluation criteria, eye fatigue compounds quickly. The type scale is also built downward from this undersized base, compressing the entire hierarchy.

**Current scale (in px at 1rem=16px):**

| Token | Value | px |
|-------|-------|----|
| `--text-xs` | 0.75rem | 12 |
| `--text-sm` | 0.8125rem | 13 |
| `--text-body` | 0.9375rem | 15 |
| `--text-sub` | 1.0625rem | 17 |
| `--text-heading` | 1.1875rem | 19 |

**Recommended scale** (major third ratio, 1.25, anchored at 1rem):

```css
/* In tokens.css, replace the type scale block */
--text-xs: 0.64rem;     /* ~10px -- codes, metadata badges */
--text-sm: 0.8rem;       /* ~13px -- secondary labels, kickers */
--text-body: 1rem;       /* 16px -- body text, the anchor */
--text-sub: 1.25rem;     /* 20px -- subheadings, h3 */
--text-heading: 1.563rem;/* 25px -- section headings, h2 */
```

**Impact:** Every element using `var(--text-body)` automatically upgrades. The 5px increase in body text (15 -> 16px) has negligible layout cost in a panel-based layout and significant readability gain.

**Pushback note:** Density is a stated design principle. However, density from font size compression is a false economy -- it saves pixels but costs comprehension speed. True density comes from tight spacing and minimal padding, which is already done well. The padding values (12-20px) will absorb the slight size increase without perceptible layout change.

### 2. Heading Scale Lacks Discrimination from Body

**Problem:** With the current scale, h2 (19px) is only 4px larger than body (15px). Even with weight 700 + uppercase + `--ff-heading`, the size gap is insufficient for a tool where users scan between 10+ section headings during evaluation. The gap between h3 (17px) and body (15px) is even worse -- 2px.

With the recommended scale above, h2 (25px) is 9px above body (16px), and h3 (20px) is 4px above body. Combined with uppercase + condensed font + weight, this creates strong hierarchy.

**Additionally,** the `@media (max-width: 760px)` breakpoint reduces `--text-heading` to `1.0625rem` (17px), nearly collapsing heading and body. This should be removed -- the scale is already tight; shrinking it further on mobile undermines scannability.

```css
/* In layout.css, REMOVE this rule entirely */
@media (max-width: 760px) {
  :root {
    --text-heading: 1.0625rem;  /* DELETE THIS */
  }
}
```

If heading text wraps on very small screens, the correct fix is shorter headings, not smaller type.

### 3. Weight Roles Are Muddied

**Problem:** Weight is applied inconsistently across elements that serve similar roles. For example:

- `h2` in sections uses `font-weight: 700`
- `h3` in sections uses `font-weight: 800`
- `.section-kicker` uses `font-weight: 800`
- `.field-label` uses `font-weight: 700`
- `.chip` uses `font-weight: 700`
- `.nav-button` uses `font-weight: 700`
- `.score-table th` uses `font-weight: 800`
- `.subhead` uses `font-weight: 800`
- `.context-route-title` uses no explicit weight (inherits body weight 400)

This means a subheading (h3) at 800 and a kicker at 800 have the same weight despite different structural roles. Meanwhile, a chip label at 700 and a nav button at 700 have the same weight as the main section heading.

**Recommended weight map:**

| Role | Weight | Reason |
|------|--------|--------|
| Section heading (h2) | 800 | Primary structural marker |
| Subheading (h3) | 700 | Secondary marker, less than h2 |
| Kicker / tag labels | 700 | Labels, not headings |
| Field labels | 700 | Match kicker weight |
| Nav buttons | 700 | Action surfaces, not headings |
| Body text | 400 | Default readable |
| Muted / secondary text | 400 | Same weight, lower contrast via color |
| Mono codes / data | 700 | High contrast for scannable data |

The key fix: h3 should step down from 800 to 700, and h2 should step up to 800. This creates a clear weight gradient: h2(800) > h3(700) = labels(700) > body(400).

```css
/* In components.css */
.doc-section h2,
.form-section h2 {
  font-weight: 800; /* was 700 -- step up to match kickers */
}

.doc-section h3,
.form-section h3 {
  font-weight: 700; /* was 800 -- step down below h2 */
}

.criterion-card h3 {
  font-weight: 700; /* was implicit, matches h3 */
}
```

### 4. `font-display: swap` Missing from Web Font Loading

**Problem:** The Google Fonts link uses `display=swap` parameter, which is correct for the Google CDN approach. However, Arial Narrow has no web font loaded -- it relies entirely on the system/local copy. If Arial Narrow is not installed on the user's machine, the fallback chain (`Arial, sans-serif`) will render headings in standard Arial, which has very different metrics from Narrow.

**Recommendation:** Add an `@font-face` declaration for Arial Narrow with metric-matched fallbacks, or accept that it degrades to standard Arial and design the fallback gracefully:

```css
/* In tokens.css, update the heading font-family */
--ff-heading: "Arial Narrow", "Arial", sans-serif;
```

This is already the current value. The real question is whether Arial Narrow is reliably available on the target machines (University of Twente managed workstations). If yes, this is fine. If not, consider loading a condensed web font. Given the "engineered, unfashionable" aesthetic direction and the institutional context, Arial Narrow is a defensible choice -- it is available on all Windows and most macOS installations.

**Action:** Confirm that Arial Narrow is available on target workstations. If not, replace with a condensed web font like **Barlow Condensed** (Google Fonts, free, similar metrics):

```css
/* Only if Arial Narrow is unavailable */
--ff-heading: "Barlow Condensed", "Arial Narrow", Arial, sans-serif;
```

And add to the Google Fonts link in `trust-framework.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

---

## MEDIUM Priority

### 5. Add Missing `--text-display` Token for Page-Level Titles

**Problem:** The panel title (`<h1>`, `.panel-title`) uses `var(--text-body)` at `0.9375rem` with `letter-spacing: 0.12em`. This means the most important heading on the page is the same size as body text, distinguished only by uppercase + letter-spacing + weight. For an `<h1>`, this is undersized even in a dense UI.

**Recommendation:** Add a sixth scale step for page-level titles:

```css
/* In tokens.css */
--text-display: 0.8rem;  /* Intentionally small uppercase -- see rationale */
```

Wait -- given the aesthetic direction of "flat, not hierarchical" and the existing design choice to keep h1 at body size with wide tracking, this is actually consistent with the brand. The panel title acts as a persistent label, not a visual headline. **Retract this recommendation.** The current treatment is deliberate and fits the "regimented functionalism" aesthetic.

Instead, ensure the `<h1>` is semantically correct and visually consistent:

```css
/* Verify panel-title has these (already present in layout.css -- confirm) */
.panel-title {
  font-size: var(--text-body);
  text-transform: uppercase;
  letter-spacing: var(--ls-panel-title); /* 0.12em */
  font-weight: 800;
  font-family: var(--ff-heading);
}
```

This is already in place. No change needed.

### 6. Line-Height for h3 Is Inconsistent

**Problem:** h2 has `line-height: var(--lh-heading)` (1.2), but h3 has `line-height: 1.3` or `1.35` hardcoded in several places:

```css
/* components.css line ~158 */
.doc-section h3,
.form-section h3 {
  line-height: 1.3;  /* hardcoded */
}

/* components.css line ~547 */
.criterion-card h3 {
  line-height: 1.35;  /* different hardcoded value */
}

/* components.css line ~1284 */
.context-anchor-label {
  line-height: 1.35;  /* yet another */
}
```

Three different line-heights for elements at the same type scale step (`--text-sub`) creates subtle visual inconsistency.

**Recommendation:** Use a token for subheading line-height:

```css
/* In tokens.css */
--lh-sub: 1.3;

/* In components.css, replace all hardcoded h3-ish line-heights */
.doc-section h3,
.form-section h3 {
  line-height: var(--lh-sub);
}

.criterion-card h3 {
  line-height: var(--lh-sub);
}

.context-anchor-label {
  line-height: var(--lh-sub);
}

.page-index-label {
  line-height: var(--lh-sub); /* was 1.35 */
}
```

### 7. `--text-body` Used Where `--text-sm` or `--text-xs` Is More Appropriate

**Problem:** Several secondary/metadata elements use `var(--text-body)` when they serve a supporting role and should be visually recessed:

- `.field-help` (helper text below fields) -- uses `var(--text-body)`, same size as the main content
- `.mock-control` (placeholder form controls) -- uses `var(--text-body)`
- `.evidence-block-description` -- uses `var(--text-body)`
- `.context-source-item` -- uses `var(--text-body)` with `var(--ff-mono)` at body size

Helper text and descriptions should step down to create visual hierarchy between primary content and supporting information.

**Recommendation:**

```css
/* Helper text should be secondary size */
.field-help {
  font-size: var(--text-sm);  /* was var(--text-body) */
}

/* Mock controls are placeholders, not primary content */
.mock-control {
  font-size: var(--text-sm);  /* was var(--text-body) */
}

/* Evidence descriptions are supporting context */
.evidence-block-description {
  font-size: var(--text-sm);  /* was var(--text-body) */
}

/* Mono source items at body size are visually heavy; step down */
.context-source-item {
  font-size: var(--text-sm);  /* was var(--text-body) */
}
```

**Counterargument:** In a density-focused tool, making secondary text smaller reduces the already-tight space savings. However, the 2px reduction (16px -> 13px with the recommended scale) is justified because these elements are read after the user orients on primary content. They can afford to be slightly smaller.

### 8. Inter Weights 600 and 700 Are Too Similar

**Problem:** Inter's weight 600 (semi-bold) and 700 (bold) are nearly indistinguishable at body text sizes. The font currently loads 400, 600, 700, and 800. Three of these four (600, 700, 800) serve similar roles.

Usage analysis:
- **400:** Body text, descriptions (correct)
- **600:** `.mock-control .value` only (one usage)
- **700:** Chips, field labels, nav buttons, section h2, many labels
- **800:** Section h3, kickers, score table headers, subhead

**Recommendation:** Drop weight 600. Replace its single usage with 700:

```css
.mock-control .value {
  font-weight: 700; /* was 600 */
}
```

And update the Google Fonts link to remove the 600 weight:

```html
<!-- Remove wght@600 from Inter -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

This saves one font file download (~15-20KB) and eliminates a weight that creates visual ambiguity.

### 9. Add `font-variant-numeric: tabular-nums` to Rating Text

**Problem:** `.rating-text strong` shows score numbers (0, 1, 2, 3) but does not use `tabular-nums`. While the score table does, the inline score labels in rating options do not.

```css
.rating-text strong {
  font-variant-numeric: tabular-nums; /* add this */
}
```

Also, the `.completion-badge` already has `tabular-nums` but `.page-index-state` and `.page-index-status` do not:

```css
.page-index-state,
.page-index-status {
  font-variant-numeric: tabular-nums; /* add for alignment */
}
```

### 10. Missing `text-rendering` Declaration

**Problem:** No `text-rendering` property is set. For a dense UI with many small text elements, `optimizeLegibility` enables kerning and ligatures but can be slow on very long pages. `optimizeSpeed` disables them but is faster.

**Recommendation for this specific UI:**

```css
/* In base.css, add to body rule */
body {
  text-rendering: optimizeSpeed;
  /* kerning is already handled by font-kerning: normal */
  /* optimizeSpeed prevents slow ligature calculation on dense pages */
}
```

`font-kerning: normal` is already set, so kerning is preserved. `optimizeSpeed` just skips the more expensive OpenType layout features that aren't needed here.

---

## LOW Priority

### 11. Consider `text-transform: uppercase` via Token

**Problem:** `text-transform: uppercase` is applied inline in ~20 different rules. While this is fine functionally, a design token or utility class approach would reduce repetition:

```css
/* In tokens.css or a utilities block */
.u-uppercase {
  text-transform: uppercase;
}
```

However, since this is a single-file app with no build system, the repetition is manageable. This is a nice-to-have for maintainability, not a pressing issue.

### 12. Print Typography Uses `pt` Units

**Problem:** `print.css` uses `font-size: 12pt` for `::before` pseudo-elements that inject section codes. While `pt` is correct for print, it is inconsistent with the `rem`-based screen styles. This is fine -- print and screen have different unit conventions.

No action needed. The current approach is correct.

### 13. Panel Caption Uses Body Size But Serves a Subordinate Role

**Problem:** `.panel-caption` uses `var(--text-body)` and `var(--lh-body)` but is visually secondary to the panel title. It could use `var(--text-sm)` to create hierarchy:

```css
.panel-caption {
  font-size: var(--text-sm); /* was var(--text-body) */
}
```

However, with the recommended body size increase to 1rem, the panel caption at body size is acceptable -- it provides a brief description that users may need to read carefully on first visit. **Low priority; defer.**

### 14. `.brand-sep` Uses Hardcoded Font Size

**Problem:**
```css
.brand-sep {
  font-size: 1.1rem;  /* not from the type scale */
}
```

This is a decorative separator character, so it does not need to be on the scale. However, it should use a token for consistency:

```css
.brand-sep {
  font-size: var(--text-sub); /* was 1.1rem */
}
```

With the recommended scale, `--text-sub` becomes 1.25rem. If that is too large for a separator, keep the current hardcoded value.

### 15. Add `word-break: break-word` to Long Mono Text

**Problem:** Some mono-spaced text elements (codes, file names) can overflow their containers on narrow screens. The `overflow-wrap: anywhere` on `.evidence-file-link` and `.evidence-item-name` handles this, but other mono elements (`.chip`, `.context-route-code`, `.page-index-code`) do not have overflow protection.

```css
.chip,
.context-route-code,
.page-index-code,
.context-anchor-code {
  overflow-wrap: anywhere; /* prevent mono text overflow */
}
```

### 16. `--ls-heading` Is Nearly Zero

**Problem:** `--ls-heading: -0.01em` is so close to zero that it has no visible effect. This is fine as a deliberate baseline, but if heading text wraps to multiple lines, the tight tracking can feel cramped. With the recommended scale increase to 1.563rem, the slightly negative tracking becomes more appropriate and visually useful.

No action needed at this time. If headings feel too tight after the scale change, increase to `-0.02em` or `0`.

---

## Summary of Changes by File

### `tokens.css`
1. Update type scale values (HIGH #1)
2. Add `--lh-sub` token (MEDIUM #6)

### `base.css`
3. Add `text-rendering: optimizeSpeed` (MEDIUM #10)
4. Add `overflow-wrap: anywhere` to mono selectors (LOW #15)

### `components.css`
5. Adjust h2/h3 weight hierarchy (HIGH #3)
6. Normalize h3 line-height to token (MEDIUM #6)
7. Step down secondary text sizes (MEDIUM #7)
8. Add `tabular-nums` to rating and index elements (MEDIUM #9)

### `layout.css`
9. Remove mobile `--text-heading` override (HIGH #2)

### `trust-framework.html`
10. Remove Inter weight 600 from Google Fonts link (MEDIUM #8)

---

## Token Diff Preview

```css
/* tokens.css -- BEFORE */
--text-xs: 0.75rem;
--text-sm: 0.8125rem;
--text-body: 0.9375rem;
--text-sub: 1.0625rem;
--text-heading: 1.1875rem;
--lh-body: 1.55;
--lh-heading: 1.2;
/* --lh-sub: does not exist */

/* tokens.css -- AFTER */
--text-xs: 0.64rem;       /* 10px, down from 12px */
--text-sm: 0.8rem;         /* 13px, down from 13px (unchanged) */
--text-body: 1rem;         /* 16px, up from 15px */
--text-sub: 1.25rem;       /* 20px, up from 17px */
--text-heading: 1.563rem;  /* 25px, up from 19px */
--lh-body: 1.55;           /* unchanged */
--lh-heading: 1.2;         /* unchanged */
--lh-sub: 1.3;             /* NEW -- normalizes h3 line-height */
```

---

## Risks and Trade-offs

| Risk | Mitigation |
|------|-----------|
| Body text size increase reduces information density | The 1px increase is negligible in a panel layout; tight padding remains the density driver |
| Heading scale increase may cause wrapping | Shorten heading text or accept wrapping -- the size increase is proportional to the density gain |
| Removing weight 600 affects `.mock-control .value` | 700 is visually identical at body size; no perceptible change |
| Arial Narrow fallback to Arial changes heading proportions | Confirm availability on UT workstations; if unavailable, add Barlow Condensed |

---

## What NOT to Change

- **Font families:** Inter, Arial Narrow, and JetBrains Mono are correct for the "engineered functionalism" aesthetic. Inter is a default, but it is the right default for this context -- a dense evaluation tool where readability matters more than personality.
- **Letter-spacing tokens:** The existing tokens (`--ls-heading`, `--ls-label`, `--ls-uppercase`, `--ls-kicker`, `--ls-panel-title`) are well-calibrated and map clearly to their roles.
- **`font-kerning: normal`:** Already set. Correct.
- **Measure (`max-width: 72ch`):** Appropriate for the line-height and font pairing.
- **`font-variant-numeric: tabular-nums` on tables:** Already set. Correct.
- **`font-display: swap` on Google Fonts:** Already set via URL parameter. Correct.
- **Color choices for text (`--ut-text`, `--ut-muted`, `--ut-navy`):** Out of scope for typography; covered in color recommendations.
