# Wave 4 Consolidated Findings

**Sources**: w3-audit.md (technical audit), w3-critique.md (design critique)
**Cross-reference**: w1-plan.md, w2-plan.md (already implemented)
**Date**: 2026-04-04
**Purpose**: Input document for Wave 4 audit agents (arrange, normalize, clarify, optimize, harden)

---

## Regression Analysis: Waves 1-2

The following findings from Waves 1-2 were either incompletely applied or have regressed:

| #   | Finding                                                           | Wave 1/2 Intent                                         | Current State      | Regression?                     |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------- | ------------------ | ------------------------------- |
| R1  | `font-weight: 800` in `components.css:919` (`.subhead`)           | W1 changed all 800→700                                  | Still 800          | **YES — missed in W1**          |
| R2  | `font-weight: 800` in `components.css:961` (governance `.value`)  | W1 changed all 800→700                                  | Still 800          | **YES — missed in W1**          |
| R3  | `font-weight: 800` in `print.css:122` (section kicker `::before`) | W1 changed all 800→700                                  | Still 800          | **YES — missed in W1**          |
| R4  | `Inter:wght@400;700;800` in HTML font import                      | W1 normalized weights to 700; 800 is unused             | Still requests 800 | **YES — incomplete**            |
| R5  | `z-index: 50` magic number on `.skip-link`                        | W1 promoted token usage throughout                      | Still hardcoded    | **NO — was never flagged**      |
| R6  | `backdrop-filter: blur(2px)` on `.shell-surface`                  | W2 deferred Overdrive R6 ("2px→4px barely perceptible") | Still present      | **NO — intentionally deferred** |

---

## All Findings by Severity

### P0 — Critical

None.

---

### P1 — Major

**[P1-01] Evidence lightbox missing focus trap**

- **Source**: w3-audit.md (P1)
- **Location**: `static/js/render/evidence.js` (lightbox open/close logic)
- **Category**: Accessibility (WCAG 2.1.1 Keyboard, WCAG 2.4.3 Focus Order)
- **Impact**: Users can Tab out of the lightbox into underlying page content. Screen reader users may lose orientation. No focus trap exists anywhere in the JS codebase (grep confirms zero matches for `focusTrap`/`focus.trap`).
- **Recommendation**: Implement a focus trap cycling Tab/Shift+Tab within the lightbox dialog. On open, move focus to the first focusable element or close button. On close, return focus to the triggering element. Extend existing `focusElementWithRetry` pattern from `navigation.js`.
- **Assigned skill**: `/harden`

**[P1-02] Header region visual competition**

- **Source**: w3-critique.md (P1)
- **Location**: `static/css/layout.css:12–85` (`.site-header`, `.header-inner`), `static/css/components.css:4–85` (`.completion-strip`, `.top-nav`)
- **Category**: Visual hierarchy / layout
- **Impact**: Three information zones (brand + completion strip + nav buttons) compete for attention at equal visual weight. The eye doesn't settle on a single focal point on first load. The `nav-indicator` red underline only activates on hover/active, not persistently on the current section.
- **Recommendation**: Differentiate brand zone (lower visual weight) from action zone (higher visual weight). Consider reducing completion strip border to a subtle divider. The `nav-indicator` should persist on the active item, not just on hover.
- **Assigned skill**: `/arrange`

**[P1-03] Keyboard shortcuts are undiscoverable**

- **Source**: w3-critique.md (P1)
- **Category**: UX writing / discoverability
- **Impact**: Alt+1–5 principle jumps, arrow keys on rating scales, and Escape-to-close exist but are documented only in the Help surface behind a button press. Power users (primary audience) won't find them. This is a recognition-over-recall failure against the stated design principle of "Keyboard-first efficiency."
- **Recommendation**: Add a subtle shortcut hint to the pager (e.g., "Alt+←/→") or a one-time dismissible hint showing available shortcuts. Do not add tooltips (contradicts "no tooltips" principle).
- **Assigned skill**: `/clarify`

---

### P2 — Minor

**[P2-01] Touch targets below 44px minimum (WCAG 2.5.5 AAA)**

- **Source**: w3-audit.md (P2)
- **Locations**:
  - `static/css/components.css:723` — `.evidence-button` (shared with `.evidence-remove-button`, `.evidence-lightbox-close`): `min-height: 36px`
  - `static/css/components.css:1234` — `.context-link-button`: `min-height: 32px`
  - `static/css/components.css:368` — `.mock-control`: `min-height: 40px`
  - `static/css/components.css:1162` — (unnamed selector, likely evidence-related): `min-height: 36px`
