# Wave 4 Unified Implementation Plan

**Sources**: w4-arrange.md, w4-normalize.md, w4-clarify.md, w4-optimize.md, w4-harden.md
**Cross-reference**: w1-plan.md, w2-plan.md, w3-plan.md (already implemented)
**Date**: 2026-04-04

---

## Conflict Resolutions

| Conflict                                                                                                                           | Resolution                                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **optimize R1** removes `backdrop-filter: blur(2px)` from `.shell-surface`; **arrange** references shell-surface for header work   | No conflict — arrange changes header zone structure, optimize removes backdrop-filter. Both apply independently.                                                                                                                                                                          |
| **normalize R1** fixes `font-weight: 800` in components.css/print.css; **optimize R2** removes 800 from Google Fonts import        | Coordinate: fix the CSS instances first (normalize R1), then remove from font import (optimize R2/normalize R2).                                                                                                                                                                          |
| **normalize R4** changes `font-weight: 500` → `700` for checkbox items; **w2-plan** set `.notice` to `font-weight: 700`            | No conflict — different selectors. Both apply.                                                                                                                                                                                                                                            |
| **optimize R3** removes `border-left-width` from form-section transition; **w2-plan** added `border-left-width` to that transition | **Conflict: revert w2-plan's addition.** Optimize R3 correctly identifies this as a layout-triggering transition. Remove the `border-left-width var(--duration-fast)` line from the transition list in interaction-states.css:107. The `@starting-style` block (line 161-165) can remain. |
| **optimize R9** changes `ratingBorderConfirm` keyframe from `border-left-width` to `box-shadow`; **w2-plan** created this keyframe | **Conflict: rewrite the keyframe.** The current keyframe animates a layout property. Replace with `box-shadow` pulse. The settled `.score-*` states already have `border-left: 3px solid`, so the animation only needs a visual pulse effect.                                             |
| **arrange R7** increases strip-cell size; **arrange R1** decreases completion-strip padding                                        | Both apply — R1 tightens the strip container, R7 enlarges individual cells. Net effect: strip stays compact but cells are more scannable.                                                                                                                                                 |
| **harden R4** (validation messages) is HIGH effort; **w3-plan** assigned it to Batch 6 (if time permits)                           | Include in this wave but flag as deferred to Wave 5 if time runs short. It requires coordinated CSS + JS changes.                                                                                                                                                                         |

---

## Waves 1-3 Cross-Reference: Do NOT Revert

These changes are already in the codebase and must be preserved:

- **w1**: All `font-weight: 800` → `700` in layout.css/components.css/interaction-states.css, all `letter-spacing` → token refs, `h3` font-family, `.context-route-title` ls, surface exit animations, `.small` class removed, font rendering properties
- **w2**: `@property --top-accent-color`, accent-scoping per-key, top-accent 5px, `.text-display: 2.25rem`, `.text-mega: 2.75rem`, active section `border-bottom-width: 2px`, pager shell visual weight, `ratingBorderConfirm` keyframe, `completePulse` section-tint, `.field-group:focus-within` section accent border, principle-specific evidence hints, evaluation-complete status text
- **w1 regression confirmed**: `.subhead` (components.css:919), governance `.value` (components.css:961), print.css kicker `::before` (print.css:122) still have `font-weight: 800` — these are the targets for normalize R1

---

## Deferred to Wave 5

| ID  | Source        | Description                                           | Reason                                                                   |
| --- | ------------- | ----------------------------------------------------- | ------------------------------------------------------------------------ |
| D1  | harden R9     | Save/auto-save indicator UI                           | Requires design decision on in-memory-only wording; no persistence layer |
| D2  | harden R7     | Alt+Left/Alt+Right pager shortcuts                    | Needs `navigateRelative` exposure; moderate effort                       |
| D3  | harden R8     | Alt+C context panel toggle shortcut                   | Conflicts with browser copy in text inputs; needs careful guard          |
| D4  | optimize R6   | Skip DOM sync on UI-only state changes                | Medium JS refactor; needs careful testing of all field types             |
| D5  | optimize R4   | `color-mix()` in keyframes                            | Negligible cost; 200ms animation                                         |
| D6  | normalize R5  | Tokenize all hardcoded spacing (~150 replacements)    | Zero visual impact; mechanical; batch separately                         |
| D7  | normalize R7  | `.brand-sep` font-size 1.1rem → `--text-sub`          | Intentional decorative glyph; marginal                                   |
| D8  | normalize R10 | Add `--border-accent`/`--border-accent-active` tokens | Requires migrating 6px/8px usage; moderate effort                        |
| D9  | normalize R11 | Unify disabled opacity values                         | Requires design decision on unified value                                |
| D10 | clarify R7    | "Display only" → "Computed"                           | Subjective wording choice                                                |
| D11 | clarify R15   | "Topic" → "Context topic" in route card               | Minor label change                                                       |
| D12 | w3-plan D1-D9 | All w3-plan deferred items                            | Still deferred per w3-plan                                               |

