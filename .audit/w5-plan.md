# Wave 5 — Final Wave Unified Implementation Plan

**Sources:** w5-polish.md (16 recommendations), w5-adapt.md (10 recommendations)
**Cross-reference:** w3-audit.md, w3-critique.md (context on prior-wave fixes)
**Date:** 2026-04-05
**Scope:** FINAL wave. HIGH + MEDIUM + trivially-easy LOW. No structural changes. No new breakpoints.

---

## Conflict Resolution

| Conflict                 | Polish                                    | Adapt                      | Resolution                                      |
| ------------------------ | ----------------------------------------- | -------------------------- | ----------------------------------------------- |
| `.pager-button`          | R4: add `border-radius: var(--radius-md)` | R3: add `min-height: 44px` | Merge both into one edit on the same rule block |
| `.context-anchor-button` | —                                         | R5: add `min-height: 44px` | No conflict — adapt only                        |
| `.sidebar-tab`           | —                                         | R2: add `min-height: 44px` | No conflict — adapt only                        |
| `.evidence-file-button`  | —                                         | R1: add `min-height: 44px` | No conflict — adapt only                        |
| Tooltip button radius    | R7: change to square                      | —                          | No conflict — polish only                       |

---

## Items Already Fixed in Prior Waves (DO NOT RE-DO)

These are confirmed present in the current codebase per source-file verification:

- Header grid restructure (W4)
- Header height 118px token + 168px at 760px (W4)
- Evidence button/context button touch targets at 44px (W4)
- Field-grid single-column at 760px (W4 — `components.css:1150-1152`)
- Score-table horizontal scroll at 760px (W4 — `components.css:1154-1158`)
- Print `size: A4` (W4 — `print.css:7`)
- Header inner padding 18px at 1160px (W4 — `layout.css:545-547`)
- Validation messages (W4)
- Skip-to-content links (W4)
- Z-index token compliance in layout.css (W4)
- Tooltip timing tokenized (W4)
- Evidence lightbox z-index tokenized (W4)
- `.pager-shell` box-shadow removed (prior wave)
- `ul, ol` spacing tokenized (prior wave — polish R9 from old plan)
- Pager `:active` state (prior wave)
- `@page { size: A4 }` (prior wave)

---

## Implementation Changes — By File

### 1. `static/css/components.css` (12 edits)

#### 1a. Delete duplicate `.evidence-intake-grid` rule [Polish R1 — HIGH]

Lines 664–668 contain a dead `.evidence-intake-grid` block overridden by the second block at 670–675. Delete lines 664–668. Then update the remaining block (now at the former 670 position) to use tokenized gap:

```
BEFORE (line 673):
  gap: 10px;

AFTER:
  gap: var(--space-2) var(--space-3);
```

This replaces the off-scale `10px` with `8px` rows / `12px` columns from the spacing token system.

#### 1b. Remove `.criterion-card` margin-top [Polish R2 — HIGH]

```
BEFORE (line 566):
  margin-top: 18px;

AFTER:
  margin-top: 0;
```

Criterion cards are always rendered inside `.criteria-stack` (confirmed: `questionnaire-pages.js:1470`), which provides `gap: 18px`. The 18px margin + 18px gap = 36px between cards is excessive. First card also got asymmetric 18px top spacing.

#### 1c. Add overflow handling to `.mock-control .value` [Polish R3 — HIGH]

```
BEFORE (lines 415-418):
.mock-control .value {
  color: var(--ut-text);
  font-weight: 700;
}

AFTER:
.mock-control .value {
  color: var(--ut-text);
  font-weight: 700;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;
}
```

Also add to `.mock-control .arrow` (line 420–424):

```
ADD inside .mock-control .arrow:
  flex: 0 0 auto;
```

Prevents long tool names from pushing the arrow indicator off-screen.

#### 1d. Add `min-height: 44px` to `.evidence-file-button` [Adapt R1 — HIGH]

```
ADD to .evidence-file-button rule (line 713):
  min-height: 44px;
```

Current `padding: 4px 10px` yields ~22px effective height — below WCAG 44px minimum. Sibling evidence buttons were already fixed in W4; this one was missed.

#### 1e. Add `min-height: 44px` + `border-radius` to `.pager-button` [Adapt R3 MEDIUM + Polish R4 MEDIUM]

```
ADD to .pager-button rule (line 1520):
  min-height: 44px;
  border-radius: var(--radius-md);
```

Merges adapt touch-target fix with polish border-radius consistency. Both are single-property additions to the same rule block.

#### 1f. Add `min-height: 44px` to `.context-anchor-button` [Adapt R5 — MEDIUM]

