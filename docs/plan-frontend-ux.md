# Frontend application architecture and UX plan

## Scope and source basis

This document defines the frontend architecture and UX plan for evolving the current static, single-review SPA into a multi-view collaborative web application.

The plan is based on direct inspection of the current frontend shell, renderer, state model, content surfaces, UI-fix planning documents, and git activity from the last 24 hours.

Primary inputs inspected:

- `CLAUDE.md`
- `package.json`
- `trust-framework.html`
- `static/js/app.js`
- `static/js/behavior/context-tracking.js`
- `static/js/behavior/field-handlers.js`
- `static/js/behavior/keyboard.js`
- `static/js/behavior/navigation.js`
- `static/js/behavior/pager.js`
- `static/js/config/sections.js`
- `static/js/render/about-panel.js`
- `static/js/render/dom-factories.js`
- `static/js/render/evidence.js`
- `static/js/render/help-panel.js`
- `static/js/render/questionnaire-pages.js`
- `static/js/render/reference-drawers.js`
- `static/js/render/sidebar.js`
- `static/js/state/store.js`
- `static/css/*.css`
- `docs/trust-questionnaire.md`
- `docs/trust-framework-v2.md`
- `docs/ui-fixes/MASTER_PLAN.md`
- `docs/ui-fixes/01-evidence-system.md` through `docs/ui-fixes/06-section-skip-alignment.md`

Additional stack comparison inputs were checked against current framework documentation for:

- Next.js (`/vercel/next.js/v16.1.6`)
- Vite (`/vitejs/vite/v7.0.0`)

## Current-state baseline

### Shell and DOM composition

The current application is a fixed, dense shell defined in `trust-framework.html`.

Key shell facts:

- `#trustShell` declares `data-shell-architecture="page-based"`.
- The left/primary work surface is `#questionnairePanel`.
- The right/context surface is `#frameworkPanel`.
- The current reusable mount points already exist:
	- `#pageSidebarMount`
	- `#pagerMount`
	- `#questionnaireRenderRoot`
	- `#contextSidebarMount`
	- `#referenceDrawerMount`
	- `#aboutPanelMount`
	- `#helpLegendMount`
- The current questionnaire workspace is internally split again by `.workspace-layout` into:
	- `.page-index-column`
	- `.questionnaire-workspace`

This means the application is already functionally operating as a three-zone workspace:

1. page index
2. form workspace
3. context/reference/about/help rail

The future application should preserve this operational model inside the review workspace view rather than discarding it.

### Navigation and route model

Current navigation is controlled by page state, not application routes.

Relevant files and behaviors:

- `static/js/behavior/navigation.js`
	- centralizes `navigateToPage()`
	- manages page visibility classes
	- manages panel metrics and drawer presentation
	- manages focus restoration and active accent propagation
- `static/js/behavior/context-tracking.js`
	- maps `window.location.hash` to page slug
	- calls `updateHashForPage()` on active page changes
	- tracks active sub-anchor via `[data-context-anchor-id]`
- `static/js/behavior/pager.js`
	- computes previous/next page within accessible section order
- `static/js/render/sidebar.js`
	- renders the completion strip
	- renders the page index
	- renders contextual route cards and anchor cards
	- renders or re-homes context content

The current URL only identifies the active questionnaire page via hash. It does not identify:

- review identity
- review list context
- assignment state
- evidence view
- activity view
- settings/help view
- app-level layout state

This is the primary architectural constraint preventing the current SPA from becoming a multi-view application.

### Rendering and domain/state boundaries

The current renderer is strongly schema-driven.

Key observations:

- `static/js/render/questionnaire-pages.js` builds page models from:
	- `questionnaire-schema.js`
	- `sections.js`
	- `rules.js`
	- derived state
- `PAGE_LAYOUTS` already defines page-specific layout anchors such as `primary`, `detail`, `supplementary`, `summary`, and `criteria`.
- `createQuestionnairePageElement()` emits stable section and criterion structures:
	- `.form-section`
	- `.criteria-stack`
	- `.criterion-card`
	- `.field-grid`
	- `.evidence-block`
	- `.skip-accordion`
	- `.score-dropdown`
- `static/js/dom-factories.js` provides reusable UI primitives such as `createFieldGrid`, `createCriterionCard`, `createScoreDropdown`, `createTooltipTrigger`, and `createSection`.

The current state boundary is less clean.

`static/js/state/store.js` mixes two distinct categories:

