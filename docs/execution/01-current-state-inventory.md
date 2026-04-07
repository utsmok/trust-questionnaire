# Current-state architecture inventory

Date: 2026-04-06
Status: current implementation snapshot
Scope: existing questionnaire application only; no proposed product implementation in this document

## Inputs reviewed

- `/home/sam/dev/trust-questionnaire/CLAUDE.md`
- `/home/sam/dev/trust-questionnaire/docs/00-master-implementation-roadmap.md`
- `/home/sam/dev/trust-questionnaire/trust-framework.html`
- `/home/sam/dev/trust-questionnaire/package.json`
- Relevant files under `/home/sam/dev/trust-questionnaire/static/js/**`
- Relevant files under `/home/sam/dev/trust-questionnaire/static/css/**`
- Tests under `/home/sam/dev/trust-questionnaire/tests/**`
- Relevant repository memory notes under `/memories/repo/**`

## Current app architecture summary

The current application is a static single-page questionnaire implemented as plain HTML, CSS, and ES modules. The entry document is `/home/sam/dev/trust-questionnaire/trust-framework.html`. The JavaScript bootstrap in `/home/sam/dev/trust-questionnaire/static/js/app.js` creates an in-memory store, renders questionnaire pages from schema definitions, initializes navigation and form behavior, and locks document scrolling by setting `document.body.style.overflow = 'hidden'`.

The application does not currently include an application server, authentication flow, dashboard, review list, persistent review storage, or evidence backend. No `fetch`, XHR, WebSocket, EventSource, IndexedDB, or questionnaire-state `localStorage` usage was found under `/home/sam/dev/trust-questionnaire/static/js/**`. The only browser persistence currently present is sidebar width storage in `/home/sam/dev/trust-questionnaire/static/js/behavior/navigation.js`.

The questionnaire itself is schema-driven. `/home/sam/dev/trust-questionnaire/static/js/config/questionnaire-schema.js` defines 13 renderable pages, 16 criteria, and 123 explicit questionnaire fields. `/home/sam/dev/trust-questionnaire/static/js/render/questionnaire-pages.js` converts that schema into page models and DOM sections. `/home/sam/dev/trust-questionnaire/static/js/state/store.js` holds three major state slices:

- `evaluation`: source-of-truth questionnaire content
- `derived`: computed workflow, validation, progress, judgment, and evidence completeness state
- `ui`: active page, anchors, sidebar state, panel metrics, and reference drawer state

The app is structurally a questionnaire shell, not yet a general product shell. `/home/sam/dev/trust-questionnaire/trust-framework.html` assumes the questionnaire is the only screen. `/home/sam/dev/trust-questionnaire/static/css/layout.css` fixes the shell to the viewport, and `/home/sam/dev/trust-questionnaire/static/js/behavior/context-tracking.js` uses the URL hash for questionnaire page deep linking.

The roadmap in `/home/sam/dev/trust-questionnaire/docs/00-master-implementation-roadmap.md` is aligned with this shape: the questionnaire is intended to remain the permanent core work screen, with product features added around it rather than replacing it.

## Entrypoints and major modules

### Static shell and boot

| File path | Current role |
|---|---|
| `/home/sam/dev/trust-questionnaire/trust-framework.html` | Single HTML entrypoint. Declares the header, questionnaire panel mount points, context panel, tab panels, reference drawers, and loads all CSS and `static/js/app.js`. |
| `/home/sam/dev/trust-questionnaire/static/js/app.js` | Bootstrap entrypoint. Creates the store, renders questionnaire pages, initializes navigation, form controls, and keyboard behavior. |

### Domain configuration and schema

