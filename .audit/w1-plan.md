# Wave 1 Unified Implementation Plan

**Sources**: w1-animate.md, w1-colorize.md, w1-typeset.md
**Date**: 2026-04-04

---

## Conflict Resolutions

| Conflict                                                  | Resolution                                                                                                                                             |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Animate R3** claims `is-just-selected` is never removed | **Audit error.** `field-handlers.js:229-232` already has both `animationend` and a 600ms `setTimeout`. Only the timeout is too long. Reduced to 200ms. |
| **Typeset R2** claims `--ls-heading` is never used        | **Audit error.** `components.css:145` already references `var(--ls-heading)` on h2. Only action: add letter-spacing to `.context-route-title`.         |
| **Colorize R1/R2** overlap on on-accent contrast          | Merged. Single fix: change `--section-se-on-accent` and `--section-tc-on-accent` to `#ffffff`.                                                         |
| **Colorize R4/R5** overlap on warning/SE collision        | Merged. Single new `--state-warning` color, `--judgment-conditional` follows.                                                                          |
| **Colorize R7/R8** overlap on blocked tint                | Merged. Single fix to `--state-blocked-tint`.                                                                                                          |
| **Typeset R1/R4** touch same selectors                    | No conflict — R1 changes `font-weight`, R4 changes `letter-spacing`. Applied together.                                                                 |

---

## Deferred to Later Waves

All LOW-priority items from all three audits are deferred:

| ID           | Source   | Description                            | Why Deferred                                 |
| ------------ | -------- | -------------------------------------- | -------------------------------------------- |
| Animate R2   | animate  | Drawer backdrop fade                   | Nice-to-have; drawer already slides smoothly |
| Animate R4   | animate  | Completion badge animation consistency | Imperceptible difference                     |
| Animate R5   | animate  | Button active `filter` → `background`  | Works correctly as-is                        |
| Animate R6   | animate  | Reference drawer animation             | Intentionally native `<details>`             |
| Animate R7   | animate  | Section enter on load                  | Harmless; browsers optimize                  |
| Animate R8   | animate  | `--duration-slow` token                | Single hardcoded value; low impact           |
| Colorize R3  | colorize | `--ut-grey` canvas mismatch            | Brand-spec deviation is arguably better      |
| Colorize R6  | colorize | Evidence accent family                 | Grouping works; no user confusion            |
| Colorize R9  | colorize | Primary button hover color             | Functional as-is                             |
| Colorize R10 | colorize | Score "N/A" color                      | Implicit `--section-default` works           |
| Colorize R11 | colorize | Print rating borders hardcode `#000`   | Print-specific; low impact                   |
| Colorize R12 | colorize | Purple recommendation collision        | Low usage; monitor only                      |
| Typeset R9   | typeset  | Print `line-height` hardcoded          | Intentional tighter print leading            |
| Typeset R10  | typeset  | Print `12pt` kicker size               | Appropriate print override                   |
| Typeset R11  | typeset  | `--text-xs` minimum size               | Acceptable for short labels                  |
| Typeset R12  | typeset  | No h4-h6 styles                        | Not used in markup                           |

---

## Implementation Changes — By File

CSS load order: `tokens.css` → `base.css` → `layout.css` → `components.css` → `interaction-states.css` → `animations.css` → `print.css`

---

### 1. `static/css/tokens.css`

All token changes go here first so downstream files can reference them.

#### 1a. Fix SE/TC on-accent contrast (Colorize R1/R2 — HIGH)

The contrast of `#fafbfc` (ut-white) on SE accent-strong (~`#b04309`) is ~4.2:1 — below WCAG AA for normal text. Using pure `#ffffff` raises it above 4.5:1.

**Line 75** — `--section-se-on-accent`:

```
OLD: --section-se-on-accent: var(--ut-white);
NEW: --section-se-on-accent: #ffffff;
```

**Line 81** — `--section-tc-on-accent`:

```
OLD: --section-tc-on-accent: var(--ut-white);
NEW: --section-tc-on-accent: #ffffff;
```

#### 1b. Deduplicate warning from Secure principle (Colorize R4/R5 — MEDIUM)