1. **domain state**
	 - evaluation fields
	 - criterion values
	 - section records
	 - evidence associations
	 - derived progress/judgment/validation state
2. **ephemeral UI state**
	 - `activePageId`
	 - `activeSubAnchorId`
	 - `pageRatiosById`
	 - `panelMetrics`
	 - `sidebarPanel`
	 - `referenceDrawers`

This mixed boundary is acceptable for a single-page static application. It is not acceptable as the long-term state model for a route-driven collaborative application.

### Content surfaces and hardcoded content model

The contextual content system is partly data-driven and partly DOM-mined.

Relevant facts:

- `static/js/config/sections.js` already contains reusable content metadata:
	- `slug`
	- `contextTopicId`
	- `referenceTopicIds`
	- `aboutTopicIds`
- `trust-framework.html` still contains the actual context/reference/about copy as literal DOM sections.
- `render/sidebar.js`, `render/reference-drawers.js`, `render/about-panel.js`, and `render/help-panel.js` re-index or restructure that literal DOM.

This is the correct content taxonomy but the wrong storage model for a multi-view application. The content must move out of `trust-framework.html` and into structured content modules.

### Layout and UX baseline

The recent CSS and renderer changes establish a useful baseline.

Observed current layout and density characteristics:

- `.workspace-layout` currently uses `grid-template-columns: minmax(13rem, 16rem) minmax(0, 1fr)`.
- `.page-index-column` is sticky and now uses `contain: layout style paint`.
- `.questionnaire-workspace` is also contained.
- `.criterion-card` is already dense, flat, border-led, and explicitly coded with criterion identifiers rendered by `::after`.
- `.criteria-stack` uses compact vertical spacing.
- `.evidence-block` has already moved toward direct manipulation with drag/drop and inline editing.
- `.skip-accordion` and `.score-dropdown` are now first-class component patterns.
- tooltip width and button size were recently adjusted to reduce waste.

This is a usable pre-migration visual system. The correct strategy is to preserve and systematize it, not replace it with a generic dashboard UI.

## Last 24 hours of git activity and planning implications

The last 24 hours of git history materially affect the recommended path.

### Commit cluster inspected

| Commit | Change | Planning implication |
|---|---|---|
| `db063c4c` | `fix(navigation): use focusElementWithRetry...` | Focus and keyboard behavior are active constraints. The migration must preserve existing accessibility and focus semantics. |
| `4df3748d` | `feat(score-dropdown): add keyboard navigation...` | The custom score dropdown is no longer experimental. It is now a committed interaction pattern and should become a reusable component in the target app. |
| `f36ae90b` | `test(e2e): update tests for evidence system, score dropdown, skip accordion, and UI changes` | The current workspace behavior now has fresh regression coverage. That test contract should be treated as the compatibility baseline. |
| `bf2479d6` | `style(css): add score dropdown, skip accordion, drop zone styles, tooltip improvements, and layout containment` | The current CSS vocabulary is the immediate design-system seed for the new app. |
| `37db684b` | `refactor(ui): remove redundant labels, pills, titles, and pager status text` | Density reduction is already in motion. The multi-view plan should continue this direction, not reverse it. |
| `f6e9e303` | `refactor(questionnaire-pages): convert skip scaffolds to accordion, integrate score dropdown rendering` | `questionnaire-pages.js` remains the core rendering seam. It should be preserved during early migration phases. |
| `38b3002d` | `feat(evidence): simplify intake UI, add drag-and-drop, fingerprint diffing, editable notes` | Evidence interaction design has already been modernized. The target plan should extend this to backend-backed uploads rather than redesigning it from first principles. |
| `744940ea` | `feat(field-handlers): add URL extraction to evidence items and score dropdown sync/handlers` | Current input semantics already assume richer evidence/media behavior and custom control handling. This logic should be migrated as component logic, not re-specified. |
| `aaf2d308` | `refactor(evidence): rename evidenceSummary→evidence...` | The schema/domain model is still moving. The migration should avoid freezing UI contracts too early but should freeze domain identifiers once the backend contract is defined. |
| `776986f2` | `docs(ui-fixes): add research and implementation plans for 6 UI improvements` | These plans show the current design direction and should be treated as the immediate UX baseline. |

### Consequence for this plan

The correct planning posture is not “replace the current frontend.”

The correct posture is:

1. preserve the current questionnaire workspace as the initial compatibility baseline
2. extract and stabilize its reusable domain and content layers
3. wrap it with a real application shell and route model
4. then replace renderer slices incrementally

