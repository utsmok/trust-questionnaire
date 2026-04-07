# App-shell and review-shell route model

Date: 2026-04-06
Status: Wave 0 / T003 substream B complete
Scope: canonical routed app-shell and nested review-shell ownership model for the saved-review build-out

This contract freezes the route and shell model required by T003 before implementation begins. It defines the selected routed compatibility-first application shape, the boundaries between the app shell and the review shell, the canonical route ownership rules, the workspace section/hash behavior, and the file-level implications for the current repository.

This document is intentionally about **ownership and boundaries**, not about framework choice, autosave cadence, or backend API payloads. Those are covered by separate T003 outputs.

## What this document freezes

- one routed application document, not a collection of standalone product HTML entrypoints;
- one authenticated **app shell** for global application routes and global session state;
- one nested **review shell** for all review-scoped routes and review identity ownership;
- one canonical **workspace route** that keeps the current questionnaire as the permanent core work surface;
- the rule that `reviewId` is route-owned by the review shell, not by hash or store-local page state;
- the rule that section identity is route-owned by `:sectionSlug`, while legacy hash behavior is reduced to a workspace-local compatibility concern only;
- the distinction between dashboard/app-level surfaces and review-scoped surfaces;
- the minimum file-level implementation responsibilities that downstream tasks must follow.

## Corrected mismatch before freeze

A source-plan mismatch existed before this contract was written:

- `docs/plan-frontend-ux.md` describes a future route-driven shell and discusses a React/Vite-based migration path.
- `docs/00-master-implementation-roadmap.md` and `docs/execution/04-executable-implementation-plan.md` explicitly reject making a frontend replacement the center of delivery and instead freeze a compatibility-first expansion around the existing questionnaire.

The correction frozen here is:

1. **Behavioral shell decisions are authoritative now; framework migration is not.**
2. The saved-review build-out uses **one routed compatibility document** centered on `trust-framework.html`.
3. The current questionnaire remains the **permanent core work surface** at the route `reviews/:reviewId/workspace/:sectionSlug`.
4. Any later React/Vite or other renderer migration is an optional technical evolution after the product shell model already exists; it is not a prerequisite for this contract.

This preserves the frontend UX intent around route ownership and shell layering while removing the unsupported implication that React/Vite is mandatory for Wave 2 delivery.

## Reconciliation with roadmap and execution-plan constraints

This contract is constrained by the following already-selected product decisions:

1. **The current questionnaire stays the permanent core work surface.**
   - Source: `docs/00-master-implementation-roadmap.md`
2. **The selected frontend shape is one routed app shell with one nested review shell.**
   - Source: `docs/execution/04-executable-implementation-plan.md`
3. **The compatibility document remains `trust-framework.html` during the saved-review build-out.**
   - Source: `docs/execution/04-executable-implementation-plan.md`
4. **The current hash-only page model is not sufficient for saved reviews, dashboard entry, or review-scoped subviews.**
   - Source: `docs/plan-frontend-ux.md`, `docs/execution/01-current-state-inventory.md`, `static/js/behavior/context-tracking.js`
5. **Route ownership must become explicit before app-shell/review-shell implementation work begins.**
   - Source: `docs/execution/03-dependency-wave-assessment.md`

## Current repository baseline

The current repository already provides the questionnaire workspace but not the application shell around it.

### What exists now

| File | Current role | Relevant constraint |
|---|---|---|
| `trust-framework.html` | Single static questionnaire document with the full workspace shell and literal guidance/reference/about content | Already contains the operational three-zone workspace that should be retained inside the future workspace route |
| `static/js/app.js` | Immediate bootstrap of the questionnaire store, renderer, navigation, form controls, and keyboard behavior | Assumes questionnaire-first entry and unconditionally applies shell-wide body scroll lock |
| `static/js/behavior/context-tracking.js` | Owns hash-to-page resolution and active sub-anchor tracking | Treats the URL hash as the only route-like identifier in the product |
| `static/js/render/questionnaire-pages.js` | Emits page models with stable section slugs | Already exposes the canonical slug seam needed for `workspace/:sectionSlug` |
| `static/js/state/store.js` | Holds evaluation state and also current page-focused UI state | Current `ui.activePageId` is a workspace navigation detail, not durable review identity |

