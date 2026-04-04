# Full Codebase Critique Report

**Date:** 2026-04-04
**Scope:** 24 JS modules, 6 CSS files, 1 HTML file, 5 test suites, ~20 docs
**Method:** 5 parallel analysis agents — JS State/Config, JS Behavior/Render, CSS/HTML, Testing/Quality, Architecture/Docs

---

## Critical (2)

| # | Area | Issue |
|---|------|-------|
| C1 | `store.js:1189` | **Stale closure in `toggleSurface`** — reads outer `state` variable instead of operating inside `commit()`, creating a TOCTOU race. Rapid toggles or subscriber-triggered actions can produce wrong values. |
| C2 | `store.js:1209` | **Same bug in `toggleReferenceDrawer`** — identical stale-closure pattern. |

## High (16)

### Performance (5)

| # | Area | Issue |
|---|------|-------|
| H1 | `field-handlers.js:796` | **Full DOM rescan on every keystroke** — `querySelectorAll('.field-group')` + `syncFieldGroup` for all ~135 fields on every state change. Thousands of DOM reads per input event. |
| H2 | `derive.js:2283` | **Full derivation tree recomputed every state change** — 14 derived-state functions re-run on every commit. No dirty-checking or selective recomputation. UI-only changes (panel metrics) trigger the full 135-field pass. |
| H3 | `sidebar.js:1305` | **Full sidebar DOM rebuild on every state change** — destroys and recreates ~13 pages worth of DOM nodes each time. |
| H4 | `help-panel.js:160` | **Help panel rebuilds full DOM even when hidden** — `sync()` calls `render()` unconditionally. |
| H5 | `navigation.js:938` | **MutationObserver with no debounce** — watches `childList`+`subtree` on render root; sync operations that create DOM elements (progress badges) re-trigger the observer recursively. |

### Correctness & Safety (4)

| # | Area | Issue |
|---|------|-------|
| H6 | `store.js:616` | **`removeEvidenceAssetAssociations` mutates its argument** — violates immutability convention. Safe today because caller clones first, but latent bug for future contributors. |
| H7 | `store.js:725` | **Throwing subscriber breaks all subsequent subscribers** — no try/catch in `notify()`. One bad listener leaves partial UI. |
| H8 | `store.js:273` vs `derive.js:95` | **Duplicated `normalizeDelimitedList` with divergent behavior** — store version coerces non-strings; derive version passes them through. Write-path vs read-path inconsistency. |
| H9 | `evidence.js:1006` | **Expando property on DOM element** for focus return (`lightbox._returnFocusTarget`) — memory leak risk, violates DOM best practice. |

### Architecture (3)

| # | Area | Issue |
|---|------|-------|
| H10 | Multiple | **42+ duplicated utility functions** across codebase — `toArray` (x6), `getDocumentRef` (x10), `isPlainObject` (x6), `freezeArray` (x5), `inferMimeTypeFromName` (x3), `extractEvidenceItems` (x4). Any bug fix must be replicated across all copies. |
| H11 | Multiple | **Evidence logic triplicated** — `inferMimeTypeFromName`, `extractEvidenceItems`, `normalizeTextValue`, `normalizeEvidenceItem` all duplicated across `store.js`, `evidence.js`, `evidence-storage.js` with subtly different implementations. |
| H12 | `navigation.js` (969 lines) | **God-object scope** — page visibility, surface management, progress decorations, panel metrics, sub-system orchestration all in one file. 7+ distinct concerns. |

### CSS/HTML (4)

| # | Area | Issue |
|---|------|-------|
| H13 | `states.css:25-358` | **187 selectors maintained in lockstep** — section accent resolution repeats identical 5-property block 11 times. Any new component class requires updating all 11 blocks. |
| H14 | `base.css:20` | **`body { overflow: hidden }` without JS fallback** — if JS fails to load, user cannot scroll at all. Should be progressively enhanced. |
| H15 | HTML | **No `<form>` element wrapping questionnaire** — no form submission, no HTML5 validation, no form landmark for assistive tech. |
| H16 | HTML | **Heading hierarchy violations** — `h1` → `h3` skips, `<section>` landmarks lack `aria-labelledby`, `aria-expanded="true"` hardcoded even when drawer is hidden. |

## Medium (28)