## Target product model

The target system is not a marketing site and not a generic CRUD dashboard. It is an internal review instrument for dense, structured evaluation work.

The product must support the following application-level capabilities that do not exist in the current SPA:

- multi-review dashboard and queue management
- per-review routing and direct linking
- assignments and second-review handoff
- review lifecycle state management
- activity history and audit visibility
- backend-backed evidence uploads and asset reuse
- user preferences and application settings
- app-level help, FAQ, and contact surfaces

### Review state taxonomy

The future application should separate three state axes that are currently collapsed or implicit.

| State axis | Recommended examples | Notes |
|---|---|---|
| Review lifecycle | `draft`, `primary_in_progress`, `awaiting_second_review`, `conflict`, `ready_for_decision`, `published`, `archived`, `re_evaluation_due` | App-level state. Not the same as section workflow mode. |
| Assignment state | `unassigned`, `assigned`, `accepted`, `in_progress`, `review_requested`, `blocked`, `completed`, `overdue` | User/work allocation state. Separate from review quality or completion. |
| Section progress | current `PROGRESS_STATES` from the derive layer | Existing page/section progress logic is reusable and should remain canonical. |

This separation is mandatory. The current application correctly treats score, progress, and workflow as different visual languages. The multi-view application must extend the same separation to review lifecycle and assignment state.

## App shell and routing strategy

### Recommended route tree

The application should move to a nested route tree with persistent layout shells.

```text
/
	dashboard
	reviews
	reviews/:reviewId
		overview
		workspace/:sectionSlug
			?focus=:criterionOrAnchor
			?utilityTab=guidance|reference|about|activity
		evidence
		activity
		assignments
		decision
	settings/profile
	settings/application
	settings/shortcuts
	help
	faq
	contact
```

### Layout composition

The shell should be layered.

#### 1. App shell

Responsibilities:

- authenticated header
- primary navigation
- global search or command trigger
- notification area
- route outlet
- global dialogs/toasts
- global upload queue tray
- user menu

This layer replaces the current direct dependence on `trust-framework.html` as the only shell.

#### 2. Review shell

Route scope: `reviews/:reviewId/*`

Responsibilities:

- review identity header
- lifecycle state and sync status strip
- assignee strip
- progress summary by completion group
- tab navigation (`overview`, `workspace`, `evidence`, `activity`, `assignments`, `decision`)
- shared review-level data loading

The review shell should stay mounted while users move between review subviews so that the application does not repeatedly reload summary metadata.

#### 3. Review workspace shell

Route scope: `reviews/:reviewId/workspace/:sectionSlug`

Responsibilities:

- left page index
- central section workspace
- right utility rail
- section-local pager
- section header and sub-anchor navigation
- focus and keyboard management

The current shell seams map directly to this target:

- `#pageSidebarMount` → page index region
- `#pagerMount` → section pager region
- `#questionnaireRenderRoot` → central section content region
- `#contextSidebarMount` / `#referenceDrawerMount` / `#aboutPanelMount` / `#helpLegendMount` → utility rail tabs

### Routing semantics

The router, not the store, should become the source of truth for:

- active review
- active major view
- active workspace section
- active criterion/summary focus anchor
- selected utility tab

The existing hash-based page navigation in `context-tracking.js` should be replaced with route segments and query parameters.

Recommended mapping:

- current `activePageId` → route param `:sectionSlug`
- current `activeSubAnchorId` → query param `focus`
- current `sidebarPanel.activeTab` → query param `utilityTab` or persisted UI preference
- current hash slugs → backward-compatibility redirect layer only

## Wireframe-level information architecture

### Dashboard / home view

```text
App header
Primary nav | Main content

Main content
	Queue summary strip
		- assigned to me
		- awaiting second review
		- blocked / escalated
		- re-evaluation due

	Review table / board
		- tool
		- lifecycle state
		- assignment state
		- progress
		- last activity
		- due date

	Recent activity panel
	Saved filters panel
```

This replaces the current absence of an application landing surface.

### Review overview view

```text
Review header
	tool identity | vendor | URL | lifecycle state | sync state | assignees | due date

Review tabs
	Overview | Workspace | Evidence | Activity | Assignments | Decision

Overview body
	left
		- review summary
		- completion group matrix
		- critical flags
		- recommendation snapshot

	right
		- assignee panel
		- review timeline excerpt
		- recent evidence uploads
```

This view should summarize the review without forcing immediate entry into the questionnaire.

### Review workspace view