---

## Implementation Changes — By File

CSS load order: `tokens.css` → `base.css` → `layout.css` → `components.css` → `accent-scoping.css` → `interaction-states.css` → `animations.css` → `print.css`

---

### 1. `trust-framework.html`

#### 1a. Remove font-weight 800 from Google Fonts import (normalize R2 + optimize R2 — HIGH)

**Line 9**:

```
OLD: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;800&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
NEW: <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

#### 1b. Fix aria-label on completion strip (clarify R12 — LOW)

**Line 42**:

```
OLD: <p id="completionStripLabel" class="visually-hidden">Canonical page progress strip</p>
NEW: <p id="completionStripLabel" class="visually-hidden">Questionnaire progress strip</p>
```

#### 1c. Add skip-to-context-panel link (harden R6 — MEDIUM)

**After line 26** (after existing skip link):

```
OLD:   <a href="#questionnairePanel" class="skip-link">Skip to questionnaire</a>
NEW:   <a href="#questionnairePanel" class="skip-link">Skip to questionnaire</a>
      <a href="#contextPanelTitle" class="skip-link">Skip to context panel</a>
```

#### 1d. Replace questionnaire panel caption (clarify R2 — HIGH)

**Line 72**:

```
OLD: <p class="panel-caption">The questionnaire is the primary surface. The page index and pager govern movement, reference drawers stay above the form, and framework background remains in the Info surface.</p>
NEW: <p class="panel-caption">Fill out each section using the page index or pager. Reference drawers below provide scoring and evidence guidance. Framework background is in Info.</p>
```

#### 1e. Replace context panel caption (clarify R2 — HIGH)

**Line 292**:

```
OLD: <p class="panel-caption">Active-page guidance lives here. Generic scoring and evidence references stay in drawers; framework background and governance stay in the Info surface. On narrow screens this panel becomes a dismissible drawer.</p>
NEW: <p class="panel-caption">Page-specific guidance and reference links appear here. Scoring references are in the drawers above. Framework background and governance details are in the Info surface.</p>
```

#### 1f. Replace context fallback empty-state text (clarify R3 — MEDIUM)

**Line 297**:

```
OLD: <p>Route cards, page anchors, and literal topic blocks are driven from the section and content registries. If a page lacks bespoke context prose, the generated route summary remains authoritative.</p>
NEW: <p>Context guidance loads automatically when a page is selected. If a section has specific guidance, it appears here; otherwise a summary is generated from the section definition.</p>
```

---

### 2. `static/css/tokens.css`

#### 2a. Add `--ls-annotation` token (normalize R8 — LOW)

**After line 211** (after `--ls-panel-title: 0.12em;`):

```
ADD: --ls-annotation: 0.04em;
```

#### 2b. Add `--border-accent` and `--border-accent-active` tokens (normalize R10 — LOW)

**After line 363** (after `--border-thick: 4px;`):

```
ADD: --border-accent: 6px;
ADD: --border-accent-active: 8px;
```

Note: These tokens are defined but not yet wired to existing selectors in this wave. Wiring is a Wave 5 task (deferred D8).

---

### 3. `static/css/base.css`

#### 3a. Replace skip-link z-index with token (normalize R3 — MEDIUM)

**Line 32**:

```
OLD:   z-index: 50;
NEW:   z-index: var(--z-skip-link);
```

---

### 4. `static/css/layout.css`

#### 4a. Restructure header-inner as grid (arrange R1 — HIGH)

**Lines 20-29**:

```
OLD:
.header-inner {
  max-width: 1800px;
  margin: 0 auto;
  padding: 16px 24px 14px;
  display: flex;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
}
NEW:
.header-inner {
  max-width: 1800px;
  margin: 0 auto;
  padding: 10px 24px 8px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px;
}
```

#### 4b. Reduce brand zone visual weight (arrange R1 — HIGH)

**Lines 31-36**:

```
OLD:
.brand {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 320px;
}
NEW:
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
```

#### 4c. Reduce brand-logos gap (arrange R1 — HIGH)

**Lines 43-47**:

```
OLD:
.brand-logos {
  display: flex;
  align-items: center;
  gap: 10px;
}
NEW:
.brand-logos {
  display: flex;
  align-items: center;
  gap: 8px;
}
```

#### 4d. Tighten top-nav button grouping (arrange R1 — HIGH)

**Lines 78-85**:

```
OLD:
.top-nav {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  position: relative;
  justify-content: flex-end;
}
NEW:
.top-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  position: relative;
  justify-content: flex-end;
}
```

#### 4e. Reduce `--header-h` to compensate (arrange R2 — HIGH)

**Line 287**:

```
OLD:   --header-h: 138px;
NEW:   --header-h: 118px;
```

#### 4f. Reduce mobile `--header-h` proportionally (arrange R2 — HIGH)

**Line 205**:

```
OLD:     --header-h: 196px;
NEW:     --header-h: 168px;
```

#### 4g. Remove `backdrop-filter` from shell-surface (optimize R1 — HIGH)

**Lines 327-328**:

```
OLD:   backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
NEW: (deleted)
```

#### 4h. Add `contain` to framework-panel (optimize R5 — MEDIUM)

**After line 248** (after `.framework-panel` closing brace, after the `transition` line):

```
OLD:   transition: background var(--duration-fast) var(--ease-out-quart);
}
NEW:   transition: background var(--duration-fast) var(--ease-out-quart);
  contain: layout style paint;
}
```

Note: This is the `.framework-panel` rule at lines 244-250 (the one inside the shell-layout context). Verify the `.framework-panel` at line 114-117 is a different rule (for the non-shell-layout context).

#### 4i. Override questionnaire-panel inner padding (arrange R5 — MEDIUM)

**After line 255** (after `.questionnaire-panel .panel-inner` closing brace):

```
OLD:
.questionnaire-panel .panel-inner {
  max-width: 1680px;
  margin: 0 auto;
}
NEW:
.questionnaire-panel .panel-inner {
  max-width: 1680px;
  margin: 0 auto;
  padding: 20px 28px 48px;
}
```

#### 4j. Override framework-panel inner padding (arrange R5 — MEDIUM)

**Lines 257-259**:

```
OLD:
.framework-panel .panel-inner {
  max-width: 560px;
}
NEW:
.framework-panel .panel-inner {
  max-width: 560px;
  padding: 20px 24px 48px;
}
```

#### 4k. Increase surface-card vertical padding (arrange R11 — LOW)

**Line 395**:

```
OLD:   padding: 20px 22px 22px;
NEW:   padding: 22px 22px 24px;
```

---

### 5. `static/css/components.css`

#### 5a. Reduce completion-strip padding (arrange R1 — HIGH)

**Lines 4-19** (`.completion-strip` rule):

```
OLD:   padding: 5px 8px;
NEW:   padding: 3px 6px;
```

Also change `gap`:

```
OLD:   gap: 3px;
NEW:   gap: 2px;
```

#### 5b. Increase strip-cell dimensions (arrange R7 — MEDIUM)

**Lines 21-43** (`.strip-cell` rule):

```
OLD:   min-width: 2.8rem;
      height: 24px;