### What does not exist yet

The current repo does **not** include:

- authenticated app-level routing;
- a dashboard or review list route;
- a review overview route;
- review-scoped shell chrome;
- route-owned `reviewId`;
- a separation between app-level route state and workspace-local navigation state.

## Canonical shell layering

The saved-review application is layered into three nested concerns.

### 1. App shell

The **app shell** owns all authenticated application concerns that are not specific to one review record.

Canonical responsibilities:

- authenticated entry and session bootstrap;
- dashboard and review-list entry points;
- global navigation;
- user/application settings routes;
- app-level help/reference/about/tooling routes;
- global session state and app-wide notifications;
- route dispatch into review-scoped shells.

The app shell does **not** own questionnaire section state, criterion focus, or review-local utility-rail behavior.

### 2. Review shell

The **review shell** is nested under one review-scoped route prefix and owns review identity plus review-scoped navigation.

Canonical responsibilities:

- `reviewId` ownership;
- review summary metadata and review-scoped chrome;
- lifecycle/save/sync status strip;
- assignee and role summary;
- review-level tab/subview navigation;
- loading and retaining shared review metadata while subviews change;
- dispatch into the questionnaire workspace route and later review-scoped routes.

The review shell does **not** replace the questionnaire renderer. It wraps it.

### 3. Review workspace surface

The **review workspace surface** is the questionnaire itself, mounted as one review-shell subview.

Canonical responsibilities:

- page index;
- section workspace renderer;
- pager;
- utility rail and workspace-local reference/about/help/activity surfaces;
- section-local anchor and focus behavior;
- keyboard/focus behavior tied to questionnaire editing.

The current questionnaire stays here as the product’s permanent core work surface.

## Canonical route tree

The initial canonical route tree for the saved-review build-out is:

```text
/
/dashboard
/reviews
/reviews/:reviewId
/reviews/:reviewId/overview
/reviews/:reviewId/workspace/:sectionSlug
/settings/profile
/settings/application
/help
```

### Canonical route roles

| Route | Owner | Purpose | Notes |
|---|---|---|---|
| `/` | app shell | authenticated entry redirect | resolves to dashboard or other configured landing route |
| `/dashboard` | app shell | main landing surface for saved reviews | dashboard is not a questionnaire variant |
| `/reviews` | app shell | review list/search/filter surface | still app-level, not review-shell level |
| `/reviews/:reviewId` | review shell | review-root redirect | resolves to `overview` by default |
| `/reviews/:reviewId/overview` | review shell | review summary and jump-off surface | mandatory distinct review surface |
| `/reviews/:reviewId/workspace/:sectionSlug` | review shell + workspace surface | permanent questionnaire work route | canonical editable/read-only questionnaire location |
| `/settings/profile` | app shell | user profile/preferences | never implemented as questionnaire-local UI |
| `/settings/application` | app shell | app-level settings | separate from review state |
| `/help` | app shell | shared help/reference entry | app-level surface, not review identity owner |

### Reserved later review-shell routes

These are reserved as review-shell subviews, not standalone documents:

- `/reviews/:reviewId/activity`
- `/reviews/:reviewId/import-export`
- `/reviews/:reviewId/evidence`
- `/reviews/:reviewId/assignments`
- `/reviews/:reviewId/decision`
- later `/reviews/:reviewId/review-inbox`

The reservation matters because later phases must extend the existing review shell rather than inventing parallel review entrypoints.

## Route ownership rules

### Rule 1 — `reviewId` is review-shell owned

`reviewId` is canonical only when present as the route parameter under `/reviews/:reviewId/*`.

Therefore:

- `reviewId` must not be inferred from hash, local storage, or a questionnaire field;
- the dashboard, review list, and review overview resolve into review-scoped routes by constructing `/reviews/:reviewId/...` URLs;
- the questionnaire store may know which review is currently loaded, but that knowledge is derived from the route-owned review shell, not the other way around.

### Rule 2 — major-view identity is route-owned

The router/app shell must own the current major surface:

- dashboard;
- review list;
- review overview;
- review workspace;
- settings;
- help.