```text
Review header
Section bar
	section code | title | workflow state | progress | assignee | evidence count | last edited

Three-column workspace
	left column
		- page index
		- section progress markers

	center column
		- sub-anchor strip
		- criterion stack or field groups
		- section meta controls

	right column
		- Guidance
		- Reference
		- About
		- Activity / comments
		- section summary panel
```

This is structurally the current application, but route-owned and embedded in a broader review product.

### Settings, help, FAQ, and contact surfaces

```text
App header
Primary nav | secondary settings/help nav | content

Settings
	- profile
	- keyboard shortcuts
	- density / display preferences
	- notifications
	- evidence defaults

Help center
	- workflow guide
	- TRUST reference
	- FAQ
	- contact / escalation
```

These should be routes, not modal overlays and not review-local tabs.

## Component extraction and reuse strategy

### What should move to app-shell level

The following concerns are application-wide and should not remain embedded in the review workspace implementation:

- authentication/session chrome
- primary navigation
- app-level notifications
- global upload queue
- user/application settings
- app-level help center, FAQ, and contact surfaces
- route outlet composition

### What should remain review-shell level

These are specific to one review but common to all review subviews:

- `ReviewHeader`
- `ReviewStatusStrip`
- `AssigneeStrip`
- `ReviewTabNav`
- `ReviewProgressMatrix`
- `ReviewPresenceSummary`

### What should remain review-workspace level

These components are specific to the questionnaire editing experience and should remain inside the workspace route:

- page index navigation
- pager
- section renderer
- criterion cards
- field groups
- score dropdowns
- skip accordion controls
- evidence blocks
- context/reference/about/help utility tabs
- evidence lightbox

### How to separate help/context/info surfaces from the single review page

Current implementation status:

- `render/sidebar.js` currently handles page index rendering and context route rendering together.
- `render/about-panel.js`, `render/help-panel.js`, and `render/reference-drawers.js` each manage a different right-rail surface.

Recommended target split:

| Current source | Future component | Level |
|---|---|---|
| `render/sidebar.js` completion strip | `ReviewCompletionStrip` | review shell |
| `render/sidebar.js` page index | `PageIndexNav` | review workspace |
| `render/sidebar.js` route/anchor/context cards | `ContextRail` + `AnchorNav` | review workspace |
| `render/reference-drawers.js` | `ReferenceDrawerStack` | review workspace and help center reuse |
| `render/about-panel.js` | `AboutTopicPanel` | review workspace and help center reuse |
| `render/help-panel.js` | `WorkspaceLegendPanel` | review workspace |
| hardcoded DOM in `trust-framework.html` | structured content registry | shared content layer |

### How to separate workflow steps and setup flows

Current `S0`, `S1`, `S2`, `S10A`, `S10B`, and `S10C` pages are rendered as regular questionnaire pages. That is correct for the workspace route, but not sufficient for the larger product.

Recommended split:

- keep these pages as canonical questionnaire sections in the workspace
- also expose their most important data in route-specific summary surfaces:
	- setup summary on review overview
	- assignment/handoff summary on review overview and assignments view
	- governance summary on decision view

The same schema fields should back both representations. The application should not create parallel, divergent forms for the same data.

## Frontend stack evolution alternatives

### Option A — continue with vanilla ES modules and add application routing manually

Description:

- retain the current runtime model
- add a History API router
- add manual view composition and API adapters
- keep DOM-factory rendering for all views

Advantages:

- minimal new dependencies
- highest direct reuse of current code
- low short-term setup cost

Liabilities:

- routing, data loading, cache invalidation, optimistic updates, auth-aware guards, and error boundaries all become bespoke infrastructure
- document-level event handling and imperative DOM composition will expand rapidly as dashboard, assignments, activity, and settings views are added
- collaboration features will be materially harder to manage
- the current mixed domain/UI store boundary will become more brittle

Assessment:

This is viable only as a temporary containment strategy. It is not the correct long-term platform.

### Option B — hybrid migration to a React + TypeScript route shell, with the current workspace hosted as a compatibility island

Description:

- build a new route-driven application shell in React + TypeScript
- use Vite as the frontend build/dev foundation
- keep the current questionnaire workspace running inside a bounded compatibility host during early phases
- progressively replace current DOM-rendered surfaces with React components while retaining schema and derive logic

Advantages:

- preserves current investment in the questionnaire workspace
- establishes correct route, app-shell, and data-loading boundaries early
- supports incremental backend integration
- allows strict typing to be introduced at view boundaries first
- reduces rewrite risk because dashboard/review-detail/settings/help can be built before the workspace renderer is replaced