NEW:   min-width: 3.2rem;
      height: 28px;
```

#### 5c. Reduce nav-button padding (arrange R1 — HIGH)

**Line 62**:

```
OLD:   padding: 10px 18px;
NEW:   padding: 8px 14px;
```

#### 5d. Fix `.subhead` font-weight (normalize R1 — HIGH)

**Line 919**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

#### 5e. Fix governance `.value` font-weight (normalize R1 — HIGH)

**Line 961**:

```
OLD:   font-weight: 800;
NEW:   font-weight: 700;
```

#### 5f. Reduce form-section bottom margin (arrange R3 — HIGH)

**Line 90**:

```
OLD:   margin: 0 0 16px;
NEW:   margin: 0 0 8px;
```

#### 5g. Remove TRUST principle section margin-bottom override (arrange R3 — HIGH)

**Lines 103-115**:

```
OLD:
.doc-section[data-section='tr'],
.doc-section[data-section='re'],
.doc-section[data-section='uc'],
.doc-section[data-section='se'],
.doc-section[data-section='tc'],
.form-section[data-section='tr'],
.form-section[data-section='re'],
.form-section[data-section='uc'],
.form-section[data-section='se'],
.form-section[data-section='tc'] {
  margin-bottom: 24px;
  padding: 22px 24px;
}
NEW:
.doc-section[data-section='tr'],
.doc-section[data-section='re'],
.doc-section[data-section='uc'],
.doc-section[data-section='se'],
.doc-section[data-section='tc'],
.form-section[data-section='tr'],
.form-section[data-section='re'],
.form-section[data-section='uc'],
.form-section[data-section='se'],
.form-section[data-section='tc'] {
  padding: 22px 24px;
}
```

#### 5h. Reduce section-kicker margin-bottom (arrange R8 — MEDIUM)

**Line 129**:

```
OLD:   margin-bottom: 14px;
NEW:   margin-bottom: 10px;
```

#### 5i. Increase h2 margin-bottom (arrange R8 — MEDIUM)

**Line 141**:

```
OLD:   margin: 0 0 10px;
NEW:   margin: 0 0 14px;
```

#### 5j. Increase field-grid gap (arrange R4 — MEDIUM)

**Line 274**:

```
OLD:   gap: 10px;
NEW:   gap: 14px;
```

#### 5k. Reduce criterion-card p margin-bottom (arrange R9 — MEDIUM)

**Line 563**:

```
OLD:   margin: 0 0 12px;
NEW:   margin: 0 0 8px;
```

#### 5l. Reduce criteria-stack margin-top (arrange R9 — MEDIUM)

**Line 571**:

```
OLD:   margin-top: 14px;
NEW:   margin-top: 10px;
```

#### 5m. Use `--ls-annotation` token on criterion-card::after (normalize R8 — LOW)

**Line 549**:

```
OLD:   letter-spacing: 0.04em;
NEW:   letter-spacing: var(--ls-annotation);
```

#### 5n. Use `--ls-annotation` token on evidence input labels (normalize R8 — LOW)

**Line 661**:

```
OLD:   letter-spacing: 0.04em;
NEW:   letter-spacing: var(--ls-annotation);
```

#### 5o. Increase evidence-button min-height to 44px (touch target — from w3-plan P2-01)

**Line 723**:

```
OLD:   min-height: 36px;
NEW:   min-height: 44px;
```

#### 5p. Increase context-link-button min-height to 44px (touch target — from w3-plan P2-01)

**Line 1234**:

```
OLD:   min-height: 32px;
NEW:   min-height: 44px;
```

#### 5q. Increase mock-control min-height to 44px (touch target — from w3-plan P2-01)

**Line 368**:

```
OLD:   min-height: 40px;
NEW:   min-height: 44px;
```

#### 5r. Increase pager-shell padding and gap (arrange R6 — MEDIUM)

**Lines 1348-1350**:

```
OLD:   gap: 10px;
      align-items: center;
      padding: 10px 12px;