| # | Area | Issue |
|---|------|-------|
| M1 | `derive.js:1606` | Double iteration of 135 fields when cross-field validations included (270 iterations per state change) |
| M2 | `navigation.js` + `field-handlers.js` | Dual redundant subscriptions — both touch same DOM elements, double DOM writes per state change |
| M3 | `field-handlers.js:234` | `animationend` listener may never fire if CSS animation disabled (reduced-motion) — class stuck forever |
| M4 | `navigation.js:438` | Forced reflow with `void incoming.offsetHeight` during page transitions |
| M5 | `navigation.js:320` | `setTimeout` for focus with no cleanup guard — fires after `destroy()` |
| M6 | `navigation.js:219` | `lastSurfaceTriggers` Map retains HTMLElement references, preventing GC |
| M7 | `derive.js:1248` | Hardcoded `['SE1', 'SE2']` for privacy check breaks data-driven pattern |
| M8 | `derive.js:772` | Dead code: `Date instanceof` check unreachable (store normalizes dates to strings) |
| M9 | `store.js:112` | `Math.random()` fallback for evidence IDs — collision risk in fast operations |
| M10 | `store.js:1110` | No bounds validation on visibility ratios |
| M11 | Multiple files | `PRINCIPLE_PAGE_IDS` hard-coded in 4 locations with mixed raw strings vs constants |
| M12 | `tokens.css` | Missing token categories: no spacing scale, no shadow tokens, no z-index scale |
| M13 | `tokens.css` vs `states.css` | Duplicated hardcoded color values (e.g., `#c2410c` in two places) |
| M14 | `layout.css:193` vs `:456` | Two competing media query blocks at 1160px — first block's `.panel` rule is dead code |
| M15 | `states.css:496` vs `:854` | Redundant legacy selectors compete with token-driven selectors — fragile ordering dependency |
| M16 | `states.css:1159` | `.rating-option.selected` defaults to score-2 colors when no `.score-N` class present |
| M17 | `print.css:107-145` | Five near-identical section prefix blocks — should be one shared rule |
| M18 | HTML | `aria-live="polite"` on render root causes screen reader to announce entire new page |
| M19 | HTML | `<details>` marker hidden for WebKit only — Firefox shows double indicator |
| M20 | Testing | Zero unit tests for 3,600+ lines of pure logic in store.js and derive.js |
| M21 | Testing | 3 of 5 workflow modes completely untested (second_review, final_team_decision, re_evaluation) |
| M22 | Testing | No CI workflow file exists |
| M23 | Testing | Duplicated test helpers across 4 files with inconsistent assertions |
| M24 | Testing | `dispatchClick` bypasses Playwright actionability checks in every test |
| M25 | Architecture | Validation errors computed but not surfaced to users as text — only visual state changes |
| M26 | Architecture | No global error boundary — subscriber exceptions break notification chain |
| M27 | Docs | CLAUDE.md lists deleted file (panel-sync.js), wrong filename (questionnaire-renderer.js), and omits keyboard.js |
| M28 | Docs | `01_architecture_decomposition.md` describes pre-migration state, diverges from built system |

## Positive Findings (6)

1. **Store→derive→render pipeline is clean** — no business logic leakage into behavior modules
2. **Declarative rules engine** in `rules.js` is properly externalized with condition DSL
3. **IMPLEMENTATION_PLAN.md** is exceptionally thorough — wave plan, risk register, quality gates
4. **Spec-to-schema alignment** — questionnaire and framework specs match implementation faithfully
5. **Config layer** has clean dependency graph, no circular imports, thorough `Object.freeze()`
6. **Cleanup pattern** — every module returns `destroy()` with consistent `cleanup` array

---

## Recommendations (Priority Order)

### Do First — Bugs & Safety

1. **Fix C1/C2 stale closures** — `toggleSurface` and `toggleReferenceDrawer` should read state inside `commit()`, not from outer closure
2. **Add try/catch in `notify()`** — wrap each listener call, log errors, continue to remaining subscribers
3. **Make `removeEvidenceAssetAssociations` pure** — return a new object instead of mutating its argument
4. **Audit `keyboard.js`** — `QUICK_JUMP_SHORTCUTS` constant defined but appears unused/dead code; if activated, letter keys would conflict with text input

### Do Next — Extract Shared Utilities

5. **Create `static/js/utils/` module** — extract `toArray`, `getDocumentRef`, `isPlainObject`, `freezeArray`, `normalizeTextValue`, `inferMimeTypeFromName`, `extractEvidenceItems`, `normalizeDelimitedList` from their 42 duplicated locations. Single source of truth, ~300-400 lines saved.

### Then — Performance

6. **Add dirty-checking to field-handlers subscription** — only sync visible page's field groups, or diff changed field IDs instead of scanning all 135
7. **Guard sidebar/help-panel sync** — skip full rebuild if panel is hidden; use incremental DOM updates instead of `clearChildren`+rebuild
8. **Debounce MutationObserver** — use `requestAnimationFrame` or a flag to prevent re-entrant syncs
9. **Consider selective derivation** — not every state change needs to recompute all 14 derivation functions (e.g., `setPanelMetrics` shouldn't recompute field states)

### Then — CSS/HTML

10. **Wrap questionnaire in `<form>`** with `aria-label`
11. **Fix heading hierarchy** and add `aria-labelledby` to section landmarks
12. **Move `overflow: hidden` to JS** — set it after shell initializes, not in static CSS
13. **Consolidate states.css accent-key selectors** — use data-attribute-driven approach instead of 11 repeated blocks
14. **Add spacing/shadow/z-index tokens** to `tokens.css`

### Then — Decomposition

15. **Split `navigation.js`** into coordinator + surface-management + progress-decorations + panel-metrics
16. **Consolidate evidence logic** — single `evidence-utils.js` replacing the 3 divergent copies

### Then — Testing

17. **Add unit tests** for `store.js`, `derive.js`, `rules.js` — pure functions, no browser needed. Use `node:test` or `vitest`
18. **Add CI workflow** — GitHub Actions running `npm run test:e2e:install && npm test`
19. **Add E2E tests** for remaining workflow modes and cross-field validation
20. **Add `forbidOnly`** to Playwright config for CI safety

### Then — Docs

21. **Update CLAUDE.md** — remove deleted files, fix wrong names, add missing modules
22. **Add comment to `01_architecture_decomposition.md`** noting it describes the pre-migration state, not current