| File path | Current role |
|---|---|
| `/home/sam/dev/trust-questionnaire/static/js/config/sections.js` | Canonical page sequence, section registry, workflow state matrix, quick-jump sections, content-topic registry. |
| `/home/sam/dev/trust-questionnaire/static/js/config/questionnaire-schema.js` | Field types, field IDs, criterion definitions, section schemas, per-section field inventories, schema metadata. |
| `/home/sam/dev/trust-questionnaire/static/js/config/rules.js` | Declarative workflow rules, visibility rules, requiredness rules, text validation rules, cross-field validation rules, skip policy, recommendation constraints, workflow escalations, evidence completeness rules. |
| `/home/sam/dev/trust-questionnaire/static/js/config/option-sets.js` | Option lists used by dropdowns, checklists, score controls, and workflow fields. |

### State and derivation

| File path | Current role |
|---|---|
| `/home/sam/dev/trust-questionnaire/static/js/state/store.js` | Central store. Exposes `initialEvaluation` loading, `replaceEvaluation`, field/section/criterion actions, evidence actions, page navigation actions, sidebar actions, and subscription API. |
| `/home/sam/dev/trust-questionnaire/static/js/state/evidence-actions.js` | Immutable mutation helpers for evaluation-level and criterion-level evidence arrays, association reuse, replacement, unlink, note updates, and asset removal. |
| `/home/sam/dev/trust-questionnaire/static/js/state/derive/index.js` | Aggregates all derived state. |
| `/home/sam/dev/trust-questionnaire/static/js/state/derive/workflow.js` | Workflow-mode page accessibility, editability, primary pager sequence, escalation resolution. |
| `/home/sam/dev/trust-questionnaire/static/js/state/derive/fields.js` | Per-field visibility, requiredness, read-only state, derived field values, and field-level validation state. |
| `/home/sam/dev/trust-questionnaire/static/js/state/derive/criterion.js` | Criterion-level status, score state, skip state, evidence completeness, and validation state. |
| `/home/sam/dev/trust-questionnaire/static/js/state/derive/judgments.js` | Derived principle judgments, including downward-only override acceptance and upward-override rejection. |
| `/home/sam/dev/trust-questionnaire/static/js/state/derive/progress.js` | Per-section, per-group, and overall completion progress; completion checklist; escalation-aware overall status. |
| `/home/sam/dev/trust-questionnaire/static/js/state/derive/evidence.js` | Evaluation-level and criterion-level evidence completeness calculations. |
| `/home/sam/dev/trust-questionnaire/static/js/state/derive/validation.js` | Cross-field validation such as chronology and recommendation/scope alignment. |
| `/home/sam/dev/trust-questionnaire/static/js/state/derive/rules-eval.js` | Condition DSL evaluator used by rules. |

### Behavior and controllers

| File path | Current role |
|---|---|
| `/home/sam/dev/trust-questionnaire/static/js/behavior/navigation.js` | Questionnaire shell controller. Synchronizes visible pages, progress bars, drawer/sidebar behavior, panel titles, sidebar tabs, focus restoration, and narrow-screen context drawer behavior. |
| `/home/sam/dev/trust-questionnaire/static/js/behavior/field-handlers.js` | DOM-to-store binding for standard fields, criterion skip controls, section meta controls, score dropdowns, and evidence UI initialization. |
| `/home/sam/dev/trust-questionnaire/static/js/behavior/pager.js` | Previous/next pager derived from accessible pages in the current workflow. |
| `/home/sam/dev/trust-questionnaire/static/js/behavior/context-tracking.js` | Hash-based page deep linking and active sub-anchor tracking. |
| `/home/sam/dev/trust-questionnaire/static/js/behavior/keyboard.js` | Keyboard shortcuts for principle quick jumps and score/rating navigation. |
| `/home/sam/dev/trust-questionnaire/static/js/behavior/form-controls.js` | Re-export/wrapper for field handler initialization. |

### Rendering