- **Category**: Accessibility / responsive
- **Impact**: These buttons are below the 44x44px minimum on touch devices. The app's audience primarily uses desktop, but the 1160px drawer breakpoint implies tablet consideration.
- **Recommendation**: Increase `min-height` to 44px for all four selectors. Use padding to fill space rather than increasing font size.
- **Assigned skill**: `/adapt`

**[P2-02] Residual `font-weight: 800` in screen CSS (Wave 1 regression)**

- **Source**: w3-audit.md (P2), w3-critique.md (P3)
- **Locations**:
  - `static/css/components.css:919` — `.subhead { font-weight: 800; }`
  - `static/css/components.css:961` — `.form-section[data-section='governance'] .mock-control:first-of-type .value { font-weight: 800; }`
- **Category**: Theming / consistency
- **Impact**: Inter loads 400 and 700 only (HTML line 9). Weight 800 doesn't exist in the loaded font, causing the browser to synthesize a fake bold that looks heavier and blurrier than true 700.
- **Recommendation**: Change both to `font-weight: 700`.
- **Assigned skill**: `/normalize`

**[P2-03] `font-weight: 800` in print.css (Wave 1 regression)**

- **Source**: w3-audit.md (P3), w3-critique.md (P2)
- **Location**: `static/css/print.css:122`
- **Category**: Theming / consistency
- **Impact**: Inconsistency with screen weight system. Print font availability may vary, but 800 is still outside the loaded Inter weights.
- **Recommendation**: Change to `font-weight: 700`. If print testing shows 700 is insufficient for kickers, document why.
- **Assigned skill**: `/normalize`

**[P2-04] Unused `font-weight: 800` in Google Fonts import (Wave 1 incomplete)**

- **Source**: w3-critique.md (P3)
- **Location**: `trust-framework.html:9`
- **Category**: Performance / consistency
- **Impact**: Requesting weight 800 adds ~15-20KB to the font download for a weight not used anywhere in screen CSS (and being removed from print in P2-03).
- **Recommendation**: Change `Inter:wght@400;700;800` to `Inter:wght@400;700`.
- **Assigned skill**: `/optimize`

**[P2-05] `backdrop-filter: blur(2px)` on surface overlays — vestigial performance cost**

- **Source**: w3-audit.md (P2), w3-critique.md (P3)
- **Location**: `static/css/layout.css:327–328` (`.shell-surface`)
- **Category**: Performance
- **Impact**: `backdrop-filter` triggers compositing on every frame. The 2px blur is imperceptible on an 88%-opaque overlay. This is the only `backdrop-filter` usage in the codebase. W2 deferred Overdrive R6 (increase to 4px) as "barely perceptible" — removal is the correct resolution.
- **Recommendation**: Remove both `backdrop-filter` and `-webkit-backdrop-filter`. The overlay color (`color-mix(in srgb, var(--ut-text) 88%, var(--ut-grey))`) is already nearly opaque.
- **Assigned skill**: `/optimize`

**[P2-06] Validation error messages lack visible CSS treatment**

- **Source**: w3-critique.md (P2)
- **Location**: `static/css/interaction-states.css:1134–1170` (`.field-group[data-field-validation-state]`)
- **Category**: Accessibility / UX (WCAG 1.4.1 — meaning not conveyed by color alone)
- **Impact**: Fields turn orange/red on validation failure, but no `.validation-message` or `.field-error` element/style exists (grep confirms zero matches). Users see color change but don't know what's wrong. The `.field-help` class is generic muted text with no error variant.
- **Recommendation**: Add a `.validation-message` element style with an icon prefix and specific error text. Ensure the message is associated with the field via `aria-describedby`. This requires both CSS (styling) and JS (rendering the message text from validation rules in `rules.js`).
- **Assigned skill**: `/harden`

**[P2-07] No visible save/auto-save indicator**

- **Source**: w3-critique.md (P2)
- **Location**: `static/css/layout.css` (no save indicator in header), `static/js/app.js` (no persistence behavior)
- **Category**: UX / trust
- **Impact**: Users filling out 132+ fields across 10+ pages have no visible confirmation that their work is persisted. Expert users may distrust the tool or duplicate work externally. Grep confirms zero references to save/autosave/persist in the JS behavior modules.
- **Recommendation**: Add a subtle save status indicator in the header (e.g., monospace status chip: "Saved" / "Unsaved changes"). This is primarily a UX architecture decision — the app currently has no persistence layer (`evidence-storage.js` is a placeholder), so this may require a broader design decision about persistence strategy.
- **Assigned skill**: `/harden` (UI indicator only; persistence architecture is out of scope)