```
ADD to .context-anchor-button rule (line 1437):
  min-height: 44px;
```

These anchor buttons are the primary navigation within the context drawer on touch screens (760–1160px).

#### 1g. Add `.notice.info` variant [Polish R15 — MEDIUM]

After `.notice` rule block (after line 1014), add:

```css
.notice.info {
  border-left-color: var(--state-info);
  background: color-mix(in srgb, var(--state-info) 14%, var(--ut-white));
  border-top-color: var(--state-info-border);
  border-right-color: var(--state-info-border);
  border-bottom-color: var(--state-info-border);
}
```

Uses existing `--state-info`, `--state-info-border` tokens from `tokens.css:177-179`.

#### 1h. Tokenize `scroll-margin-top` [Polish R9 — LOW, trivial]

```
BEFORE (line 92):
  scroll-margin-top: 22px;

AFTER:
  scroll-margin-top: var(--space-5-5);
```

`--space-5-5: 22px` exists in tokens.css. Zero visual change.

#### 1i. Fix non-principle kicker tint [Polish R10 — LOW, trivial]

```
BEFORE (line 123):
  background: color-mix(in srgb, var(--ut-navy) 6%, var(--ut-white));

AFTER:
  background: color-mix(in srgb, var(--ut-navy) 10%, var(--ut-white));
```

Matches principle kicker tint percentage. Makes S0/S1/S2/S8/S9 kickers visible instead of nearly invisible.

#### 1j. Change tooltip button to square [Polish R7 — LOW, easy]

```
BEFORE (line 1057):
  border-radius: 50%;

AFTER:
  border-radius: var(--radius-md);
```

Only circular element in the entire interface. Contradicts "sharp and rational" direction. 44x44px touch target preserved. Tooltip positioning (`left: 50%; transform: translateX(-50%)`) unaffected.

#### 1k. Add `min-height: 44px` to `.reference-drawer-summary` [Adapt R8 — LOW, trivial]

```
ADD to .reference-drawer-summary rule (line 1566):
  min-height: 44px;
```

Clickable `<summary>` disclosure widgets at ~36px are below the 44px minimum.

---

### 2. `static/css/layout.css` (3 edits)

#### 2a. Tokenize `.questionnaire-shell` gap [Polish R6 — MEDIUM]

```
BEFORE (line 338):
  gap: 24px;

AFTER:
  gap: var(--space-6);
```

`--space-6: 24px` in tokens.css. Zero visual change — pure tokenization.

#### 2b. Widen `.panel-caption` max-width [Polish R5 — MEDIUM]

```
BEFORE (line 333):
  max-width: 44ch;

AFTER:
  max-width: 72ch;
```

44ch creates a narrow orphaned paragraph below the full-width panel title. 72ch matches the `.doc-section p, .form-section p` constraint in base.css.

#### 2c. Add `min-height: 44px` to `.sidebar-tab` [Adapt R2 — HIGH]

```
ADD to .sidebar-tab rule (line 395):
  min-height: 44px;
```

Tab bar uses `display: flex; align-items: stretch` so tabs share the new height. Tab indicator (`layout.css:426-438`) uses absolute positioning and adjusts naturally. Critical in drawer mode on tablets (768–1160px).

---

### 3. `static/css/interaction-states.css` (1 edit)

#### 3a. Change skipped opacity to be noticeable [Polish R13 — LOW, trivial]

```
BEFORE (line 1443):
  opacity: 0.9;

AFTER:
  opacity: 0.75;
```

Current 0.9 is visually imperceptible on a light background. The dashed border provides primary differentiation; 0.75 opacity reinforces it. Users can now quickly scan for active vs. skipped sections.

---

### 4. `trust-framework.html` (3 edits)

#### 4a. Fix context empty-state heading [Polish R8 — MEDIUM]

```
BEFORE (line 107):
  <h2 id="contextSidebarFallbackTitle">Context route ready</h2>

AFTER:
  <h2 id="contextSidebarFallbackTitle">Context guidance</h2>
```

"Context route" is internal terminology. The heading is the first thing screen readers announce when the context panel loads. No JS references depend on the heading text — `sidebar.js:287` queries `#contextSidebarFallback`, not the title text content.

#### 4b. Add `.info` class to informational notice [Polish R15 — MEDIUM]

```
BEFORE (line 495):
  <div class="notice">Operational additions in version 2 include...</div>

AFTER:
  <div class="notice info">Operational additions in version 2 include...</div>
```

This notice is informational, not an error. The critical-fail notice at line 411 stays as default (error-red styling).

#### 4c. Remove vestigial `.brand-text` wrapper [Polish R14 — LOW, trivial]