| File path | Current role |
|---|---|
| `/home/sam/dev/trust-questionnaire/static/js/render/questionnaire-pages.js` | Builds page models from schema and renders all questionnaire sections into the questionnaire root. |
| `/home/sam/dev/trust-questionnaire/static/js/render/sidebar.js` | Renders page index, completion strip behavior, context route card, page anchors, context content, and reference/about links. |
| `/home/sam/dev/trust-questionnaire/static/js/render/evidence.js` | Renders evidence blocks and evidence items, handles upload/paste/drop, preview lightbox, manifest export, note editing, unlink/remove flows. |
| `/home/sam/dev/trust-questionnaire/static/js/render/reference-drawers.js` | Reference drawer mapping and rendering. |
| `/home/sam/dev/trust-questionnaire/static/js/render/about-panel.js` | About/info panel controller. |
| `/home/sam/dev/trust-questionnaire/static/js/render/help-panel.js` | Help/legend panel controller. |
| `/home/sam/dev/trust-questionnaire/static/js/render/dom-factories.js` | Shared DOM construction helpers for questionnaire and evidence UI. |

### Adapters and utilities

| File path | Current role |
|---|---|
| `/home/sam/dev/trust-questionnaire/static/js/adapters/evidence-storage.js` | Evidence manifest serialization. Despite the name, this is not a storage backend adapter; it currently produces a JSON manifest from in-memory evidence state. |
| `/home/sam/dev/trust-questionnaire/static/js/utils/shared.js` | Shared normalization, evidence extraction, display formatting, and utility helpers. |
| `/home/sam/dev/trust-questionnaire/static/js/utils/confirm-dialog.js` | Confirmation dialog utility used by destructive evidence actions. |
| `/home/sam/dev/trust-questionnaire/static/js/utils/focus-trap.js` | Focus trap utility used by the evidence lightbox. |

### CSS layers

The HTML currently loads these stylesheets in this order:

1. `/home/sam/dev/trust-questionnaire/static/css/tokens.css`
2. `/home/sam/dev/trust-questionnaire/static/css/base.css`
3. `/home/sam/dev/trust-questionnaire/static/css/layout.css`
4. `/home/sam/dev/trust-questionnaire/static/css/components.css`
5. `/home/sam/dev/trust-questionnaire/static/css/accent-scoping.css`
6. `/home/sam/dev/trust-questionnaire/static/css/interaction-states.css`
7. `/home/sam/dev/trust-questionnaire/static/css/animations.css`
8. `/home/sam/dev/trust-questionnaire/static/css/print.css`

Relevant CSS responsibilities:

- `/home/sam/dev/trust-questionnaire/static/css/tokens.css`: design tokens, section accent families, workflow/progress semantic colors, durations, typography, spacing, z-index.
- `/home/sam/dev/trust-questionnaire/static/css/layout.css`: shell grid, resizable sidebar, drawer mode, panel layout, page index column, responsive breakpoints.
- `/home/sam/dev/trust-questionnaire/static/css/components.css`: completion strip, page index buttons, evidence UI, context cards, skip accordions, score dropdown, criterion cards.
- `/home/sam/dev/trust-questionnaire/static/css/animations.css`: reduced-motion overrides and animation timing suppression.

## Existing workflow, state, and evidence capabilities already implemented

### Workflow capabilities already present

Implemented in `/home/sam/dev/trust-questionnaire/static/js/config/sections.js`, `/home/sam/dev/trust-questionnaire/static/js/config/rules.js`, and `/home/sam/dev/trust-questionnaire/static/js/state/derive/workflow.js`:

- Five workflow modes: `nomination`, `primary_evaluation`, `second_review`, `final_team_decision`, `re_evaluation`.
- Per-section workflow gating with three states: `editable`, `read_only`, `system_skipped`.
- Primary pager sequences that change by workflow mode.
- Formal governance escalation rules that can require final team decision resolution before closure.
- Read-only access to prior sections in second-review and final-decision workflows.

The current questionnaire therefore already models a multi-stage review process, but only as one in-memory evaluation document. There is no server-side assignment, role enforcement, or review ownership.

### State model capabilities already present

Implemented in `/home/sam/dev/trust-questionnaire/static/js/state/store.js` and the derive modules:

- In-memory evaluation model with `workflow`, `fields`, `sections`, `criteria`, `evidence`, and `overrides`.
- Store initialization via `createAppStore({ initialEvaluation, pageOrder })`.
- Full questionnaire replacement via `replaceEvaluation`, which is the primary current seam for future save/load integration.
- Field normalization by type before commit.
- Conditional visibility and conditional requiredness.
- Typed field validation and minimum-substance text validation.
- Cross-field chronology and alignment validation.
- Derived principle judgments from criterion scores.
- Downward-only principle judgment override support through the derived judgment fields.
- Recommendation constraints driven by scope, critical fail flags, and disagreement state.
- Completion checklist derivation.
- Per-page, per-group, and overall progress with escalation-aware blocked states.
- UI state for active page, active sub-anchor, panel scroll metrics, sidebar tab state, and drawer state.

### Questionnaire structure already present

Implemented in `/home/sam/dev/trust-questionnaire/static/js/config/questionnaire-schema.js` and verified in `/home/sam/dev/trust-questionnaire/tests/e2e/rendering.spec.js`:

- 13 renderable pages: `S0`, `S1`, `S2`, `TR`, `RE`, `UC`, `SE`, `TC`, `S8`, `S9`, `S10A`, `S10B`, `S10C`
- 16 criteria across the principle pages
- 123 explicit questionnaire fields
- 17 rendered evidence blocks: 1 evaluation-level block on `S2` and 16 criterion-level blocks

### Navigation and shell capabilities already present

Implemented in `/home/sam/dev/trust-questionnaire/static/js/behavior/navigation.js`, `/home/sam/dev/trust-questionnaire/static/js/render/sidebar.js`, `/home/sam/dev/trust-questionnaire/static/js/behavior/pager.js`, and `/home/sam/dev/trust-questionnaire/static/js/behavior/context-tracking.js`:

- Schema-driven page rendering into `#questionnaireRenderRoot`
- Canonical page index in the left column
- Completion strip quick jumps in the header
- Previous/next pager for accessible sections
- Context sidebar with `Guidance`, `Reference`, and `About` tabs
- Context anchor routing to criteria and summary blocks
- Hash-based page deep linking
- Narrow-screen context drawer mode
- Focus restoration after drawer close
- Sidebar width persistence in `localStorage`

### Accessibility and interaction capabilities already present

Implemented across the HTML, navigation code, field handlers, and CSS:

- Skip links in `/home/sam/dev/trust-questionnaire/trust-framework.html`
- `aria-hidden` and `inert` applied to inactive pages and inactive drawer states
- Focus retry logic for transitions and drawer close
- Keyboard quick jumps in `/home/sam/dev/trust-questionnaire/static/js/behavior/keyboard.js`
- Reduced-motion support in `/home/sam/dev/trust-questionnaire/static/css/animations.css`
- Evidence lightbox focus trap

### Evidence capabilities already present

Implemented across `/home/sam/dev/trust-questionnaire/static/js/state/evidence-actions.js`, `/home/sam/dev/trust-questionnaire/static/js/render/evidence.js`, and `/home/sam/dev/trust-questionnaire/static/js/adapters/evidence-storage.js`:

- Separate evaluation-level and criterion-level evidence arrays in store state
- Auto-add evidence by file input selection
- Paste-from-clipboard evidence intake
- Drag-and-drop evidence intake
- Evidence preview lightbox for images
- Direct download links for non-image attachments stored as data URLs
- Criterion unlink flow
- Evaluation-level remove flow
- Remove-asset-everywhere flow across associations
- Evidence note editing in place
- Evidence manifest export as `trust-evidence-manifest.json`
- Evidence completeness derivation for evaluation folder link and criterion evidence state

Current evidence implementation limits:

- Evidence files are stored in-memory as `dataUrl` and `previewDataUrl` payloads inside the questionnaire state.
- There is no durable file storage, upload API, retry model, quota management, or shared asset store.
- `/home/sam/dev/trust-questionnaire/static/js/render/evidence.js` contains controller logic for typed evidence metadata, reuse, and replacement flows (`add-files`, `reuse-asset`, `cancel-replace`, `start-replace`), but `/home/sam/dev/trust-questionnaire/static/js/render/evidence.js:createEvidenceBlockElement` does not currently render the associated controls. Those code paths are therefore partially prepared but not fully surfaced in the current DOM.

## Current testing and run commands

### Run commands

Defined in `/home/sam/dev/trust-questionnaire/package.json`:

- `npm run serve:static` — serves the app at `http://127.0.0.1:4173`
- `npm run validate:html` — validates `/home/sam/dev/trust-questionnaire/trust-framework.html`
- `npm run test:unit` — runs Vitest unit tests
- `npm run test:e2e` — runs Playwright browser tests
- `npm run test:e2e:headed` — runs Playwright with headed browsers
- `npm run test:e2e:install` — installs Chromium and Firefox browser binaries
- `npm run test` — runs HTML validation, unit tests, and e2e tests

### Test configuration

- `/home/sam/dev/trust-questionnaire/playwright.config.js`
  - Test directory: `/home/sam/dev/trust-questionnaire/tests/e2e`
  - Browsers: Chromium and Firefox
  - Built-in static web server using `python3 -m http.server 4173 --bind 127.0.0.1`
  - Trace on first retry, screenshot on failure, video on failure

- `/home/sam/dev/trust-questionnaire/vitest.config.js`
  - Test directory include pattern: `/home/sam/dev/trust-questionnaire/tests/unit/**/*.test.js`
  - Environment: Node

### Current automated test coverage

| File path | Coverage area |
|---|---|
| `/home/sam/dev/trust-questionnaire/tests/e2e/rendering.spec.js` | Schema-driven page count, criterion count, field count, evidence block count, responsive shell behavior, reduced-motion token override behavior. |
| `/home/sam/dev/trust-questionnaire/tests/e2e/navigation.spec.js` | Workflow-based page gating, quick jumps, context anchor navigation, sidebar tabs, narrow-screen drawer behavior, focus restoration. |
| `/home/sam/dev/trust-questionnaire/tests/e2e/validation.spec.js` | Conditional visibility/requiredness, URL validation, low-score blocker validation. |
| `/home/sam/dev/trust-questionnaire/tests/e2e/completion.spec.js` | Page progress state transitions, section skip handling, criterion skip handling, escalation-driven blocked overall status. |
| `/home/sam/dev/trust-questionnaire/tests/e2e/evidence.spec.js` | Evaluation evidence upload, criterion evidence upload, preview, manifest export, unlink, remove flows. |
| `/home/sam/dev/trust-questionnaire/tests/unit/config/rules.test.js` | Rule structure and skip policy invariants. |
| `/home/sam/dev/trust-questionnaire/tests/unit/derive/rules-eval.test.js` | Rule DSL condition evaluation behavior. |
| `/home/sam/dev/trust-questionnaire/tests/unit/utils/shared.test.js` | Shared normalization and evidence utility behavior. |

Not currently covered:

- Authentication
- Review list/dashboard behavior
- Save/load persistence
- Backend API integration
- Multi-user workflow enforcement

## Likely integration seams for the planned product layers

### App shell seam

Primary files:

- `/home/sam/dev/trust-questionnaire/trust-framework.html`
- `/home/sam/dev/trust-questionnaire/static/js/app.js`
- `/home/sam/dev/trust-questionnaire/static/js/behavior/navigation.js`
- `/home/sam/dev/trust-questionnaire/static/css/layout.css`

Current seam assessment:

- The questionnaire already behaves like a self-contained work surface.
- The HTML currently assumes this work surface is the entire application page.
- The bootstrap currently assumes direct ownership of `document`, viewport scrolling, and the URL hash.

Implication:

The cleanest integration path is to keep the questionnaire as an embedded review workspace inside a larger app shell, not to spread dashboard/auth concerns into the existing questionnaire modules. The primary changes will be shell containment, scroll ownership, and route coordination.