NEW:   gap: 14px;
      align-items: center;
      padding: 12px 16px;
```

#### 5s. Increase pager-button padding (arrange R6 — MEDIUM)

**Line 1362**:

```
OLD:   padding: 9px 12px;
NEW:   padding: 10px 16px;
```

#### 5t. Reduce adjacent section margin-top (arrange R3 — HIGH)

**Line 967**:

```
OLD:   margin-top: 22px;
NEW:   margin-top: 16px;
```

#### 5u. Use `--lh-sub` token on reference-drawer-title (normalize R9 — LOW)

**Line 1447**:

```
OLD:   line-height: 1.3;
NEW:   line-height: var(--lh-sub);
```

#### 5v. Consistent reference-drawer-summary padding (arrange R12 — LOW)

**Line 1406**:

```
OLD:   padding: 10px 12px;
NEW:   padding: 12px;
```

#### 5w. Add text overflow safety to evidence-item-name (harden R11 — LOW)

**After line 840** (after `.evidence-item-name` closing brace):

```
OLD:
.evidence-item-name {
  font-size: var(--text-body);
  font-weight: 700;
}
NEW:
.evidence-item-name {
  font-size: var(--text-body);
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

---

### 6. `static/css/interaction-states.css`

#### 6a. Remove `border-left-width` from form-section transition (optimize R3 — MEDIUM)

**Lines 103-108**:

```
OLD:
.doc-section,
.form-section {
  transition:
    border-left-color var(--duration-fast) var(--ease-out-quart),
    border-left-width var(--duration-fast) var(--ease-out-quart),
    background var(--duration-fast) var(--ease-out-quart);
  opacity: 0;
NEW:
.doc-section,
.form-section {
  transition:
    border-left-color var(--duration-fast) var(--ease-out-quart),
    background var(--duration-fast) var(--ease-out-quart);
  opacity: 0;
```

#### 6b. Remove `border-left-width` from criterion-card transition (optimize R3 — MEDIUM)

**Lines 839-844**:

```
OLD:
.criterion-card {
  transition:
    border-left-width var(--duration-fast) var(--ease-out-quart),
    border-color var(--duration-fast) var(--ease-out-quart),
    box-shadow var(--duration-fast) var(--ease-out-quart);
}
NEW:
.criterion-card {
  transition:
    border-color var(--duration-fast) var(--ease-out-quart),
    box-shadow var(--duration-fast) var(--ease-out-quart);
}
```

#### 6c. Fix checkbox checked font-weight (normalize R4 — MEDIUM)

**Line 737**:

```
OLD:   font-weight: 500;
NEW:   font-weight: 700;
```

**Line 747**:

```
OLD:   font-weight: 500;
NEW:   font-weight: 700;
```

#### 6d. Add `.validation-message` style (harden R4 — HIGH, flagged as potentially deferred)

**After line 1170** (after the `.field-group[data-field-validation-state='blocked'] .display-tag` rule):

```
ADD:
.validation-message {
  color: var(--state-error);
  font-size: var(--text-sm);
  font-weight: 700;
  margin-top: 4px;
  font-family: var(--ff-mono);
}

.field-group[data-field-validation-state='attention'] .validation-message {
  color: var(--state-warning);
}
```

#### 6e. Use `--ls-label` token on governance `.value` (normalize R8 — LOW)

**Line 962**:

```
OLD:   letter-spacing: 0.02em;
NEW:   letter-spacing: var(--ls-label);
```

---

### 7. `static/css/animations.css`

#### 7a. Rewrite `ratingBorderConfirm` to avoid layout property (optimize R9 — MEDIUM)

**Lines 72-82**:

```
OLD:
@keyframes ratingBorderConfirm {
  0% {
    border-left-width: 2px;
  }
  40% {
    border-left-width: 5px;
  }
  100% {
    border-left-width: 3px;
  }
}
NEW:
@keyframes ratingBorderConfirm {
  0% {
    box-shadow: inset 4px 0 0 0 var(--ut-white);
  }
  40% {
    box-shadow: inset 6px 0 0 0 var(--section-accent-strong, var(--ut-navy));
  }
  100% {
    box-shadow: none;
  }
}
```

This produces a brief left-edge highlight pulse that's composited-only (no layout).

#### 7b. Add reduced-motion guard for ratingBorderConfirm (optimize R9 — MEDIUM)

**After line 103** (after the existing reduced-motion block closes):

```
ADD:
  .rating-option.is-just-selected {
    animation: none !important;
  }
```

---

### 8. `static/css/print.css`

#### 8a. Fix section-kicker font-weight (normalize R1 — HIGH)

**Line 122**:

```
OLD:     font-weight: 800;
NEW:     font-weight: 700;
```

---

### 9. `static/js/utils/focus-trap.js` (NEW FILE)

#### 9a. Create shared focus trap utility (harden R1/R2/R10 — HIGH)

Create `static/js/utils/focus-trap.js`:

```js
export const createFocusTrap = (container, { onEscape } = {}) => {
  let active = false;
  const handleKeydown = (event) => {
    if (!active) return;
    if (event.key === 'Tab') {
      event.preventDefault();
      const focusable = container.querySelectorAll(
        'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
        }
      }
    }
    if (event.key === 'Escape' && onEscape) {
      onEscape(event);
    }
  };
  return {
    activate() {
      if (active) return;
      active = true;
      container.addEventListener('keydown', handleKeydown);
    },
    deactivate() {
      active = false;
      container.removeEventListener('keydown', handleKeydown);
    },
    destroy() {
      deactivate();
    },
  };
};
```

---

### 10. `static/js/render/evidence.js`

#### 10a. Add focus trap to evidence lightbox (harden R1 — HIGH)

Import the focus trap at the top of the file:

```js
import { createFocusTrap } from '../utils/focus-trap.js';
```

Add a module-level variable near the top (with other module state):

```js
let lightboxFocusTrap = null;
```

In `openEvidenceLightbox` (after the line that focuses the close button, approximately line 934), activate the trap:

```js
if (lightboxFocusTrap) lightboxFocusTrap.deactivate();
lightboxFocusTrap = createFocusTrap(lightboxElement, {
  onEscape: (event) => {
    closeEvidenceLightbox();
  },
});
lightboxFocusTrap.activate();
```

In `closeEvidenceLightbox` (before the focus return, approximately line 951), deactivate:

```js
if (lightboxFocusTrap) {
  lightboxFocusTrap.deactivate();
  lightboxFocusTrap = null;
}
```

#### 10b. Improve evaluation-level evidence empty-state text (clarify R11 — LOW)

**Line 101**:

```
OLD:     return 'No evaluation-level evidence attached yet.';
NEW:     return 'No evaluation-level evidence attached yet. Add screenshots, exports, or supporting files using the intake form below.';
```

---

### 11. `static/js/behavior/navigation.js`

#### 11a. Add focus trap to About/Help overlay surfaces (harden R2 — HIGH)

Import the focus trap at the top of the file:

```js
import { createFocusTrap } from '../utils/focus-trap.js';
```

Add module-level variables:

```js
let surfaceFocusTrap = null;
```

In `setOverlaySurfaceOpen` (or `syncShellSurfaces`), when opening a surface (after the `requestAnimationFrame` that focuses the dismiss button, around line 795):

```js
if (surfaceFocusTrap) surfaceFocusTrap.deactivate();
const surfaceCard = element.querySelector('.surface-card');
if (surfaceCard) {
  surfaceFocusTrap = createFocusTrap(surfaceCard, {
    onEscape: () => {
      const surfaceName = element.id === 'aboutSurfaceMount' ? 'aboutSurface' : 'helpSurface';
      setShellSurfaceOpen(surfaceName, false, { trigger: null });
    },
  });
  requestAnimationFrame(() => surfaceFocusTrap.activate());
}
```

When closing (before the `requestAnimationFrame` that returns focus, around line 810):

```js
if (surfaceFocusTrap) {
  surfaceFocusTrap.deactivate();
  surfaceFocusTrap = null;
}
```

#### 11b. Add inert to About/Help surfaces when context drawer is open (harden R3 — MEDIUM)

In `syncShellSurfaces`, alongside the existing `inert`/`aria-hidden` logic for `dom.questionnairePanel` (approximately lines 586-593), add:

```js
if (contextDrawerOpen) {
  if (dom.aboutSurface) dom.aboutSurface.inert = true;
  if (dom.helpSurface) dom.helpSurface.inert = true;
} else {
  if (dom.aboutSurface) dom.aboutSurface.inert = false;
  if (dom.helpSurface) dom.helpSurface.inert = false;
}
```

---

### 12. `static/js/utils/confirm-dialog.js`

#### 12a. Add focus trap to confirm dialog (harden R10 — MEDIUM)

Import the focus trap:

```js
import { createFocusTrap } from './focus-trap.js';
```

In the `confirmDialog` function, after `confirmButton.focus()` (approximately line 146), add:

```js
const dialogFocusTrap = createFocusTrap(dialog, {
  onEscape: () => {
    resolve(false);
    teardown();
  },
});
dialogFocusTrap.activate();
```

In the `teardown` function (before removing the dialog from DOM, approximately line 114), add:

```js
if (dialogFocusTrap) {
  dialogFocusTrap.destroy();
}
```

Note: The `dialogFocusTrap` variable must be in scope for both the activate and teardown closures. Move the `const dialogFocusTrap` declaration to before both the activate call and the `teardown` function definition.

---

### 13. `static/js/render/help-panel.js`

#### 13a. Fix principle names in keyboard shortcuts (clarify R1 — HIGH)

**Lines 358-363**:

```
OLD:     ['Alt + 1', 'Jump to Transparent (TR)'],
      ['Alt + 2', 'Jump to Responsible (RE)'],
      ['Alt + 3', 'Jump to Understandable (UC)'],
      ['Alt + 4', 'Jump to Sustainable (SE)'],
      ['Alt + 5', 'Jump to Trustworthy Computing (TC)'],
NEW:     ['Alt + 1', 'Jump to Transparent (TR)'],
      ['Alt + 2', 'Jump to Reliable (RE)'],
      ['Alt + 3', 'Jump to User-centric (UC)'],
      ['Alt + 4', 'Jump to Secure (SE)'],
      ['Alt + 5', 'Jump to Traceable (TC)'],
```

#### 13b. Fix usage note "quick-jump" reference (clarify R4 — MEDIUM)

**Line 333**:

```
OLD: 'Use the page index for the authoritative full-questionnaire route; use TR/RE/UC/SE/TC as a fast quick-jump subset only.',
NEW: 'Use the page index for the authoritative full-questionnaire route; use the TR/RE/UC/SE/TC buttons in the header for fast principle navigation.',
```

#### 13c. Clarify letter shortcut descriptions (clarify R5 — MEDIUM)

**Lines 364-368**:

```
OLD:     ['Alt + t', 'Jump to page with code starting with T'],
      ['Alt + r', 'Jump to page with code starting with R'],
      ['Alt + u', 'Jump to page with code starting with U'],
      ['Alt + s', 'Jump to page with code starting with S'],
      ['Alt + c', 'Jump to page with code starting with C'],
NEW:     ['Alt + t', 'Jump to first page with code starting with T'],
      ['Alt + r', 'Jump to first page with code starting with R'],
      ['Alt + u', 'Jump to first page with code starting with U'],
      ['Alt + s', 'Jump to first page with code starting with S'],
      ['Alt + c', 'Jump to first page with code starting with C'],
```

---

### 14. `static/js/render/questionnaire-pages.js`

#### 14a. Fix "Condition active" tag text (clarify R6 — MEDIUM)

**Line 628**:

```
OLD:       text: fieldState?.required ? 'Condition active' : 'Conditional',
NEW:       text: fieldState?.required ? 'Required now' : 'Conditional',
```

#### 14b. Tighten section skip help text (clarify R9 — LOW)

**Line 47**:

```
OLD: const SECTION_SKIP_SCAFFOLD_HELP_TEXT = 'Section skip overrides child field dependencies and requiredness for this page, but both a skip reason and a substantive rationale are required.';
NEW: const SECTION_SKIP_SCAFFOLD_HELP_TEXT = 'Skipping a section overrides all child field requirements. Both a skip reason and rationale are required.';
```

#### 14c. Tighten criterion skip help text (clarify R10 — LOW)

**Line 48**:

```
OLD: const CRITERION_SKIP_SCAFFOLD_HELP_TEXT = 'Criterion skip is separate from a low or negative score. Use it only when the criterion cannot be assessed; both a skip reason and a substantive rationale are required, and criterion child fields stop contributing requiredness while the skip is active.';
NEW: const CRITERION_SKIP_SCAFFOLD_HELP_TEXT = 'Use criterion skip only when the criterion cannot be assessed — not as a substitute for a low score. Both a skip reason and rationale are required. Child fields become non-required while the skip is active.';
```

---

### 15. `static/js/render/sidebar.js`

#### 15a. Fix "Canonical page index" heading (clarify R13 — LOW)

**Line 889**:

```
OLD:     heading.textContent = 'Canonical page index';
NEW:     heading.textContent = 'Page index';
```

#### 15b. Fix "Context route" kicker (clarify R14 — LOW)

**Line 1055**:

```
OLD:     kicker.textContent = 'Context route';
NEW:     kicker.textContent = 'Current page';
```

#### 15c. Fix "Generated guidance" kicker (clarify R16 — LOW)

**Line 509**:

```
OLD:   kicker.textContent = 'Generated guidance';
NEW:   kicker.textContent = 'Page guidance';
```

---

### 16. `static/js/behavior/pager.js`

#### 16a. Fix "reviewed" → "completed" in completion message (clarify R17 — LOW)

**Line 135**:

```
OLD:         refs.status.textContent = `Evaluation complete — ${pagerState.pageOrder.length} sections reviewed`;
NEW:         refs.status.textContent = `Evaluation complete — ${pagerState.pageOrder.length} sections completed`;
```

---

## Implementation Order

### Batch 1: Trivial CSS + HTML text fixes (~15 min)

1. `trust-framework.html`: 1a (font import), 1b (aria-label), 1d (questionnaire caption), 1e (context caption), 1f (fallback text)
2. `tokens.css`: 2a (--ls-annotation), 2b (--border-accent tokens)
3. `base.css`: 3a (skip-link z-index)
4. `components.css`: 5d (subhead weight), 5e (governance weight)
5. `print.css`: 8a (kicker weight)
6. `interaction-states.css`: 6c (checkbox weight), 6e (governance ls)
7. Run `npm run validate:html && npm run test:e2e`

### Batch 2: Layout changes (~20 min)

8. `layout.css`: 4a (header-inner grid), 4b (brand), 4c (brand-logos), 4d (top-nav), 4e (--header-h), 4f (mobile --header-h)
9. `components.css`: 5a (strip padding), 5c (nav-button padding), 5f (section margin), 5g (principle margin override), 5h (kicker margin), 5i (h2 margin), 5j (field-grid gap), 5k/5l (criterion spacing), 5r/5s (pager), 5t (adjacent section margin), 5o/5p/5q (touch targets)
10. `layout.css`: 4g (remove backdrop-filter), 4i/4j (panel inner padding), 4k (surface-card)
11. `layout.css`: 4h (contain on framework-panel)
12. Run `npm run validate:html && npm run test:e2e`

### Batch 3: JS hardening (~30 min)

13. Create `static/js/utils/focus-trap.js` (9a)
14. `evidence.js`: 10a (lightbox focus trap), 10b (evidence empty-state text)
15. `navigation.js`: 11a (overlay focus trap), 11b (context drawer inert)
16. `confirm-dialog.js`: 12a (dialog focus trap)
17. Run `npm run test:e2e`

### Batch 4: UX copy + polish (~10 min)

18. `help-panel.js`: 13a (principle names), 13b (quick-jump reference), 13c (letter shortcuts)
19. `questionnaire-pages.js`: 14a (condition tag), 14b (section skip text), 14c (criterion skip text)
20. `sidebar.js`: 15a (page index heading), 15b (context route kicker), 15c (generated guidance)
21. `pager.js`: 16a (reviewed → completed)
22. `trust-framework.html`: 1c (skip-to-context link)
23. Run `npm run validate:html && npm run test:e2e`

### Batch 5: Performance + normalize (~10 min)

24. `interaction-states.css`: 6a (remove border-left-width transition), 6b (remove criterion-card border-left-width transition)
25. `animations.css`: 7a (rewrite ratingBorderConfirm), 7b (reduced-motion guard)
26. `components.css`: 5m/5n (--ls-annotation), 5u (--lh-sub), 5v (reference-drawer-summary padding), 5w (evidence-item-name overflow)
27. `components.css`: 5b (strip-cell size)
28. Run `npm run validate:html && npm run test:e2e`

### Batch 6: Validation messages (HIGH effort — defer if short on time)

29. `interaction-states.css`: 6d (.validation-message CSS)
30. `field-handlers.js`: Add validation message rendering logic in `syncFieldGroup`
31. `questionnaire-pages.js`: Wire `aria-describedby` to validation message IDs
32. Run `npm run test:e2e`

---

## Change Count Summary

| File                     | Changes                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trust-framework.html`   | 6 edits (font import, aria-label, skip link, 2 captions, fallback text)                                                                                       |
| `tokens.css`             | 2 additions (2 new tokens)                                                                                                                                    |
| `base.css`               | 1 edit (skip-link z-index)                                                                                                                                    |
| `layout.css`             | 11 edits (header grid, brand, top-nav, --header-h x2, backdrop-filter, contain, panel padding x2, surface-card)                                               |
| `components.css`         | 22 edits (strip, nav-button, font-weight x2, margins x5, gap, criterion spacing, tokens x3, touch targets x3, pager x2, reference-drawer, evidence-item-name) |
| `interaction-states.css` | 5 edits (transition removal x2, checkbox weight x2, ls token, validation-message)                                                                             |
| `animations.css`         | 2 edits (ratingBorderConfirm rewrite, reduced-motion guard)                                                                                                   |
| `print.css`              | 1 edit (kicker font-weight)                                                                                                                                   |
| `utils/focus-trap.js`    | 1 new file                                                                                                                                                    |
| `evidence.js`            | 2 edits (focus trap import+logic, empty-state text)                                                                                                           |
| `navigation.js`          | 2 edits (overlay focus trap, context drawer inert)                                                                                                            |
| `confirm-dialog.js`      | 1 edit (focus trap)                                                                                                                                           |
| `help-panel.js`          | 3 edits (principle names, quick-jump, letter shortcuts)                                                                                                       |
| `questionnaire-pages.js` | 3 edits (condition tag, section skip, criterion skip)                                                                                                         |
| `sidebar.js`             | 3 edits (heading, route kicker, generated guidance kicker)                                                                                                    |
| `pager.js`               | 1 edit (reviewed → completed)                                                                                                                                 |
| **Total**                | **~65 discrete edits across 16 files + 1 new file**                                                                                                           |

---

## Verification Checklist

After implementation:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. Grep: zero `font-weight: 800` in any CSS file
4. Grep: `Inter:wght@400;700` (no 800)
5. Grep: zero `backdrop-filter` in CSS
6. Grep: zero `border-left-width` in `transition` property lists (except `@starting-style` and print overrides)
7. Grep: zero `border-left-width` inside `@keyframes` (except print.css overrides)
8. Grep: zero `font-weight: 500` in screen CSS
9. Grep: zero `font-weight: 800` in screen CSS
10. Grep: zero `z-index: 50` in base.css (only in tokens.css)
11. Grep: `z-index: var(--z-skip-link)` in base.css (confirmed)
12. Visual: header brand zone is visually subordinate to action zone
13. Visual: header height reduced; panels fill more viewport
14. Visual: section spacing has consistent rhythm (8px bottom, 16px adjacent)
15. Visual: evidence lightbox traps focus (Tab cycles within dialog)
16. Visual: About/Help overlay traps focus
17. Visual: confirm dialog traps focus
18. Visual: surface overlay looks identical without backdrop-filter
19. Visual: rating selection shows brief visual pulse (box-shadow, not border-width)
20. Visual: strip cells are larger and more scannable
21. Visual: pager has more visual weight and presence
22. Visual: principle names in Help match TRUST framework
23. Visual: no "Canonical", "quick-jump", "route cards" jargon in user-facing text
24. Visual: "Required now" replaces "Condition active" on conditional fields
25. Visual: skip-to-context-panel link works
26. Visual: context panel inert blocks Tab to About/Help when drawer is open
27. Reduced-motion: no new animations break under `prefers-reduced-motion`
28. Accessibility: Tab into evidence lightbox → cannot Tab to page content behind it
29. Accessibility: Tab into About/Help → cannot Tab to page content behind it
30. Touch targets: evidence-button, context-link-button, mock-control all ≥ 44px min-height