Liabilities:

- temporary dual runtime model during migration
- requires adapter code between router state and the current store/navigation model
- introduces short-term duplication in utility-rail and layout logic

Assessment:

This is the best fit for the current codebase and the target product shape.

### Option C — full rewrite onto a full-stack React framework from the start

Description:

- rebuild the entire frontend on a framework such as Next.js immediately
- replace the current questionnaire renderer rather than host it

Advantages:

- cleanest final-state architecture if successful
- Next.js currently supports SPA mode and progressive addition of server features, including server rendering and full-stack capabilities
- appropriate if the frontend and backend will be deployed as a single full-stack product from day one

Liabilities:

- discards the now-stabilizing workspace implementation too early
- delays delivery of dashboard, assignments, and review-shell views because the entire questionnaire renderer must be rewritten before parity exists
- highest regression risk in evidence, keyboard, focus, and density behavior

Assessment:

This is only justified if the backend decision is already “single full-stack Node application, server-rendered by default, with tight server component or server action usage.” No evidence currently requires that decision.

### Comparative recommendation

| Option | Short-term risk | Long-term fit | Reuse of current workspace | Backend flexibility |
|---|---|---|---|---|
| A. Vanilla only | Low initially, then increasing | Weak | High | Medium |
| B. Hybrid React/Vite + compatibility island | Moderate | Strong | High initially, then controlled replacement | Strong |
| C. Immediate full rewrite / full-stack framework | High | Strong if backend is aligned | Low | Medium to strong depending on backend choice |

## Recommended stack path

### Recommendation

Adopt **Option B**.

Recommended stack:

- **React + TypeScript** for route-driven application composition
- **Vite** as the frontend build/dev foundation
- **React Router** for nested route composition and route ownership of view identity
- **TanStack Query** or equivalent query cache for backend state, invalidation, optimistic mutation, and background refresh
- **current schema/derive domain logic retained and extracted into a framework-agnostic domain layer**
- **current store logic retained temporarily as a workspace-local draft store**, not as the global application state container

### Why this path fits the current codebase

1. `package.json` currently has no runtime dependencies and no build step. This means the domain logic is not framework-bound.
2. `questionnaire-pages.js`, `sections.js`, `questionnaire-schema.js`, `rules.js`, and the derive layer are already declarative enough to survive a framework migration.
3. The current shell seams map directly onto nested layouts.
4. The last 24 hours of work have refined the workspace interaction model enough that it should be wrapped and preserved, not re-imagined.
5. Vite is a good fit when the frontend remains a dedicated client application and the backend is still undecided or separate. Its docs position it as a frontend tooling foundation rather than a full-stack application framework.
6. Next.js remains a viable later pivot if the backend is explicitly consolidated into a single full-stack deployment model. Its current docs also confirm that it can operate in SPA mode and progressively add server features, but that extra capability is not required to unlock the next phase of this product.

## Domain, route, and UI state boundaries

### Keep framework-agnostic

The following should remain schema-driven and framework-agnostic:

- `static/js/config/questionnaire-schema.js`
- `static/js/config/sections.js`
- `static/js/config/rules.js`
- `static/js/config/option-sets.js`
- `static/js/state/derive/*`
- evidence normalization and association logic from `state/evidence-actions.js`
- page and field layout metadata currently held in `PAGE_LAYOUTS`

These files should become the canonical domain package for the application.

### Move out of the current store

The following should no longer live inside the draft/form store:

- active route/view identity
- active section slug
- active utility tab
- drawer open state
- panel metrics
- viewport-derived visibility ratios

These belong to the router or view-local UI state.

### Target state split

| Layer | Responsibility |
|---|---|
| Router state | current route, section slug, focus target, active subview |
| Query/cache state | review records, assignment data, activity stream, evidence assets, settings |
| Workspace draft state | editable review snapshot, unsaved field changes, local validation, optimistic draft patch queue |
| View-local UI state | open accordions, selected evidence item, local drawer expansion, column widths |
| User preferences | density mode, shortcut preferences, default utility tab, sort/filter defaults |

## Form and layout overhaul

### Core objective

Increase density and reduce scroll cost without reducing explicitness.

The current UI already points in the correct direction. The next step is to formalize three distinct workspace templates rather than use one page treatment for everything.

### Proposed page template families