### Auth seam

Primary files:

- `/home/sam/dev/trust-questionnaire/static/js/app.js`
- `/home/sam/dev/trust-questionnaire/static/js/state/store.js`
- `/home/sam/dev/trust-questionnaire/static/js/config/questionnaire-schema.js`

Current seam assessment:

- There is no authenticated user model in state.
- Questionnaire reviewer fields in `S0`, `S10A`, and `S10B` are content fields, not identity/session infrastructure.
- The store can be initialized with preloaded evaluation data, but not with user/session context.

Implication:

Authentication should be added outside the questionnaire first. Questionnaire integration can then prefill or lock reviewer-related fields based on authenticated user data, but the current codebase has no built-in session concept.

### Persistence seam

Primary files:

- `/home/sam/dev/trust-questionnaire/static/js/app.js`
- `/home/sam/dev/trust-questionnaire/static/js/state/store.js`
- `/home/sam/dev/trust-questionnaire/static/js/state/derive/index.js`

Current seam assessment:

- `createAppStore({ initialEvaluation })` and `replaceEvaluation(nextEvaluation)` are the existing load hooks.
- All questionnaire content currently lives in memory.
- There is no serializer/deserializer for a full review record, only evidence manifest serialization.

Implication:

Persistence can be introduced without rewriting questionnaire logic if the backend exchanges an `evaluation` document compatible with the current store shape. Dirty tracking, save state, optimistic updates, conflict handling, and version history are not present and will need explicit design.

### Dashboard seam

Primary files:

- `/home/sam/dev/trust-questionnaire/trust-framework.html`
- `/home/sam/dev/trust-questionnaire/static/js/app.js`
- `/home/sam/dev/trust-questionnaire/static/js/behavior/context-tracking.js`
- `/home/sam/dev/trust-questionnaire/static/js/behavior/navigation.js`

Current seam assessment:

- The current application has no route other than the questionnaire itself.
- The URL hash is already used for questionnaire page state.
- The shell assumes the questionnaire loads immediately on page entry.

Implication:

Any dashboard or review list will need top-level routing that does not conflict with hash-based internal questionnaire navigation. If an external router is introduced, questionnaire page navigation should likely move away from raw hash ownership or become namespaced.

### Evidence backend seam

Primary files:

- `/home/sam/dev/trust-questionnaire/static/js/state/evidence-actions.js`
- `/home/sam/dev/trust-questionnaire/static/js/render/evidence.js`
- `/home/sam/dev/trust-questionnaire/static/js/adapters/evidence-storage.js`
- `/home/sam/dev/trust-questionnaire/static/js/utils/shared.js`

Current seam assessment:

- Evidence is already modeled as assets plus criterion associations.
- The store already distinguishes `assetId` from association `id`.
- Criterion reuse and replacement semantics exist in the mutation layer.
- The manifest generator already produces a structured evidence view by evaluation, section, and criterion.

Implication:

This is the strongest existing backend seam. The likely transition is to replace `dataUrl`/`previewDataUrl` payload storage with backend asset references and asynchronous upload/delete flows while keeping the existing asset/association model.

## Concrete file-level touchpoints likely to change first

