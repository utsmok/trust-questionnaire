# Architecture Review — Recommendations

**Date:** 2026-04-04
**Scope:** Full codebase scan (23 JS modules, 6 CSS files, HTML entry, tests, config)
**Grade:** B+

---

## What's Working Well

- **State architecture** — Immutable store + pure derivation layer + declarative rules engine with zero circular dependencies in the config DAG.
- **Accessibility** — Skip links, `inert`/`aria-hidden`, focus management with retry, `prefers-reduced-motion`, keyboard shortcuts.
- **XSS posture** — Entire render layer uses `createElement` + `textContent`. No user data flows through `innerHTML`.
- **CSS token system** — `color-mix()`-derived accent families per section are elegant and maintainable.
- **Module boundaries** — Consistent factory pattern with cleanup. No circular imports.

---

## P0 — Should Address

### 1. Add unit tests for core logic

The entire test suite is e2e. `derive.js`, `store.js`, and `rules.js` have zero unit coverage — these are the most testable and regression-prone modules.

**Action:**
- Add [Vitest](https://vitest.dev/) (zero-config for ESM, no bundler needed):
  ```
  npm i -D vitest
  ```
- Add `"test:unit": "vitest run"` and `"test:unit:watch": "vitest"` to `package.json`.
- Target these functions first:
  - `static/js/state/derive.js` — `matchesCondition()`, `deriveCriterionState()`, `deriveFieldState()`, `derivePrincipleJudgment()`, `deriveCompletionProgress()`
  - `static/js/state/store.js` — action functions (create, clone, normalize)
  - `static/js/config/rules.js` — rule indexing, SKIP_POLICY, condition DSL helpers (`equals()`, `inValues()`, `hasAny()`)
- Run unit tests alongside e2e: `"test": "npm run validate:html && vitest run && npm run test:e2e"`

### 2. Split `derive.js` (2313 lines) into sub-modules

Single file is too large to navigate and test effectively.

**Action:**
```
static/js/state/derive/
  index.js          — barrel re-export, keeps existing import paths working
  criterion.js      — deriveCriterionState, deriveCriterionStates, criterion helpers
  fields.js         — deriveFieldState, deriveFieldStates, buildDerivedFieldValues, typed validation
  judgments.js      — derivePrincipleJudgment, derivePrincipleJudgments
  progress.js       — deriveCompletionProgress, deriveCompletionChecklist, deriveOverallCompletion
  validation.js     — createValidationIssue, dedupeValidationIssues, deriveCrossFieldValidations
  rules-eval.js     — matchesCondition, getConditionValue
  workflow.js       — derivePageStates, deriveNavigationState, deriveWorkflowEscalations
  recommendation.js — deriveRecommendationConstraints
  evidence.js       — deriveEvidenceCompleteness
  section-state.js  — deriveSectionStates
```
`deriveQuestionnaireState()` stays in `index.js`, importing and calling sub-module functions in dependency order.

### 3. Split evidence management out of `store.js` (1177 lines)

~400 lines of evidence-related code (normalization, cloning, association, removal) should be its own module.

**Action:**
- Create `static/js/state/evidence-actions.js` exporting evidence action factories (`addEvaluationEvidenceItems`, `reuseCriterionEvidenceAsset`, `replaceCriterionEvidenceItem`, etc.)
- Import into `store.js` and wire into the `actions` object
- Keep the store as the single dispatch point — just move the implementation

### 4. Add spacing, sizing, z-index, and border-width tokens to `tokens.css`

Color tokens are excellent but hundreds of hardcoded spacing/sizing values across 4000+ lines of CSS will cause drift.

**Action:** Add to `static/css/tokens.css`:
```css
/* Spacing scale */
--space-1: 4px;   --space-2: 8px;   --space-3: 12px;
--space-4: 16px;  --space-5: 20px;  --space-6: 24px;
--space-8: 32px;  --space-10: 40px; --space-12: 48px;

/* Border widths */
--border-thin: 1px;  --border-default: 2px;
--border-medium: 3px; --border-thick: 4px;

/* Z-index scale */
--z-panel-shadow: 4;    --z-panel-progress: 5;
--z-drawer-backdrop: 18; --z-drawer: 20;
--z-header: 25;          --z-accent-bar: 30;
--z-surface: 40;         --z-skip-link: 50;
--z-lightbox: 1000;
```
Then gradually replace hardcoded values in `components.css`, `layout.css`, and `states.css`. This can be done incrementally — no need for a single large PR.

---

## P1 — Should Plan

### 5. Split `states.css` (1881 lines) into 3 files

Currently combines accent scoping, interaction states, and animation keyframes.

**Action:**
```
static/css/
  accent-scoping.css   — body[data-active-accent-key] + :where() blocks (~330 lines)
  states.css           — rename to interaction-states.css (keep non-accent rules)
  animations.css       — @keyframes + prefers-reduced-motion overrides
```
Update `trust-framework.html` `<link>` order: `tokens → base → layout → components → accent-scoping → interaction-states → animations → print`.

### 6. Refactor accent-switching blocks (11 → 2)

The 11 near-identical `:where(...)` blocks in `states.css` (lines ~57–365) are ~300 lines of repetition.

**Action:** In `accent-scoping.css`:
```css
/* Block 1: Set body-scoped variables */
body[data-active-accent-key="tr"]  { --active-section-accent: var(--section-tr-accent); ... }
body[data-active-accent-key="re"]  { --active-section-accent: var(--section-re-accent); ... }
/* ... repeat for each key */

/* Block 2: All accent-consuming elements inherit from body */
:where(
  .doc-section, .form-section, .criterion-card,
  .nav-button, .page-index-button, ...
) {
  --section-accent: var(--active-section-accent);
  --section-accent-strong: var(--active-section-accent-strong);
  /* etc */
}
```
Reduces 11 blocks to 2. Adding a new accent-consuming element requires editing only block 2.

### 7. Replace ID-based CSS selectors with data-attribute selectors

Seven selectors in `states.css` and `components.css` reference specific section IDs — fragile if IDs change.

**Affected selectors:**
- `components.css:946` — `.form-section#questionnaire-section-9`
- `components.css:950` — `.form-section#questionnaire-section-9 .mock-control:first-of-type .value`
- `states.css:1082,1086,1094,1099` — `.form-section[id="questionnaire-section-8"]` variants
- `states.css:1090` — `.form-section[id="questionnaire-section-1"]`

**Action:** Replace with `[data-section="s9"]`, `[data-section="s8"]`, `[data-section="s1"]` (or `[data-accent-key="..."]` where semantically appropriate).

### 8. Add Prettier

No code formatting tool for a 23-module codebase invites drift, especially with AI-assisted development.

**Action:**
```
npm i -D prettier
```
Create `.prettierrc`:
```json
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100, "tabWidth": 2 }
```
Add `"format": "prettier --write 'static/js/**/*.js'"` and `"format:check": "prettier --check 'static/js/**/*.js'"` to `package.json`.

### 9. Deduplicate utilities in render modules

`help-panel.js` duplicates 5+ functions from `shared.js` and `sidebar.js`. `about-panel.js` duplicates `setAccentKey` and `createSourceList`.

**Action:**
- Move `joinTokens`, `formatProgressStateLabel`, `formatSectionProgressCompact`, `createInfoRow`, `getCompletionGroupLabel` to `static/js/utils/shared.js`
- Move `setAccentKey`, `createSourceList` to `static/js/utils/shared.js`
- Update imports in `help-panel.js`, `about-panel.js`, and `sidebar.js`

---

## P2 — Nice to Have

### 10. Fix `keyboard.js` static DOM query

Rating scale keyboard bindings query `.rating-scale` once at init (`keyboard.js:24`). Dynamically added scales (after page re-render) won't receive bindings.

**Fix:** Use a `MutationObserver` on the questionnaire root to detect new `.rating-scale` elements, or move keyboard handling into the `field-handlers.js` event delegation layer.

### 11. Beef up print stylesheet

`print.css` (124 lines) is functional but minimal.

**Add:**
- `color: #000; background: #fff;` on `body`
- `print-color-adjust: exact` on score/recommendation elements that need color
- `page-break-before` on major section boundaries (each TRUST principle)
- Hide evidence lightbox and overlay surfaces
- Explicit font-size adjustments for print readability

### 12. Replace native `confirm()` in evidence.js

`evidence.js:1438` uses browser `confirm()` for destructive "remove everywhere" operations — inconsistent with the polished UI.

**Action:** Create a small `confirm-dialog.js` utility that renders a styled modal with cancel/confirm buttons, returning a Promise. Replace the single `confirm()` call.

### 13. Add JSDoc type annotations for state shapes

The state shape is deeply nested (135 fields, 16 criteria, 20+ derived sub-trees). Implicit contracts slow onboarding and cause subtle bugs.

**Action:** Add `@typedef` blocks in `static/js/state/store.js` for:
- `EvaluationState` (fields, sections, criteria, evidence, overrides)
- `DerivedState` (pageStates, criterionStates, fieldStates, sectionStates, judgments, progress, validation)
- `UiState` (activePageId, pageOrder, surfaces, referenceDrawers, panelMetrics)
- `Condition` (the rules DSL node type)

### 14. Add `engines` field to `package.json`

CI hardcodes Node 20 but the package doesn't declare compatibility.

**Action:**
```json
"engines": { "node": ">=20" }
```

### 15. Expand test coverage

Current gaps:
- Untested workflows: `final_decision`, `re_evaluation`
- No hash-based deep linking tests (URL fragment, reload, back/forward)
- No keyboard shortcut tests beyond Escape
- No print-specific tests
- No visual regression / screenshot comparison tests

**Action:** Prioritize hash linking and missing workflows. Visual regression (Playwright screenshots with pixel comparison) is lower priority but valuable before any deployment.

---

## Explicitly Not Recommended

- **Vite / build tooling** — The zero-build-step model is a genuine asset. No unused code to tree-shake, no JSX to compile, no CSS to preprocess. Adding a bundler introduces complexity without meaningful benefit.
- **TypeScript migration** — JSDoc type annotations (see #13) give you IDE autocomplete and type checking without a build step. Migrate to `.ts` files only if JSDoc ergonomics become limiting.
- **Backend addition** — The `evidence-storage.js` adapter is already designed as a persistence seam. Wait until there's a concrete need (multi-user, shared evaluations, actual deployment) before adding a server runtime, database, and auth.