| Template family | Applies to | Purpose |
|---|---|---|
| Intake template | `S0`, `S1`, `S2` | setup, tool identity, evidence boundary |
| Principle template | `TR`, `RE`, `UC`, `SE`, `TC` | criterion-centric scoring and evidence review |
| Governance/control template | `S8`, `S9`, `S10A`, `S10B`, `S10C` | critical fails, recommendation, review workflow, team decision |

The current `PAGE_LAYOUTS` already encodes most of this distinction. The target implementation should promote it into explicit page-template components.

### Review workspace grid

Recommended large-screen workspace frame:

```text
14rem page index | minmax(0, 1fr) central form | 22rem–26rem utility rail
```

Behavior:

- left page index can collapse to the current compact width model already implied by `.workspace-layout.is-compact`
- central form remains the primary work surface
- right utility rail holds guidance, reference, about, activity/comments, and section summary

This preserves the dense operational model already present in the application.

### Section header system

Each workspace section should begin with a sticky, dense section header band containing:

- section code
- section title
- workflow state
- section progress
- unresolved attention/escalation count
- assignee
- evidence count
- last modified indicator
- quick actions (`next`, `previous`, `open activity`, `open evidence library`)

This replaces the current split between header chrome, pager, and right-panel context awareness with a clearer operational header.

### Criterion card system

The current `.criterion-card` should become a denser structured grid, not a looser stacked card.

Recommended criterion layout:

```text
Row 1
	[criterion code + title + short statement] [score dropdown] [status chips] [evidence count]

Row 2
	left: criterion fields
	right: evidence list / evidence intake / note summary

Row 3 (collapsible)
	skip controls / blockers / long rationale fields
```

Specific implications:

- keep the score control in the header row
- keep evidence count visible without scrolling into the evidence block
- show only a short statement by default; long explanatory copy can be exposed inline if needed
- retain explicit criterion IDs and colored accent edges
- do not revert to consumer-style cards or large padding

### Summary regions

Current principle summary fields appear after the criterion stack. This creates unnecessary travel on long pages.

Recommended change:

- on large screens, move editable section summary controls into the right utility rail as a persistent “Section summary” panel
- on narrower screens, keep them inline below the criteria stack

This reduces back-and-forth scrolling while preserving editability.

### Evidence blocks

The current `evidence-block` should remain a first-class unit but be compressed further.

Recommended treatment:

- one compact intake strip per criterion
- one attached-assets list per criterion
- optional link between criterion evidence and review-level evidence library
- inline note editing retained
- progress/error states visible directly in the block

### How to reduce wasted space and scrolling

Recommended tactics:

- keep current compact gap discipline (`8px`, `12px`, small headers)
- collapse completed criteria by user preference, not by default hidden logic
- auto-expand incomplete, invalid, blocked, or recently edited criteria
- keep section summary sticky on wide screens
- keep page anchor navigation visible under the section header
- avoid virtualization; the questionnaire is not large enough to justify the accessibility and focus complexity

## Media interactions and evidence workflow plan

### Current baseline

`static/js/render/evidence.js` already supports:

- drag and drop
- paste from clipboard
- inline note editing
- lightbox preview
- reusable evidence via `assetId`
- fingerprint diffing to reduce rerender flashing

This is the correct interaction direction. The missing layer is persistent upload infrastructure.

### Target evidence model

Separate the concepts currently conflated inside one client-side object.

| Entity | Purpose |
|---|---|
| `EvidenceAsset` | persistent uploaded or linked resource |
| `EvidenceAttachment` | association of an asset to a review or criterion, with note/type metadata |
| `UploadJob` | transient client-side upload progress and retry state |

The presence of `assetId` in the current evidence logic indicates that this split is already conceptually present.

### Target intake flows

The future frontend should support five evidence entry modes:

1. file picker
2. drag and drop
3. direct clipboard paste of images/files
4. pasted URL converted to link evidence
5. reuse of an existing review asset

### Upload interaction model

Recommended interaction sequence:

1. user drops, pastes, or selects a file
2. UI creates optimistic `UploadJob`
3. criterion block shows queued or uploading row immediately
4. backend returns `EvidenceAsset`
5. frontend writes or updates `EvidenceAttachment`
6. failures remain inline with `retry` and `remove` actions

Required inline states:

- `queued`
- `uploading` with per-file progress
- `processing` if thumbnails or scanning are backend-side
- `attached`
- `failed`
- `retrying`

### Metadata capture

Evidence metadata should be captured with minimal interruption.