| Concern | File path | Why this file changes early |
|---|---|---|
| App shell embedding | `/home/sam/dev/trust-questionnaire/trust-framework.html` | Current HTML is a questionnaire-only page. It will need to be embedded into or split behind a broader application shell. |
| Boot/loading | `/home/sam/dev/trust-questionnaire/static/js/app.js` | Current bootstrap is the main seam for injecting authenticated context, preloaded review data, and non-static shell initialization. |
| Review persistence | `/home/sam/dev/trust-questionnaire/static/js/state/store.js` | Existing `initialEvaluation` and `replaceEvaluation` are the first load hooks; save status, dirty tracking, and review metadata will likely be added here or adjacent to it. |
| Evidence persistence | `/home/sam/dev/trust-questionnaire/static/js/state/evidence-actions.js` | Current evidence mutations assume synchronous in-memory items. Backend-backed assets will require metadata and async state transitions. |
| Evidence serialization | `/home/sam/dev/trust-questionnaire/static/js/adapters/evidence-storage.js` | Current adapter is manifest serialization only. It is the obvious place to either expand or replace with a real evidence transport adapter. |
| Evidence UI | `/home/sam/dev/trust-questionnaire/static/js/render/evidence.js` | Upload/paste/drop/remove/preview logic is centralized here. Backend upload progress, failures, retry, and asset reuse UI would land here first. |
| Route coordination | `/home/sam/dev/trust-questionnaire/static/js/behavior/context-tracking.js` | Current hash ownership will conflict with dashboard/auth routes unless reworked. |
| Shell behavior | `/home/sam/dev/trust-questionnaire/static/js/behavior/navigation.js` | Current code owns fixed viewport shell behavior, drawer logic, focus restoration, and panel sync. Embedding inside a broader app will change these assumptions. |
| Page index / context panel | `/home/sam/dev/trust-questionnaire/static/js/render/sidebar.js` | If the questionnaire is hosted inside a larger review workspace, context and page index surfaces are likely to be retained but remounted or re-contained. |
| Layout containment | `/home/sam/dev/trust-questionnaire/static/css/layout.css` | Current shell is fixed to the viewport and controls its own responsive drawer/sidebar layout. This will likely need containment changes first. |
| Component styling | `/home/sam/dev/trust-questionnaire/static/css/components.css` | Dashboard/app-shell integration will affect page index, context cards, evidence blocks, and interaction components. |
| Test harness | `/home/sam/dev/trust-questionnaire/tests/e2e/helpers.js` | Current helpers assume direct navigation to `/trust-framework.html`. A dashboard/review route will change the test entrypoint. |
| Integration verification | `/home/sam/dev/trust-questionnaire/tests/e2e/navigation.spec.js` and `/home/sam/dev/trust-questionnaire/tests/e2e/evidence.spec.js` | These are the first suites that will surface regressions once shell routing and evidence behavior change. |

## Open risks and constraints

1. **No backend-facing infrastructure exists yet.**
	There is no auth, review API, save/load API, or evidence API in the current codebase.

2. **The questionnaire owns the entire page lifecycle.**
	`/home/sam/dev/trust-questionnaire/static/js/app.js` sets `document.body.style.overflow = 'hidden'`. `/home/sam/dev/trust-questionnaire/static/css/layout.css` fixes the shell to the viewport. This will collide with a broader app shell unless explicitly contained.

3. **URL hash ownership is already consumed by internal questionnaire navigation.**
	`/home/sam/dev/trust-questionnaire/static/js/behavior/context-tracking.js` maps the hash to questionnaire pages. A dashboard/router layer must coordinate with this instead of silently overriding it.

4. **Evidence is not durable and does not scale operationally.**
	Evidence items currently hold `dataUrl` payloads in memory. This is unsuitable for long sessions, large files, cross-device resume, collaboration, or backend synchronization.

5. **The evidence adapter name is misleading relative to current behavior.**
	`/home/sam/dev/trust-questionnaire/static/js/adapters/evidence-storage.js` is a manifest serializer, not a persistence adapter. This should be treated as an integration seam, not as an existing storage layer.

6. **There is internal schema-count drift.**
	`/home/sam/dev/trust-questionnaire/static/js/config/questionnaire-schema.js` contains conflicting metadata: `appendixFieldCount: 132`, `resolvedFieldCount: 123`, and rationale text that references `139`. This needs resolution before defining a backend review schema, reporting schema, or migration contract.

7. **There is documentation drift around responsive behavior.**
	`/home/sam/dev/trust-questionnaire/CLAUDE.md` states that the shell collapses the context panel at `1160px` and has no other breakpoints. `/home/sam/dev/trust-questionnaire/static/css/layout.css` also contains `@media (max-width: 760px)` rules. Current behavior is therefore broader than the shorthand architecture note suggests.