The current workspace store must not continue as the source of truth for app-level view identity.

### Rule 3 — section identity is route-owned by `:sectionSlug`

Within the questionnaire work surface, the canonical active section is the route param `:sectionSlug`.

Therefore:

- the active section is not canonical in `window.location.hash` once the routed shell exists;
- the active section is not canonical in `store.ui.activePageId` once the router exists;
- `store.ui.activePageId` becomes a derived/local mirror used by the compatibility workspace implementation.

### Rule 4 — focus and utility state are subordinate to the route, not peers of review identity

The following are workspace-local deep-link concerns that may be represented by query parameters or equivalent route-local state:

- focused criterion or summary anchor;
- active utility-rail tab;
- review-workspace sub-anchor position.

These must not compete with `reviewId` or major-view identity in the URL hierarchy.

## Dashboard vs review-shell boundaries

The boundary between dashboard/app-level work and review-scoped work is frozen here.

### App-shell only surfaces

These belong to the app shell and must not be implemented as review-shell subviews:

- dashboard;
- review list/search/filter queue;
- global settings;
- app-level help center;
- tooling workspace root;
- authenticated landing and session recovery flows.

### Review-shell only surfaces

These belong under `/reviews/:reviewId/*` and must not be implemented as separate product documents disconnected from the review shell:

- review overview;
- questionnaire workspace;
- review activity;
- review evidence library;
- assignments/handoff summary;
- decision/governance summary;
- later review inbox.

### Boundary rule

A surface that requires stable review identity, review-scoped chrome, or shared review metadata belongs to the review shell. A surface that can exist without loading one specific review belongs to the app shell.

## Section slug and hash behavior

The current codebase uses hash for page selection. That behavior is too broad for the routed saved-review application and is therefore narrowed here.

### Canonical workspace URL

The canonical workspace URL is:

```text
/reviews/:reviewId/workspace/:sectionSlug
```

This route alone identifies:

- which review is open;
- that the user is in the questionnaire workspace;
- which section page is active.

### Canonical section source

The canonical section source is the section registry slug already derived from `static/js/config/sections.js` and emitted by the current page-rendering path.

Accepted section identifiers for compatibility ingress may include:

- section id (`TR`, `S0`, `S10B`);
- canonical slug (`transparent`, `workflow-control`, or equivalent current slug values).

Canonical emitted URLs must use `:sectionSlug`, not section ids.

### Hash compatibility rule

Hash behavior is reduced to **workspace-local compatibility only**.

This means:

1. Outside the review workspace route, the hash has **no product-routing authority**.
2. Inside `/reviews/:reviewId/workspace/:sectionSlug`, a legacy hash may be read only to support compatibility entry from old links.
3. If a legacy hash resolves to a section slug while the routed shell is active, it must be normalized into the route path and removed from canonical ownership via `replaceState` or equivalent.
4. Hash must never be used to identify:
   - `reviewId`
   - major app subview
   - dashboard state
   - settings state
5. Hash may remain available for strictly local compatibility behaviors such as a temporary anchor bridge during migration, but query parameters or route-local state should own canonical deep links.

### Query-parameter rule for workspace-local deep links

The preferred canonical deep-link forms are:

- `?focus=:anchorId`
- `?utilityTab=guidance|reference|about|activity`

These are subordinate to the route-owned review and section identity and do not replace them.

### Page-id harvesting constraint

When the compatibility workspace reflects route section changes back into the existing questionnaire implementation, page-id harvesting must remain scoped to top-level rendered page sections only.

This freezes the existing repository constraint recorded in memory:

- top-level `data-page-id` elements define pages;
- nested descendants carrying `data-page-id` must not be treated as canonical pages;
- route/workspace synchronization must not broaden page harvesting across the entire subtree.

## File-level implementation analysis

The first-pass file-level analysis for the routed app-shell and nested review-shell model is frozen below.

### Current files that downstream implementation must reinterpret