`--state-warning` and `--judgment-conditional` both resolve to `--se` (#EA580C), which is also the Secure principle color. Inside a Secure section, warnings are invisible. Introduce amber `#D97706` for warning/conditional states.

**Line 134** — `--state-warning`:

```
OLD: --state-warning: var(--se);
NEW: --state-warning: #D97706;
```

**Line 151** — `--judgment-conditional`:

```
OLD: --judgment-conditional: var(--se);
NEW: --judgment-conditional: var(--state-warning);
```

The tint/border derivatives (`--state-warning-tint`, `-border`, `--judgment-conditional-tint`, `-border`) are computed via `color-mix()` from the base token, so they update automatically.

#### 1c. Fix blocked state tint pattern (Colorize R7/R8 — MEDIUM)

`--state-blocked-tint` uses `--ut-slate` (gray) while every other state tint uses its own base color. This makes blocked fields look "disabled" rather than "error."

**Line 144** — `--state-blocked-tint`:

```
OLD: --state-blocked-tint: color-mix(in srgb, var(--ut-slate) 18%, var(--ut-white));
NEW: --state-blocked-tint: color-mix(in srgb, var(--state-blocked) 10%, var(--ut-white));
```

Note: 10% matches the pattern used by `--state-success-tint`, `--state-error-tint`, etc. The old 18% slate value was higher because slate is lighter than red; 10% red produces a visually similar lightness.

#### 1d. Add letter-spacing token for section kickers (Typeset R4 — MEDIUM)

0.1em is used by `.section-kicker` and `.surface-kicker` but has no token. Add one.

**After line 211** (after `--ls-panel-title: 0.12em;`):

```
ADD: --ls-section-kicker: 0.1em;
```

---

### 2. `static/css/base.css`

#### 2a. Add font rendering optimization (Typeset R8 — MEDIUM)

**Line 16** — After `font-kerning: normal;`, add three properties:

```
OLD:   font-kerning: normal;
NEW:   font-kerning: normal;
       text-rendering: optimizeLegibility;
       -webkit-font-smoothing: antialiased;
       -moz-osx-font-smoothing: grayscale;
```

Indentation: 2 spaces (matching surrounding code).

#### 2b. Remove dead `.small` class (Typeset R7 — MEDIUM)

Grep confirms `.small` is not used in any HTML, JS, or other CSS file. It sets `font-size: var(--text-body)` (1rem) which is identical to body default — making it a no-op.

**Lines 98-100** — Delete the `.small` rule block:

```
OLD:
.small {
  font-size: var(--text-body);
}
NEW: (deleted)
```

---

### 3. `static/css/layout.css`

#### 3a. Fix `.brand-sep` font-weight (Typeset R6 — MEDIUM)

Arial Narrow has no weight 300; falls back to 400 silently.

**Line 63**:

```
OLD:   font-weight: 300;
NEW:   font-weight: 400;
```

#### 3b. Fix `.panel-title` font-weight (Typeset R1 — HIGH)

**Line 135**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

#### 3c. Fix `.surface-kicker` font-weight and letter-spacing (Typeset R1 + R4 — HIGH + MEDIUM)

**Line 388**:

```
OLD:   letter-spacing: 0.1em;
NEW:   letter-spacing: var(--ls-section-kicker);
```

Note: `.surface-kicker` does NOT have `font-weight: 800` — it already has `font-weight: 700` at line 386. No weight change needed.

#### 3d. Fix `.trust-label p` letter-spacing (Typeset R4 — MEDIUM)

Consolidate 0.06em with `--ls-uppercase` (0.04em). The 0.02em difference at `var(--text-sm)` (0.75rem) size is imperceptible.

**Line 73**:

```
OLD:   letter-spacing: 0.06em;
NEW:   letter-spacing: var(--ls-uppercase);
```

#### 3e. Add surface overlay exit animation (Animate R1 — MEDIUM)

**After the existing surface overlay rules** (after the `.shell-surface:not([hidden]) .surface-card` animation block, approximately line 344), add:

```css
.shell-surface.is-closing {
  animation: surfaceFadeOut var(--duration-fast) var(--ease-out-quart) forwards;
}
.shell-surface.is-closing .surface-card {
  animation: surfaceSlideOut var(--duration-normal) var(--ease-out-quart) forwards;
}
@keyframes surfaceFadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}
@keyframes surfaceSlideOut {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(8px);
    opacity: 0;
  }
}
```

---

### 4. `static/css/components.css`

#### 4a. Fix `.nav-button` font-weight and letter-spacing (Typeset R1 + R4 — HIGH + MEDIUM)

**Line 65**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

**Line 68**:

```
OLD:   letter-spacing: 0.04em;
NEW:   letter-spacing: var(--ls-uppercase);
```

#### 4b. Fix `.section-kicker` font-weight and letter-spacing (Typeset R1 + R4 — HIGH + MEDIUM)

**Line 124**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

**Line 126**:

```
OLD:   letter-spacing: 0.1em;
NEW:   letter-spacing: var(--ls-section-kicker);
```

#### 4c. Fix `h2` font-weight (Typeset R1 — HIGH)

**Line 148** (inside `.doc-section h2, .form-section h2` block):

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

Note: `letter-spacing: var(--ls-heading)` at line 145 is already correct (contrary to Typeset R2 audit claim).

#### 4d. Add `font-family` to `h3` rules (Typeset R5 — MEDIUM)

**Lines 151-158** — `.doc-section h3, .form-section h3`:

```
OLD:
.doc-section h3,
.form-section h3 {
  margin: 16px 0 8px;
  color: var(--ut-navy);
  font-size: var(--text-sub);
  line-height: var(--lh-sub);
}
NEW:
.doc-section h3,
.form-section h3 {
  margin: 16px 0 8px;
  color: var(--ut-navy);
  font-size: var(--text-sub);
  line-height: var(--lh-sub);
  font-family: var(--ff-heading);
}
```

**Lines 546-551** — `.criterion-card h3`:

```
OLD:
.criterion-card h3 {
  margin: 0 0 8px;
  color: var(--ut-navy);
  font-size: var(--text-sub);
  line-height: var(--lh-sub);
}
NEW:
.criterion-card h3 {
  margin: 0 0 8px;
  color: var(--ut-navy);
  font-size: var(--text-sub);
  line-height: var(--lh-sub);
  font-family: var(--ff-heading);
}
```

Note: `.mini-card h3` (line 194) and `.context-route-title` (line 1112) already set `font-family: var(--ff-heading)`. No change needed there.

#### 4e. Fix `.score-table th` font-weight and letter-spacing (Typeset R1 + R4 — HIGH + MEDIUM)

**Line 233**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

**Line 231**:

```
OLD:   letter-spacing: 0.08em;
NEW:   letter-spacing: var(--ls-kicker);
```

#### 4f. Fix `.score-table td strong` font-weight (Typeset R1 — HIGH)

**Line 238**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

#### 4g. Fix `.field-label` letter-spacing to use token (Typeset R3 — MEDIUM)

**Line 301**:

```
OLD:   letter-spacing: 0.02em;
NEW:   letter-spacing: var(--ls-label);
```

#### 4h. Fix `.condition-tag, .display-tag` letter-spacing (Typeset R4 — MEDIUM)

**Line 312**:

```
OLD:   letter-spacing: 0.04em;
NEW:   letter-spacing: var(--ls-uppercase);
```

#### 4i. Fix `.evidence-button` letter-spacing (Typeset R4 — MEDIUM)

**Line 724**:

```
OLD:   letter-spacing: 0.04em;
NEW:   letter-spacing: var(--ls-uppercase);
```

#### 4j. Fix `.evidence-item-name` font-weight (Typeset R1 — HIGH)

**Line 830**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

#### 4k. Fix `.evidence-lightbox-title` font-weight (Typeset R1 — HIGH)

**Line 888**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

#### 4l. Fix `.workspace-title` font-weight and letter-spacing (Typeset R1 + R4 — HIGH + MEDIUM)

**Line 1001**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

**Line 1004**:

```
OLD:   letter-spacing: 0.08em;
NEW:   letter-spacing: var(--ls-kicker);
```

#### 4m. Add letter-spacing to `.context-route-title` (Typeset R2 — HIGH)

This is an uppercase heading with no letter-spacing. Add the standard uppercase value.

**After line 1119** (after `text-transform: uppercase;`):

```
OLD:   text-transform: uppercase;
NEW:   text-transform: uppercase;
       letter-spacing: var(--ls-uppercase);
```

#### 4n. Fix `.pager-button` letter-spacing (Typeset R4 — MEDIUM)

**Line 1357**:

```
OLD:   letter-spacing: 0.04em;
NEW:   letter-spacing: var(--ls-uppercase);
```

#### 4o. Fix `.reference-drawer-summary` font-weight and letter-spacing (Typeset R1 + R4 — HIGH + MEDIUM)

**Line 1401**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

**Line 1403**:

```
OLD:   letter-spacing: 0.06em;
NEW:   letter-spacing: var(--ls-uppercase);
```

---

### 5. `static/css/interaction-states.css`

#### 5a. Replace `.nav-button:active` filter technique (Animate R5 — LOW → included as trivial)

Deferring this was considered, but the change is trivial and avoids potential compositing issues.

**Lines 49-51**:

```
OLD:
.nav-button:active {
  filter: brightness(0.92);
}
NEW:
.nav-button:active {
  background: color-mix(in srgb, var(--ut-grey) 80%, var(--ut-border));
}
```

#### 5b. Fix `.header-progress-title` font-weight and letter-spacing (Typeset R1 + R4 — HIGH + MEDIUM)

**Line 1170**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

**Line 1173**:

```
OLD:   letter-spacing: 0.08em;
NEW:   letter-spacing: var(--ls-kicker);
```

---

### 6. `static/css/animations.css`

#### 6a. Add `prefers-reduced-motion` guard for surface close animation (Animate R1 — MEDIUM)

**After line 21** (after the first `prefers-reduced-motion` block closes), add:

```css
.shell-surface.is-closing,
.shell-surface.is-closing .surface-card {
  animation: none !important;
}
```

---

### 7. `static/css/print.css`

#### 7a. Add print reset for surface close animation (Animate R1 — MEDIUM)

**After line 98** (after the existing `.shell-surface:not([hidden])` reset block), add:

```css
.shell-surface.is-closing,
.shell-surface.is-closing .surface-card {
  animation: none;
  opacity: 1;
  transform: none;
}
```

#### 7b. Fix print rating borders to use score tokens (Colorize R11 — LOW → included)

The `print-color-adjust: exact` rule at line 132 already enables color printing for rating options. The hardcoded `#000` loses semantic color coding.

**Lines 100-105**:

```
OLD:
  .rating-option.score-0,
  .rating-option.score-1,
  .rating-option.score-2,
  .rating-option.score-3 {
    border: 2px solid #000;
  }
NEW:
  .rating-option.score-0 { border: 2px solid var(--score-0); }
  .rating-option.score-1 { border: 2px solid var(--score-1); }
  .rating-option.score-2 { border: 2px solid var(--score-2); }
  .rating-option.score-3 { border: 2px solid var(--score-3); }
```

---

### 8. `static/js/behavior/field-handlers.js`

#### 8a. Reduce `is-just-selected` cleanup timeout (Animate R3 — HIGH)

The removal mechanism already exists (line 229-232). The 600ms timeout is 4x the 150ms animation duration — unnecessarily long. Reduce to 200ms.

**Line 232**:

```
OLD:     setTimeout(removeClass, 600);
NEW:     setTimeout(removeClass, 200);
```

---

### 9. `static/js/behavior/navigation.js`

#### 9a. Add surface overlay exit animation (Animate R1 — MEDIUM)

The current `syncShellSurfaces` function (line 600-601) sets `hidden` and `display: none` immediately on close, killing any CSS transition. To animate the close:

**Step 1**: Add a `Set` at module scope (near the top of the file, with other module-level state) to track surfaces currently animating closed:

```js
const closingSurfaces = new Set();
```

**Step 2**: Replace the surface toggle block (lines 592-604) with:

```js
[
  ['aboutSurface', dom.aboutSurface],
  ['helpSurface', dom.helpSurface],
].forEach(([surfaceName, element]) => {
  if (!element) {
    return;
  }

  const isOpen = selectShellSurfaceState(state, surfaceName);

  if (!isOpen && element.classList.contains('is-open') && !closingSurfaces.has(surfaceName)) {
    element.classList.add('is-closing');
    element.classList.remove('is-open');
    closingSurfaces.add(surfaceName);

    const finishClose = () => {
      element.hidden = true;
      element.style.display = 'none';
      element.classList.remove('is-closing');
      closingSurfaces.delete(surfaceName);
    };

    element.addEventListener('animationend', finishClose, { once: true });
    setTimeout(finishClose, 250);
  } else if (isOpen) {
    closingSurfaces.delete(surfaceName);
    element.classList.remove('is-closing');
    element.hidden = false;
    element.style.display = 'flex';
    element.classList.toggle('is-open', true);
  }
});
```

The 250ms timeout is a safety net matching `--duration-normal` (200ms) + margin. The `closingSurfaces` set prevents re-triggering if state syncs multiple times during the animation.

---

## Change Count Summary

| File                     | Changes                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `tokens.css`             | 5 edits (2 on-accent fixes, 2 warning/conditional, 1 blocked tint, 1 new token)                           |
| `base.css`               | 2 edits (font rendering, remove .small)                                                                   |
| `layout.css`             | 5 edits (brand-sep weight, panel-title weight, surface-kicker ls, trust-label ls, surface exit animation) |
| `components.css`         | 18 edits (12 font-weight, 10 letter-spacing, 2 h3 font-family, 1 context-route-title ls)                  |
| `interaction-states.css` | 3 edits (nav-button active, header-progress-title weight+ls)                                              |
| `animations.css`         | 1 edit (reduced-motion guard)                                                                             |
| `print.css`              | 2 edits (surface close reset, score token borders)                                                        |
| `field-handlers.js`      | 1 edit (timeout reduction)                                                                                |
| `navigation.js`          | 1 edit (exit animation logic)                                                                             |
| **Total**                | **~38 discrete edits across 9 files**                                                                     |

---

## Verification Checklist

After implementation:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. Visual check: SE and TC nav buttons show white text on dark backgrounds with clear contrast
4. Visual check: Close About/Help overlay — should fade out, not disappear instantly
5. Visual check: h3 headings use Arial Narrow (condensed), matching h1/h2
6. Visual check: Warning states show amber, not orange — visually distinct from SE principle
7. Visual check: Blocked fields have faint red tint background, not gray
8. Reduced-motion: overlay close still works (instant, no animation)
9. Print preview: rating options retain score colors (red/orange/teal/green borders)