8. **Conditional-field mounting is a live implementation constraint.**
	`/memories/repo/conditional-field-mounting.md` notes that hidden conditional fields must remain mounted and be hidden via field state. Replacing current rendering with conditional unmounting will break later reveal behavior.

9. **Page-anchor harvesting is sensitive to DOM scope.**
	`/memories/repo/navigation-page-id-scope.md` notes that page harvesting must stay scoped to top-level rendered page sections because nested summary anchors also carry `data-page-id`.

10. **Context drawer focus restoration is timing-sensitive.**
	 `/memories/repo/context-drawer-focus-return.md` notes that focus return can race with `inert` and close-transition cleanup. This is relevant if the questionnaire shell is remounted inside another app shell.

11. **Progress semantics include escalation beyond currently editable pages.**
	 `/memories/repo/progress-model-activity.md` notes that unresolved workflow escalations can target governance pages that are currently workflow-skipped. Persistence and dashboard summaries must not flatten this state incorrectly.

12. **Evidence event scope currently extends beyond the questionnaire root.**
	 `/memories/repo/wave4-integration-edge-cases.md` notes that the evidence lightbox is mounted under `document.body`, so evidence action handling is document-scoped. Portal or shell refactors must preserve this or deliberately redesign it.

13. **Part of the evidence controller is ahead of the visible UI.**
	 `/home/sam/dev/trust-questionnaire/static/js/render/evidence.js` contains logic for reusable-asset selection and replacement flows, but the default rendered evidence block does not currently mount those controls. Backend integration work should first decide whether to complete or remove those latent paths.

## Missing prerequisites that block implementation

The following are not present in the current repository and would block real implementation of the roadmap items if left unspecified:

1. **Authenticated user/session contract**
	Missing: user identity model, session lifecycle, and field-prefill/field-lock policy for reviewer identity.

2. **Review record contract**
	Missing: canonical backend schema for a saved review, including review ID, owner, assignee, workflow stage, timestamps, and version/history strategy.

3. **Persistence API contract**
	Missing: create/list/get/update/save endpoints, concurrency/versioning rules, and failure/retry behavior for questionnaire saves.

4. **Evidence asset contract**
	Missing: upload endpoint, asset metadata shape, preview/thumbnail URL strategy, file retention policy, delete semantics, size limits, and association model between evidence assets and criteria.

5. **Dashboard routing and review selection model**
	Missing: top-level route structure and a decision on how questionnaire hash navigation coexists with app-level routes.

6. **Authoritative schema count and serialization contract**
	Missing: reconciled field-count/source-of-truth decision for `/home/sam/dev/trust-questionnaire/static/js/config/questionnaire-schema.js` versus questionnaire documentation.

7. **Frontend containment decision**
	Missing: whether the current static ES module shell remains embedded largely as-is, or whether it is migrated into a different runtime/router environment. This affects the first technical integration step.

## Repository memory notes directly relevant to this inventory

The following repository memory notes were directly relevant to current-state constraints and should remain visible during implementation planning:

- `/memories/repo/conditional-field-mounting.md`
- `/memories/repo/navigation-page-id-scope.md`
- `/memories/repo/context-drawer-focus-return.md`
- `/memories/repo/progress-model-activity.md`
- `/memories/repo/wave4-integration-edge-cases.md`

## Inventory conclusion

The current codebase already contains the questionnaire core the roadmap expects to keep: schema-driven page generation, multi-stage workflow gating, dense context/navigation shell, derived validation/progress/judgment logic, and an in-memory evidence model with manifest export. The clean integration strategy is therefore additive: preserve the questionnaire state and derive layers, then wrap them with a larger app shell, authenticated entry, saved review lifecycle, and durable evidence backend.

The primary blockers are not questionnaire logic gaps. They are missing product infrastructure contracts: auth/session, review persistence, evidence asset storage, route ownership, and a reconciled canonical review schema.