```
BEFORE (lines 33-40):
  <div class="brand-text">
    <div class="brand-logos">
      ...
    </div>
  </div>

AFTER:
  <div class="brand-logos">
    ...
  </div>
```

No CSS rules target `.brand-text`. The wrapper adds unnecessary DOM depth. `.brand-logos` becomes a direct child of `.brand`. No visual change.

---

## DEFERRED

| Item                                 | Source     | Priority | Reason                                                                                                                                                    |
| ------------------------------------ | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--header-h` adjustment at 760–900px | Adapt R4   | MEDIUM   | Risk of introducing layout bugs in final wave. Current 118px correct for 900–1160px. 760px override (168px) handles the tight range. Monitor post-launch. |
| Context button `:active` states      | Polish R11 | LOW      | Seven selector additions for marginal improvement. No visual breakage currently.                                                                          |
| Drawer-mode `▸` indicator at 1160px  | Adapt R7   | LOW      | UX enhancement. `aria-label` already updates for screen readers (navigation.js). Visual indicator is refinement, not fix.                                 |
| Help section grid collapse at 1160px | Adapt R10  | LOW      | Content is legible. Adding sub-breakpoint contradicts single-breakpoint constraint.                                                                       |
| Field-group border-width transition  | Polish R12 | LOW      | Audit recommends leaving as-is. The instant 2px jump is intentional "engineered" feedback.                                                                |

---

## Execution Order

Changes are independent within each batch. Run tests between batches for safety.

### Batch 1 — `components.css` (most edits, single file)

1. Delete duplicate `.evidence-intake-grid` (lines 664–668) + tokenize gap
2. Remove `.criterion-card` margin-top (line 566)
3. Add overflow to `.mock-control .value` + `.arrow` (lines 415–424)
4. Add min-height to `.evidence-file-button` (line 713)
5. Add min-height + border-radius to `.pager-button` (line 1520)
6. Add min-height to `.context-anchor-button` (line 1437)
7. Add `.notice.info` variant (after line 1014)
8. Tokenize scroll-margin-top (line 92)
9. Fix kicker tint (line 123)
10. Change tooltip button radius (line 1057)
11. Add min-height to `.reference-drawer-summary` (line 1566)

### Batch 2 — `layout.css` + `interaction-states.css`

1. Tokenize `.questionnaire-shell` gap (layout.css line 338)
2. Widen `.panel-caption` max-width (layout.css line 333)
3. Add min-height to `.sidebar-tab` (layout.css line 395)
4. Change skipped opacity (interaction-states.css line 1443)

### Batch 3 — `trust-framework.html`

1. Fix context heading (line 107)
2. Add `.info` class to notice (line 495)
3. Remove `.brand-text` wrapper (lines 33, 40)

---

## Verification Checklist

After all changes:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. Grep: only one `.evidence-intake-grid` rule in components.css
4. Grep: `.criterion-card` has `margin-top: 0`
5. Grep: `.mock-control .value` has `overflow: hidden; text-overflow: ellipsis`
6. Grep: `min-height: 44px` on `.evidence-file-button`, `.pager-button`, `.context-anchor-button`, `.sidebar-tab`, `.reference-drawer-summary`
7. Grep: `border-radius: var(--radius-md)` on `.pager-button` and `.tooltip-trigger-btn`
8. Grep: `.notice.info` variant exists in components.css
9. Grep: `gap: var(--space-6)` on `.questionnaire-shell`
10. Grep: `max-width: 72ch` on `.panel-caption`
11. Grep: `opacity: 0.75` on skipped form-section rule
12. Grep: "Context guidance" (not "Context route ready") in trust-framework.html
13. Grep: `class="notice info"` on informational notice
14. Grep: `.brand-text` no longer present in trust-framework.html
15. Visual: criterion cards have 18px spacing (not 36px)
16. Visual: tooltip button is square with 2px radius
17. Visual: non-principle kickers are visible (10% tint, not invisible 6%)
18. Visual: informational notice uses blue info styling (not red)
19. Visual: resize to 1160px — sidebar tabs are 44px tall
20. Visual: resize to 760px — pager buttons are 44px tall

---

## Change Count

| File                     | Edits                                |
| ------------------------ | ------------------------------------ |
| `components.css`         | 11                                   |
| `layout.css`             | 3                                    |
| `interaction-states.css` | 1                                    |
| `trust-framework.html`   | 3                                    |
| **Total**                | **18 discrete edits across 4 files** |

All edits are additive or single-property changes. Zero structural changes. Zero JS changes. Zero new breakpoints. Zero risk of regressions.

---

_End of Wave 5 Final Implementation Plan_