---

### P3 — Polish

**[P3-01] Brand `min-width: 320px` may clip on very narrow viewports**

- **Source**: w3-audit.md (P3)
- **Location**: `static/css/layout.css:35` (`.brand`)
- **Category**: Responsive
- **Impact**: Below 320px viewport (extremely narrow phones), the brand bar may overflow.
- **Recommendation**: Add `min-width: 0` at the 760px breakpoint or use `overflow: hidden` on the brand flex container.
- **Assigned skill**: `/adapt`

**[P3-02] `.skip-link` z-index uses magic number instead of token**

- **Source**: w3-audit.md (P3)
- **Location**: `static/css/base.css:32` (`z-index: 50`)
- **Category**: Theming / consistency
- **Impact**: The value matches `--z-skip-link: 50` in tokens.css but bypasses the token. Zero functional impact.
- **Recommendation**: Change to `z-index: var(--z-skip-link)`.
- **Assigned skill**: `/normalize`

**[P3-03] Context drawer backdrop missing `inert` on shell surfaces**

- **Source**: w3-audit.md (P3)
- **Location**: `static/js/behavior/navigation.js:586–593`
- **Category**: Accessibility
- **Impact**: When the context drawer opens on narrow screens, the questionnaire panel correctly gets `inert` + `aria-hidden`. But the about/help surfaces are not similarly blocked — keyboard users could potentially interact with them. The backdrop click-to-dismiss mitigates this in practice.
- **Recommendation**: Also set `inert` on `.about-surface` and `.help-surface` elements when the context drawer is open.
- **Assigned skill**: `/harden`

**[P3-04] `.panel-caption` contains implementation language, not user guidance**

- **Source**: w3-critique.md (Minor Observation 1)
- **Locations**:
  - `trust-framework.html:72` — "The questionnaire is the primary surface. The page index and pager govern movement, reference drawers stay above the form, and framework background remains in the Info surface."
  - `trust-framework.html:292` — "Active-page guidance lives here. Generic scoring and evidence references stay in drawers; framework background and governance stay in the Info surface. On narrow screens this panel becomes a dismissible drawer."
- **Category**: UX writing
- **Impact**: Developer-facing documentation leaked into the UI. Domain expert users (Morgan persona) don't need to know about "reference drawers staying above the form."
- **Recommendation**: Replace with user-facing guidance or remove entirely. If kept, describe what the user can do, not how the software is structured.
- **Assigned skill**: `/clarify`

**[P3-05] Rating scale dot is 16px — below touch target minimum**

- **Source**: w3-critique.md (Minor Observation 2)
- **Location**: `.rating-dot` (CSS)
- **Category**: Responsive / accessibility
- **Impact**: 16px with 2px border = 16px effective interactive target, well below 44px. Acceptable for desktop-primary audience.
- **Recommendation**: Consider adding invisible padding to expand the touch target without changing visual size.
- **Assigned skill**: `/adapt`

**[P3-06] `nav-indicator` has no ARIA association**

- **Source**: w3-critique.md (Sam persona red flag)
- **Location**: `.nav-indicator` (CSS)
- **Category**: Accessibility
- **Impact**: The red underline indicator is purely visual. Screen readers won't perceive which nav button is "active" from the indicator. However, the `.active` class on `.nav-button` may provide semantic state — verify `aria-current` is set.
- **Recommendation**: Verify that `aria-current="page"` or equivalent is set on the active nav button. If not, add it in `navigation.js`.
- **Assigned skill**: `/harden`

**[P3-07] No skip-to-context-panel link**

- **Source**: w3-critique.md (Sam persona red flag)
- **Location**: `trust-framework.html` (skip links)
- **Category**: Accessibility
- **Impact**: The skip-link goes to `#questionnairePanel` but there's no equivalent for the context panel (the secondary content area).
- **Recommendation**: Add a second skip link targeting `#contextPanel` (or similar), visible after the first skip link.
- **Assigned skill**: `/harden`

**[P3-08] No Alt+←/→ pager navigation shortcut**