Recommended metadata fields:

- evidence type
- note
- captured by
- captured at
- origin (`upload`, `paste`, `drop`, `link`, `reuse`)
- file name / MIME / size
- target associations (review-level or criterion-level)
- optional source URL for linked evidence

Default heuristics:

- pasted image → default type `screenshot`
- pasted URL → default type `link`
- PDF/document → default type `document`

### UI placement

Evidence interaction should exist in two places:

1. **local evidence block** inside each criterion or section
2. **review evidence library** route for cross-criterion review, filtering, reuse, and cleanup

This keeps the local workflow fast without losing a review-level asset management surface.

### Important migration constraint

Current evidence handlers attach to `document` for paste, drag, and click in several cases. That is acceptable in the static SPA. It should not survive as the permanent architecture in the multi-view app.

In the target app, evidence interactions should be scoped to the active workspace route and explicit drop/paste zones.

## Migration strategy

### Phase 0 — stabilize the migration seam

Objectives:

- freeze the current workspace as the compatibility baseline
- extract hardcoded content out of `trust-framework.html`
- isolate framework-agnostic domain modules
- define review and evidence API contracts with backend stakeholders

Deliverables:

- content registry for guidance/reference/about/help
- domain package for schema, rules, derive logic, and evidence normalization
- compatibility test baseline based on the updated e2e suite

### Phase 1 — build the new application shell

Objectives:

- implement authenticated app shell
- add dashboard, review list, settings, help, FAQ, and contact routes
- add backend-backed review queue and summary cards

No questionnaire rewrite should occur in this phase.

### Phase 2 — add the review shell and host the legacy workspace

Objectives:

- implement `ReviewShell`
- add `overview`, `workspace`, `evidence`, `activity`, `assignments`, and `decision` review routes
- embed the current questionnaire workspace inside a `LegacyWorkspaceHost`

Compatibility host responsibilities:

- load review snapshot from backend
- initialize the current draft store from that snapshot
- map route section slug to current `navigateToPage()` behavior
- map save/autosave to backend patch endpoints

This phase unlocks the multi-view application without forcing immediate workspace reimplementation.

### Phase 3 — replace utility rail and navigation surfaces

Objectives:

- replace the current imperative sidebar/context/about/help renderers with route-aware React components
- keep the legacy central questionnaire renderer in place temporarily
- retire DOM mining from `trust-framework.html`

This phase should replace:

- `render/sidebar.js`
- `render/reference-drawers.js`
- `render/about-panel.js`
- `render/help-panel.js`

before replacing `questionnaire-pages.js`.

### Phase 4 — replace the questionnaire renderer

Objectives:

- recreate `questionnaire-pages.js` as framework components using the same schema-driven page model
- preserve current field/criterion IDs, validation behavior, and layout anchors
- keep the domain rules and derive logic unchanged wherever possible

This phase should migrate by template family, not by individual ad hoc components.

Recommended order:

1. intake template (`S0`–`S2`)
2. governance/control template (`S8`–`S10C`)
3. principle template (`TR`–`TC`)

The principle pages are the most interaction-dense and should be migrated last.

### Phase 5 — collaboration and backend-backed media

Objectives:

- add upload queue and attachment persistence
- add review activity timeline
- add presence/locking or conflict detection
- add assignment workflows and review handoff actions
- add review-level event logging

### Phase 6 — remove the compatibility island

Objectives:

- delete legacy bootstrap path from `app.js`
- remove dependency on `trust-framework.html` as the production application shell
- retain only the structured content and domain modules that survived migration

## What should remain schema-driven

The following should remain declarative and canonical throughout the migration:

- section registry and slugs
- field definitions
- option sets
- visibility/requirement/skip/judgment rules
- completion and escalation derivations
- page layout anchor definitions

The migration should change the view layer, not the evaluation semantics.

## Risks and backend dependencies

### Backend decisions that directly affect frontend architecture

| Decision area | Frontend effect |
|---|---|
| Authentication and authorization model | determines route guards, role-aware actions, and settings surfaces |
| Review persistence granularity | determines autosave patch model and optimistic update strategy |
| Evidence storage target | determines upload transport, preview URLs, retention, and reuse model |
| Conflict/versioning model | determines whether field-level conflicts, review locks, or merge UI are required |
| Activity/event schema | determines timeline design and audit surface granularity |
| Realtime strategy | determines whether presence/activity is polled, streamed, or websocket-backed |
| Review search and filter endpoints | determines dashboard scalability and queue design |