| File | Current responsibility | Route-model requirement frozen here |
|---|---|---|
| `trust-framework.html` | Entire product shell and questionnaire entrypoint in one static document | Remains the single compatibility document during early saved-review delivery, but must be expanded into routed app-shell mounts rather than cloned into multiple standalone product HTML files. The current questionnaire shell becomes the review-workspace surface hosted inside the review shell. |
| `static/js/app.js` | Immediately bootstraps questionnaire-only runtime on page entry | Must become route-aware bootstrap orchestration. It should initialize the app shell first, then mount the questionnaire runtime only when the active route is a review-workspace route. Unconditional questionnaire-first entry is no longer canonical. |
| `static/js/behavior/context-tracking.js` | Treats hash as page owner and tracks active sub-anchor | Must be reduced to a workspace-local compatibility adapter. It may translate legacy hash into section/anchor intent, but canonical ownership moves to route params and query params. It must never remain the sole owner of review or section identity. |
| `static/js/behavior/navigation.js` | Owns page transitions, focus restoration, shell/drawer behavior | Must operate inside the review workspace surface rather than assuming ownership of the entire product shell. It remains a high-value compatibility layer for workspace transitions and focus behavior. |
| `static/js/state/store.js` | Mixes questionnaire domain state with active page UI state | May continue to mirror current page and local workspace UI concerns temporarily, but those values become downstream of router/review-shell state rather than app-level sources of truth. |

### Downstream files reserved by this contract

The contract also freezes the intended responsibility split for the planned downstream files named in Wave 2.

| Planned file | Responsibility reserved by this contract |
|---|---|
| `static/js/shell/routes.js` | Canonical route parsing, normalization, and ownership rules for app shell and review shell |
| `static/js/shell/app-shell.js` | App-shell bootstrap and route dispatch outside questionnaire internals |
| `static/js/render/app-shell.js` | App-level chrome and global route framing |
| `static/js/render/review-shell.js` | Review-scoped chrome, review metadata display, and subview outlet ownership |
| `static/js/pages/dashboard.js` | Dashboard view logic under app-shell ownership |
| `static/js/pages/review-overview.js` | Mandatory review overview surface under review-shell ownership |

These responsibilities must not be collapsed back into `trust-framework.html` as disconnected document-level variants.

## Permanent core-work-surface rule

The current questionnaire remains the permanent core work surface for review execution.

That rule means all of the following:

1. The canonical editing route for review content is `reviews/:reviewId/workspace/:sectionSlug`.
2. Dashboard, review overview, settings, and help surround the questionnaire; they do not replace it.
3. The review shell may add chrome, status, summary, and navigation around the questionnaire, but it does not redefine the questionnaire as a secondary detail panel.
4. Review-overview and other summary routes may surface the same data in summary form, but they must not fork the source-of-truth questionnaire fields into a parallel competing form model.
5. Later frontend rewrites may change the rendering technology, but they must preserve the questionnaire workspace as the canonical review execution surface.

## Explicit non-goals

This contract does **not** do any of the following:

- require React, Vite, or any specific frontend framework for initial implementation;
- define autosave cadence, dirty-state behavior, ETag usage, or conflict-resolution UX;
- define backend review DTOs or evidence persistence payloads;
- define public route guards, auth callbacks, or session-cookie behavior;
- move shared help/reference/about content yet;
- replace the current questionnaire renderer during Wave 0.

## Acceptance condition for downstream work

Any downstream implementation or design that claims to follow this contract must satisfy all of the following:

- it preserves **one routed application document** rather than multiple standalone product HTML entrypoints;
- it makes app-shell and review-shell ownership explicit;
- it gives `reviewId` ownership to `/reviews/:reviewId/*` routes;
- it provides a distinct `reviews/:reviewId/overview` route;
- it keeps the current questionnaire as the canonical `reviews/:reviewId/workspace/:sectionSlug` work surface;
- it demotes legacy hash behavior to a workspace-local compatibility concern only;
- it does not let dashboard, settings, or help surfaces become questionnaire-local pseudo-routes;
- it does not let router/store/page-hash responsibilities remain ambiguous.

## Contract summary

This document freezes the routed shell model required by the saved-review application: one app shell, one nested review shell, and one canonical questionnaire workspace route. The dashboard and other global surfaces stay app-level, review identity belongs to the review shell, section identity belongs to `:sectionSlug`, and legacy hash behavior is retained only as a compatibility bridge inside the workspace rather than as the product’s top-level routing system.