- **Source**: w3-critique.md (Alex persona red flag)
- **Location**: `static/js/behavior/keyboard.js`
- **Category**: Efficiency / keyboard accessibility
- **Impact**: Alt+1–5 exists for principle jumps, but no keyboard shortcut for pager prev/next. This is a gap in "Keyboard-first efficiency."
- **Recommendation**: Add Alt+Left/Alt+Right bindings for prev/next page in `keyboard.js`. Guard with same Alt-key detection logic used by existing shortcuts.
- **Assigned skill**: `/harden`

**[P3-09] No keyboard shortcut to toggle context panel**

- **Source**: w3-critique.md (Alex persona red flag)
- **Location**: `static/js/behavior/keyboard.js`
- **Category**: Efficiency
- **Impact**: Power users who want to maximize form width have no shortcut to toggle the context panel — only the Context button.
- **Recommendation**: Consider adding a shortcut (e.g., Alt+C or similar) to toggle the context panel open/closed.
- **Assigned skill**: `/harden`

**[P3-10] Completion strip requires hover to see section detail**

- **Source**: w3-critique.md (Alex persona red flag)
- **Location**: `.completion-strip`, `.strip-cell` (CSS)
- **Category**: Information architecture
- **Impact**: On a 12-section evaluation, scanning for incomplete sections requires individual hover over each strip cell.
- **Recommendation**: Consider showing section code text always (not just on hover) or adding a status summary chip that lists incomplete section codes.
- **Assigned skill**: `/arrange`

---

## Skill Assignment Matrix

| Skill        | Findings                                               | Total | Primary Focus                                                             |
| ------------ | ------------------------------------------------------ | ----- | ------------------------------------------------------------------------- |
| `/harden`    | P1-01, P2-06, P2-07, P3-03, P3-06, P3-07, P3-08, P3-09 | 8     | Focus trap, validation messages, save indicator, ARIA, keyboard shortcuts |
| `/arrange`   | P1-02, P3-10                                           | 2     | Header visual hierarchy, completion strip                                 |
| `/clarify`   | P1-03, P3-04                                           | 2     | Shortcut discoverability, panel-caption copy                              |
| `/adapt`     | P2-01, P3-01, P3-05                                    | 3     | Touch targets, narrow viewport, rating dot                                |
| `/normalize` | P2-02, P2-03, P3-02                                    | 3     | font-weight 800 cleanup, z-index token                                    |
| `/optimize`  | P2-04, P2-05                                           | 2     | Font weight removal, backdrop-filter removal                              |

---

## Deferred to Wave 5 (Polish / Adapt)

| #   | Finding                                                     | Reason for Deferral                                                                            |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D1  | No undo for individual field changes                        | Requires state management architecture change (undo stack) — beyond polish scope               |
| D2  | No form-level draft recovery                                | Requires persistence layer (currently placeholder) — depends on P2-07 persistence decision     |
| D3  | No batch operations or jump-to-first-incomplete             | Feature addition, not polish — needs product decision                                          |
| D4  | Header height 138px on 1080p screens                        | May be partially resolved by P1-02 (header arrange); full optimization depends on that outcome |
| D5  | No field-level character/word count for textareas           | Nice-to-have UX enhancement — low impact                                                       |
| D6  | Evidence intake grid 3-column compression                   | Already collapses at 760px; no other breakpoint planned per CLAUDE.md                          |
| D7  | `nav-indicator` persistent active state                     | Depends on P1-02 (header arrange) outcome                                                      |
| D8  | Stronger completion/progress satisfaction moments           | Emotional resonance gap — better suited for `/delight` pass in Wave 5                          |
| D9  | `in_progress` vs `complete` strip-cell states rely on color | Low-impact; text color changes provide some non-color differentiation                          |

---

## Priority Ranking (Impact × Effort)

High-impact, low-effort fixes should be executed first:

| Rank | Finding                                                      | Severity | Effort      | Rationale                                                                                                                       |
| ---- | ------------------------------------------------------------ | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **P2-02 + P2-03 + P2-04** — font-weight 800 cleanup          | P2       | Trivial     | 3 CSS line changes + 1 HTML line change. Fixes Wave 1 regressions. Immediate visual improvement.                                |
| 2    | **P2-05** — Remove backdrop-filter                           | P2       | Trivial     | Delete 2 CSS lines. Free performance win. Zero visual impact (2px blur imperceptible).                                          |
| 3    | **P1-01** — Evidence lightbox focus trap                     | P1       | Medium      | Highest-severity accessibility issue. Requires new JS module or function. Pattern exists in codebase (`focusElementWithRetry`). |
| 4    | **P3-02** — skip-link z-index token                          | P3       | Trivial     | 1-line change. Token consistency. Batch with P2-02/P2-03.                                                                       |
| 5    | **P1-02** — Header visual hierarchy                          | P1       | Medium      | Largest layout change. Requires careful CSS work to differentiate brand from action zones without breaking existing layout.     |
| 6    | **P2-06** — Validation error messages                        | P2       | Medium-High | Requires both CSS styling and JS rendering logic. Addresses WCAG 1.4.1 (meaning not by color alone).                            |
| 7    | **P2-01** — Touch target sizes                               | P2       | Low         | 4 CSS `min-height` changes. May require visual adjustment of padding.                                                           |
| 8    | **P1-03** — Keyboard shortcut discoverability                | P1       | Low-Medium  | Small UI addition (hint text). Design decision needed on placement and dismissibility.                                          |
| 9    | **P3-04** — panel-caption copy                               | P3       | Trivial     | 2 HTML text changes. Quick win for UX writing.                                                                                  |
| 10   | **P3-03** — Context drawer inert on surfaces                 | P3       | Low         | Small JS change in navigation.js.                                                                                               |
| 11   | **P3-06 + P3-07** — ARIA current + skip-to-context           | P3       | Low         | Accessibility improvements. Verify aria-current; add skip link.                                                                 |
| 12   | **P3-08 + P3-09** — Pager + context panel keyboard shortcuts | P3       | Low         | Add bindings to keyboard.js.                                                                                                    |
| 13   | **P2-07** — Save indicator                                   | P2       | Medium      | UI indicator is straightforward, but persistence strategy decision is prerequisite.                                             |
| 14   | **P3-01** — Brand min-width on narrow viewports              | P3       | Trivial     | Edge case (below 320px). Low priority.                                                                                          |
| 15   | **P3-05** — Rating dot touch target                          | P3       | Low         | Desktop-primary audience.                                                                                                       |
| 16   | **P3-10** — Completion strip hover detail                    | P3       | Medium      | Design decision needed.                                                                                                         |

---

## Recommended Execution Order for Wave 4

### Batch 1: Trivial CSS fixes (normalize + optimize)

All are single-line or few-line changes with zero risk of regression:

- P2-02: `.subhead` font-weight 800→700
- P2-02: governance `.value` font-weight 800→700
- P2-03: print.css font-weight 800→700
- P2-04: Remove 800 from Google Fonts import
- P3-02: `.skip-link` z-index → token
- P2-05: Remove `backdrop-filter` from `.shell-surface`

### Batch 2: Accessibility hardening (harden)

- P1-01: Evidence lightbox focus trap
- P3-03: Context drawer inert on surfaces
- P3-06: Verify/add `aria-current` on active nav
- P3-07: Add skip-to-context-panel link
- P3-08: Add Alt+←/→ pager shortcuts
- P3-09: Add context panel toggle shortcut

### Batch 3: Layout and hierarchy (arrange)

- P1-02: Header region visual differentiation
- P3-10: Completion strip scanability (if time permits)

### Batch 4: UX copy and discoverability (clarify)

- P1-03: Keyboard shortcut hints
- P3-04: Replace panel-caption implementation language

### Batch 5: Touch targets (adapt)

- P2-01: Increase min-height to 44px on 4 selectors
- P3-01: Brand min-width on narrow viewports
- P3-05: Rating dot touch target padding

### Batch 6: Validation UX (harden — if time permits)

- P2-06: Add `.validation-message` CSS + JS rendering
- P2-07: Save status indicator (UI only)

---

## Verification Checklist

After Wave 4 implementation:

1. `npm run validate:html` — no regressions
2. `npm run test:e2e` — all 5 suites pass
3. Grep: zero `font-weight: 800` in screen CSS
4. Grep: `Inter:wght@400;700` (no 800)
5. Grep: zero `backdrop-filter` in CSS
6. Visual: evidence lightbox traps focus (Tab cycles within dialog)
7. Visual: header brand zone is visually subordinate to action zone
8. Visual: keyboard shortcut hint visible in pager area
9. Visual: `.evidence-button`, `.context-link-button`, `.mock-control` all ≥44px min-height
10. Accessibility: Tab into evidence lightbox → cannot Tab to page content behind it
11. Accessibility: Skip link still works; new skip-to-context link works
12. Accessibility: Alt+←/→ navigates pager prev/next
13. Reduced-motion: no new animations break under `prefers-reduced-motion`