### Primary risks

1. **Rewriting the workspace too early**
	 - risk: discards recent, tested UI improvements
	 - mitigation: compatibility-island approach

2. **Leaving hardcoded content in HTML too long**
	 - risk: blocks reuse across dashboard/help/workspace views
	 - mitigation: extract content in Phase 0

3. **Keeping route state inside the draft store**
	 - risk: router and store diverge, producing invalid deep links and difficult state recovery
	 - mitigation: route owns view identity from Phase 2 onward

4. **Treating uploads as form state**
	 - risk: blob handling, retry behavior, and progress UI become unstable
	 - mitigation: separate `UploadJob` and `EvidenceAsset` layers

5. **Over-coupling frontend choice to an undecided backend**
	 - risk: premature full-stack framework commitment
	 - mitigation: select the hybrid React/Vite route shell first; retain optional later move to a full-stack framework if backend direction justifies it

## How recent git activity should influence the plan

The 2026-04-06 commit cluster should be treated as the baseline workspace contract.

Specific planning consequences:

- The current `score-dropdown`, `skip-accordion`, `evidence-block`, and compact tooltip treatment should be preserved as canonical component patterns.
- Updated focus behavior in `navigation.js` should be reproduced in the new routing layer. This is not cosmetic.
- The test updates indicate that evidence, navigation, rendering, and validation flows now have recent coverage. That coverage should be extended, not bypassed.
- The recent reduction of redundant labels and status text confirms that density is an explicit direction. Dashboard and settings views should follow the same discipline.
- Layout containment work in CSS indicates that performance concerns already exist. The future shell should avoid unnecessary rerender breadth and should keep workspace updates localized.

In practical terms: the next application should look like the current instrument, extended into a larger system, not like a separate product with a disconnected embedded form.

## Recommended view and component map

| View / route | Primary components | Current lineage |
|---|---|---|
| `dashboard` | `DashboardShell`, `QueueSummaryStrip`, `ReviewQueueTable`, `RecentActivityPanel` | new, but should reuse progress and state label vocabulary from derive/store |
| `reviews` | `ReviewListView`, `FilterRail`, `SavedViews` | new |
| `reviews/:reviewId/overview` | `ReviewHeader`, `ReviewProgressMatrix`, `CriticalFlagsPanel`, `AssignmentSummary` | reuse completion group logic and recommendation summary logic |
| `reviews/:reviewId/workspace/:sectionSlug` | `ReviewWorkspaceLayout`, `PageIndexNav`, `SectionWorkspace`, `ContextRail`, `SectionSummaryPanel`, `ReviewPager` | `sidebar.js`, `questionnaire-pages.js`, `reference-drawers.js`, `about-panel.js`, `help-panel.js`, `pager.js` |
| `reviews/:reviewId/evidence` | `EvidenceLibrary`, `UploadQueuePanel`, `AttachmentMatrix`, `AssetPreview` | `evidence.js` conceptually, but route-level and backend-backed |
| `reviews/:reviewId/activity` | `ActivityTimeline`, `ChangeAuditTable`, `PresenceSummary` | new, but should use domain events from backend |
| `reviews/:reviewId/assignments` | `AssignmentBoard`, `HandoffChecklist`, `SecondReviewStatus` | new, but should reflect current workflow modes in `sections.js` |
| `reviews/:reviewId/decision` | `DecisionSummary`, `GovernanceFields`, `PublicationControls` | reuses `S9`, `S10A`, `S10B`, `S10C` schema fields |
| `settings/*` | `SettingsShell`, `ShortcutSettings`, `DensitySettings`, `NotificationSettings` | new |
| `help`, `faq`, `contact` | `HelpCenterShell`, `ReferenceTopics`, `FAQList`, `SupportContacts` | content extracted from current about/reference/help surfaces |

## Final recommendation

The frontend should move to a route-driven React + TypeScript application built on Vite, using a hybrid migration path that preserves the current questionnaire workspace as a compatibility island during early phases.

The most important architectural decisions are:

1. route identity must move out of the current store and into the router
2. schema, rules, and derive logic should remain canonical and framework-agnostic
3. hardcoded context/reference/about content must be extracted from `trust-framework.html`
4. the current dense workspace should be retained as the visual and interaction baseline
5. uploads, activity, assignments, and review lifecycle state must be added as first-class app concerns, not improvised within the current page-based SPA model

This path produces the required multi-view collaborative application while preserving the substantial and recent investment in the current workspace implementation.
