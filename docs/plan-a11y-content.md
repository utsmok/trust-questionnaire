# Accessibility, keyboard navigation, content, guidance, tooltip, and UI polish plan

Date: 2026-04-06
Mode: planning only
Scope boundary: no application code changes are included in this document.

## 1. Objective and current constraints

This phase should consolidate five currently entangled concerns into one coherent operating model:

1. keyboard-first interaction,
2. accessibility architecture,
3. in-app content and guidance delivery,
4. tooltip and surface behavior,
5. rendering stability and visual polish.

The current application already contains usable groundwork. It is not starting from zero. The next phase should therefore avoid wholesale replacement and instead remove the architectural seams that are now causing drift, hidden state, and unnecessary rerendering.

The implementation must remain aligned with the product identity documented in `.github/copilot-instructions.md`: dense, explicit, engineered, keyboard-first, and resistant to consumer-style simplification. The correct direction is not to remove information. The correct direction is to move information into the right layer, reduce duplication, and expose state without forcing the user to hover or guess.

## 2. Current-state assessment

### 2.1 Shell, navigation, and surface topology

The application shell in `trust-framework.html` is already structurally close to the desired model:

- primary work area: `#questionnairePanel`
- context surface: `#frameworkPanel`
- drawer backdrop: `#contextDrawerBackdrop`
- page index mount: `#pageSidebarMount`
- contextual guidance mount: `#contextSidebarMount`
- reference mount: `#referenceDrawerMount`
- about mount: `#aboutPanelMount`
- help legend mount: `#helpLegendMount`

The main orchestration point is `static/js/behavior/navigation.js`. It initializes and synchronizes:

- `createSidebarRenderer()`
- `createPagerController()`
- `createContextTrackingController()`
- `createReferenceDrawersRenderer()`
- `createAboutPanelController()`
- `createHelpPanelController()`

This is the correct high-level place for shell coordination, but the current sync path is too broad. `syncFromState()` updates pager, sidebar, reference drawers, about panel, help panel, page visibility, active accent, sidebar state, shell progress, titles, and panel metrics in one pass. That is acceptable for page changes. It is not acceptable for high-frequency scroll metrics.

### 2.2 Keyboard behavior already present

Verified current keyboard behavior:

- `static/js/behavior/keyboard.js`
  - `Alt+1`…`Alt+5` jump to `TR`, `RE`, `UC`, `SE`, `TC`
  - `Alt+t`, `Alt+r`, `Alt+u`, `Alt+s`, `Alt+c` provide redundant principle jumps
  - rating scales support arrow keys plus `Enter`/`Space`
- `static/js/behavior/navigation.js`
  - `Escape` closes the context drawer in narrow-screen mode
  - sidebar tablist supports arrow-key movement
- `static/js/behavior/field-handlers.js`
  - score dropdown supports `Enter`, `Space`, arrow movement, `Home`, `End`, `Escape`
- native buttons provide baseline `Tab` access across the completion strip, page index, context anchor list, and evidence actions.

This confirms the user statement that the keyboard groundwork exists but is incomplete.

### 2.3 Focus management already present

Verified current focus behavior:

- `navigation.js` contains `focusElementWithRetry()` and uses it for drawer close and page-section targeting.
- `evidence.js` uses `createFocusTrap()` for the evidence lightbox.
- `confirm-dialog.js` implements a second, separate focus trap internally.
- inactive page sections are marked `inert` in `navigation.js`.
- the narrow-screen drawer returns focus after close using delayed handoff logic.

Repository memory confirms two constraints that should be preserved:

- `/memories/repo/context-drawer-focus-return.md`: close-time focus restoration can race with `inert` cleanup; delayed restore to a stable toggle is the robust pattern.
- `/memories/repo/navigation-page-id-scope.md`: active-page routing must only inspect top-level `[data-page-id]` children, not nested descendants.

The current implementation follows these constraints in several places. Any refactor must preserve them.

### 2.4 Content and guidance delivery already present

Content is currently split across at least five storage patterns:

1. inline contextual guidance in `trust-framework.html` under `#contextSidebarMount`
2. inline reference drawer content in `trust-framework.html` under `#referenceDrawerMount`
3. inline about content in `trust-framework.html` under `#aboutPanelMount`
4. hardcoded help summaries and shortcut table rows in `static/js/render/help-panel.js`
5. field-level `tooltip` and `notes` data in `static/js/config/questionnaire-schema.js`
6. routing metadata and `sourceRefs` in `static/js/config/sections.js`

This is the central content-maintenance problem.

The renderers currently move DOM content rather than rendering from a single structured source:

- `sidebar.js` extracts literal context sections and re-parents them into the generated context shell.
- `about-panel.js` extracts about-topic sections and re-parents them into the about panel view.
- `help-panel.js` synthesizes content from a hardcoded `PAGE_HELP_SUMMARIES` object and a hardcoded shortcut row array.

This arrangement creates duplication, stale references, and inconsistent update paths.

### 2.5 Verified shortcomings

#### 2.5.1 Sidebar flicker during scrolling is likely architecture-driven

The strongest current root cause is not CSS alone. It is the rendering loop.

Observed sequence:

1. `navigation.js` attaches `scroll` listeners to `#questionnairePanel` and `#frameworkPanel`.
2. Each listener calls `updatePanelMetricsFromDom()`.
3. `updatePanelMetricsFromDom()` dispatches `store.actions.setPanelMetrics()`.
4. Any changed `progressPercent` produces a store update.
5. every store update runs `syncFromState()`.
6. `syncFromState()` calls `sidebar.sync(state)`, `helpPanel.sync(state)`, `aboutPanel.sync(state)`, and `referenceDrawers.sync(state)`.
7. `sidebar.sync()` rebuilds major DOM regions via `clearChildren()` in `renderPageIndex()`, `renderRouteCard()`, `renderAnchorCard()`, and `renderContextContent()`.

This means panel scroll is still coupled to full sidebar rerendering.

The recent `setPanelMetrics()` equality check in `static/js/state/store.js` reduces no-op updates, but it does not solve the main case. During actual scroll, `progressPercent` changes continuously. The sidebar still rerenders continuously.

Repository memory adds corroboration:

- `/memories/repo/playwright-nav-rerender.md` notes that page-index and quick-jump controls rerender during activation strongly enough that Playwright `.click()` becomes unstable.

That is the same architectural smell as the reported flicker.

Secondary contributors:

- `sidebar.js` places `aria-live="polite"` on `.context-route-card`, which is rebuilt frequently.
- `renderPageIndex()` recreates the page-index collapse control on every sync and binds `onclick` inline.
- `layout.css` recently added `contain: layout style paint` to `.page-index-column` and `.questionnaire-workspace`; that may improve layout isolation, but if compositor artifacts remain after the JS rerender fix, this containment should be re-tested on the sticky page-index container.

#### 2.5.2 Tooltip behavior is accessible only in a narrow sense

`static/js/render/dom-factories.js#createTooltipTrigger()` currently:

- renders `.tooltip-trigger`, `.tooltip-trigger-btn`, and `.tooltip-content`
- sets both `title` and a custom tooltip surface
- shows on hover delay and focus
- hides on blur, mouseleave, or outside click
- uses only top/bottom flipping via `.is-flipped`

Current problems:

- native `title` duplicates the custom tooltip and can produce double or conflicting announcements
- the tooltip button label is only the field label, not an explicit help action
- the tooltip content is not the correct place for long procedural guidance
- the tooltip is pointer-inert (`pointer-events: none` in CSS), so long content cannot be interacted with or copied
- the placement model is too limited for dense forms and narrow drawers
- the tooltip system is not generated from a governance-controlled content source

The recent tooltip change (`bf2479d`) widened the panel from `18rem` to `28rem` and shrank the trigger from `44px` to `28px`. That was a local readability patch. It did not solve the architectural problem.

#### 2.5.3 Compactness changes have crossed into hidden-state territory

Recent CSS compaction introduced several visibility regressions:

- `.criterion-card > p { display: none; }` in `static/css/components.css`
- `.field-group[data-field-id$='.evidence'] .field-label { display: none; }`
- the main questionnaire heading is visually hidden in `trust-framework.html`
- the questionnaire caption is hidden with inline `style="display:none"`

The product is dense, not minimalist. Hiding criterion statements and evidence labels moves the UI away from the documented explicitness requirement.

#### 2.5.4 Help content is already drifting from real behavior

`static/js/render/help-panel.js` hardcodes shortcut rows rather than deriving them from `keyboard.js`. That is already a drift source.

Examples:

- the help panel describes `Alt+t`, `Alt+r`, `Alt+u`, `Alt+s`, `Alt+c` in broad prose instead of using the actual registry in `keyboard.js`
- it does not describe score-dropdown commands, evidence interactions, or scope-specific key behavior
- it is not conflict-audited for Linux/browser combinations

#### 2.5.5 Source references already contain stale documentation pointers

`static/js/config/sections.js` still contains verified stale `sourceRefs`.

Example:

- `context.workflow-control` references `docs/improvement_03_04_2026/02_navigation_sidebar_pagination.md`

That path was removed in the last 24 hours. The app therefore already ships stale reference metadata.

#### 2.5.6 Dialog and trap behavior is duplicated

Current duplication:

- `static/js/utils/focus-trap.js` provides one trap implementation
- `static/js/utils/confirm-dialog.js` reimplements tab trapping internally
- `navigation.js` handles drawer focus separately
- `field-handlers.js` handles score-dropdown close/restore locally

This is the wrong long-term model. Surface behavior should be centralized.

#### 2.5.7 Live region strategy is too coarse and too noisy

Current state:

- `.context-route-card` is `aria-live="polite"`
- validation messages are created with `role="alert"`
- evidence status text uses `aria-live="polite"`

Problems:

- rebuilding entire route cards can create repeated announcements for non-critical changes
- `role="alert"` on field validation messages can become noisy if state sync repeats unchanged invalid content
- there is no single authoritative status region for page navigation, drawer state, criterion skip state, or successful keyboard actions

## 3. Target operating model

The next phase should establish one explicit interaction model with four properties:

1. every surface has a defined keyboard scope,
2. every change in visible state has a defined focus rule,
3. every help layer has a defined information density and ownership rule,
4. high-frequency scroll and animation state do not trigger full sidebar rerenders.

The correct end-state is not “more accessibility features.” The correct end-state is “fewer conflicting interaction systems.”

## 4. Keyboard-first interaction model

### 4.1 Shortcut inventory and conflict policy

The application should stop treating the current `Alt+...` bindings in `keyboard.js` as a final scheme.

They should be treated as interim behavior only.

A central shortcut registry should replace the current hardcoded split across:

- `keyboard.js`
- `help-panel.js`
- dropdown-local handlers in `field-handlers.js`
- drawer Escape logic in `navigation.js`

Recommended direction:

- define one registry with command ids, scope, default chords, platform exceptions, `aria-keyshortcuts`, help text, and discoverability labels
- gate global shortcuts while focus is inside text-entry controls (`input`, `textarea`, `select`, inline note editors) unless the command is explicitly allowed
- maintain a conflict matrix for Linux browser defaults, assistive technology, and common keyboard-layout switching combinations
- generate help-table content from the registry rather than hardcoding it

Recommended command families:

- global navigation: previous page, next page, jump to principle page, toggle sidebar/drawer, switch sidebar tab, open shortcut help
- surface-local: anchor-list movement, completion-strip movement, page-index movement, reference drawer traversal
- widget-local: score dropdown, tooltip/popover help, evidence preview, inline note editing
- universal: `Escape` closes the highest-priority active surface

Exact chords should not be finalized until the conflict audit is complete. The current `Alt+1…5` and `Alt+t/r/u/s/c` mappings should be specifically validated on Linux before being retained.

### 4.2 Focus order strategy

The focus order should become explicit and stable:

1. skip links
2. header completion strip
3. header-level shell actions (`#sidebarToggle`, future help toggle)
4. page index
5. pager
6. active page section heading
7. active page controls in DOM order
8. contextual surface tablist
9. active contextual panel content
10. modal or drawer surfaces when invoked

Rules:

- only one composite entry point per navigation cluster should be in the tab order
- dense clusters should use roving tabindex internally rather than exposing dozens of equally weighted stops
- inactive page sections remain `inert`
- when the context surface becomes a drawer, it becomes the only interactive scope until closed

### 4.3 Navigation without mouse fallback

The following interactions should be fully keyboard-operable without requiring mouse parity workarounds:

- page switching from completion strip, page index, pager, and principle jumps
- criterion-anchor movement inside the current page
- sidebar-tab switching
- opening reference drawers
- switching about topics
- opening and dismissing contextual help
- evidence intake, preview, note editing, unlink, and remove operations

Current gaps to close:

- no roving arrow-key model for `.completion-strip`
- no roving model for `.page-index-list`
- no anchor-list arrow navigation for `.context-anchor-list`
- no unified “open keyboard help” command
- no scope-aware documentation of active commands

### 4.4 Dialogs, drawers, tooltips, dropdowns, and evidence interactions

The application should adopt a single surface stack.

Surface priorities should be:

1. confirm dialog
2. evidence lightbox
3. context drawer
4. score dropdown / future popover help
5. page-level navigation shell

Rules:

- only the top surface receives `Escape`
- focus is trapped only for modal surfaces, not for simple anchored popovers
- close returns focus to the invoking control or a stable fallback
- the fallback for drawer close should remain the stable sidebar toggle pattern documented in repository memory
- score-dropdown close should restore focus to the trigger only if the user has not intentionally tabbed away
- evidence note editing should announce save or cancel state in a dedicated status region

### 4.5 Discoverability and inline shortcut help

Discoverability should be explicit, not hidden behind onboarding.

Recommended approach:

- keep a persistent help/shortcut surface in the context area
- show compact `kbd` hints beside the most critical controls: page index, pager, sidebar toggle, reference drawers
- expose `aria-keyshortcuts` where appropriate
- generate the help view from the actual registry
- add a compact “active scope shortcuts” subsection that changes with focus context

## 5. Accessibility architecture plan

### 5.1 Semantic structure

Current semantic structure is serviceable, but several widgets need formalization.

Required next-step semantics:

- preserve the `header` / `nav` / `main` / `section` / `aside` layout already present in `trust-framework.html`
- keep top-level questionnaire pages as direct `root.children` with stable `[data-page-id]` scope
- formalize score dropdown semantics as one coherent pattern rather than a custom `div` listbox with manual focus only
- ensure evidence intake exposes a visible and named browse action; a drop zone alone is not sufficient as a primary control model
- treat long-form help as panels or drawers, not as tooltips
- preserve section and criterion statements as visible dense text, not hidden paragraphs

### 5.2 Focus management patterns

The application should implement one shared focus/surface manager.

It should cover:

- open/close lifecycle
- focus capture
- delayed restore
- trap activation for modal surfaces
- initial focus target selection
- inert sibling management
- nested surface priority resolution

This manager should replace the current split across:

- `navigation.js`
- `focus-trap.js`
- `confirm-dialog.js`
- `evidence.js`
- local dropdown handlers

### 5.3 Reduced motion

The codebase already has usable reduced-motion groundwork in `static/css/animations.css` and recent token work (`34f267f`).

The next phase should extend it consistently:

- remove smooth scrolling where present when reduced motion is active (`sidebar.js` currently uses `scrollIntoView({ behavior: 'smooth' })` when opening reference drawers)
- ensure tooltip/popover transitions resolve immediately under reduced motion
- keep page transitions functionally correct when transition durations are zero
- audit all future surface transitions against the same token set

### 5.4 Live regions and status messaging

Recommended status model:

- one global off-screen `role="status"` region for navigation and surface state
- one assertive but narrow error channel for blocking validation transitions only
- local polite regions for evidence add/remove/export results
- remove `aria-live` from entire cards or panels that are fully rerendered

Specific changes to plan for:

- replace `.context-route-card[aria-live="polite"]` with explicit announcement events such as “Page changed to Reliable” or “Context pinned to RE2”
- avoid re-announcing identical validation messages on each state sync
- announce criterion skip and resume actions explicitly

### 5.5 Screen-reader and forced-colors considerations

Required additions:

- remove reliance on `title` for essential help text
- ensure hidden labels become visually hidden, not semantically removed where names are still needed
- add `@media (forced-colors: active)` coverage for focus rings, borders, state chips, and score indicators
- verify that section-accent meaning is not color-only; pair every state with text or code labels
- ensure all icon-only or symbol-only controls have explicit action labels

## 6. Content and guidance overhaul

### 6.1 Problem statement

Content is currently over-embedded, over-duplicated, and under-governed.

The problem is not simply that some text is verbose. The problem is that the same conceptual guidance exists in multiple technical locations with different update paths:

- field microcopy in `questionnaire-schema.js`
- page/topic metadata in `sections.js`
- contextual prose in `trust-framework.html`
- shortcut explanations in `help-panel.js`
- layout-driven hiding in `components.css`

That is why parts of the content are outdated, overly long, or mutually inconsistent.

### 6.2 Target content architecture

Recommended content layers:

#### Layer A — field-local microcopy

Owner: schema layer
Recommended location: `static/js/config/questionnaire-schema.js`

Allowed content types:

- label
- placeholder
- short tooltip or micro-definition
- concise notes explaining what satisfies the field

Not allowed here:

- long procedural guidance
- policy essays
- workflow overview text
- duplicated framework definitions

#### Layer B — page and criterion guidance

Owner: dedicated content registry
Recommended location: new structured content module(s), separate from `trust-framework.html`

Allowed content types:

- page summary
- criterion-specific interpretation notes
- “what to do here” bullets
- evidence expectations
- links to relevant reference drawers and about topics

This layer should be keyed by `pageId`, `criterionCode`, and optionally `fieldId`.

#### Layer C — stable framework reference

Owner: domain content + product governance
Recommended location: structured content registry, rendered in the Reference and About surfaces

Allowed content types:

- scoring scale
- recommendation categories
- evidence requirements
- framework overview
- governance workflow
- scope definitions

Long-form documents in `docs/` remain the canonical sources, but the application should render curated excerpts, not raw duplicated prose blocks.

### 6.3 Strategy for rewriting tooltips

Tooltips should be rewritten under a strict rule set:

- maximum function: define a term or disambiguate a field
- maximum density: one short paragraph or two short sentences
- no procedural instructions longer than can be scanned in under two seconds
- no policy summaries that belong in the context or reference surfaces
- no stale workflow references

If content fails those rules, it should move to:

- inline field help,
- page guidance,
- or the reference/about surfaces.

### 6.4 Strategy for rewriting sidebar guidance, help, about, and reference content

Recommended information architecture:

- **Guidance** = page-local and criterion-local operational guidance
- **Reference** = stable standards, scales, evidence requirements, controlled vocabularies
- **About** = framework purpose, scope, governance, and review model
- **Shortcuts/help** = generated from the shortcut registry and interaction model, not hardcoded prose

Current implementation details that should be retired:

- literal contextual sections embedded in `trust-framework.html` as the primary source of truth
- hardcoded `PAGE_HELP_SUMMARIES` in `help-panel.js`
- hardcoded shortcut row arrays in `help-panel.js`
- stale `sourceRefs` in `sections.js`

### 6.5 Removal of stale documentation links

A content audit should explicitly validate every `sourceRefs` entry in `static/js/config/sections.js`.

Verified stale example already present:

- `docs/improvement_03_04_2026/02_navigation_sidebar_pagination.md`

The next phase should add a content-validation step that fails when:

- a referenced source file does not exist,
- a heading fragment no longer resolves,
- or a page/topic points to an implementation plan rather than an enduring canonical source.

### 6.6 Bringing relevant guidance into the app without recreating documentation debt

The correct model is not to paste the full docs into the app.

The correct model is:

- keep canonical source material in `docs/`
- curate compressed in-app guidance in a structured registry
- attach source references and last-reviewed metadata to each content block
- render only the guidance relevant to the current page, criterion, or task scope

## 7. Tooltip redesign and UI polish direction

### 7.1 Tooltip redesign direction

Tooltips should become compact, accessible anchored help popovers with these rules:

- triggered by an explicit help control
- no native `title`
- left-aligned text
- width constrained by readable character count rather than arbitrary narrow columns
- viewport-aware placement on all sides, not only above/below
- keyboard open via `Enter`/`Space`, close via `Escape`
- not used for text that would be better as inline field help or context guidance

### 7.2 Form-density and readability support adjustments

The next phase should reverse the recent tendency to hide context for compactness.

Recommended adjustments:

- restore criterion statements as compact secondary text instead of `display:none`
- stop fully hiding evidence labels; use concise visible labels or visually hidden labels only when the surrounding block title already provides the same accessible name
- make field ids, criterion codes, and page codes more visible where they support auditability
- keep dense spacing, but standardize label/help/validation rhythm
- ensure every hidden text removal is justified against the “explicit is better than implicit” product rule

### 7.3 Confirm dialog and lightbox polish

Current confirm-dialog styling is injected at runtime by `confirm-dialog.js` and maintains its own trap. That is acceptable as an emergency utility. It is not suitable as the long-term surface system.

The next phase should consolidate:

- visual tokens,
- focus behavior,
- `Escape` handling,
- return-focus rules,
- and announcement behavior.

## 8. Prioritized remediation backlog

| ID | Priority | Problem statement | Current references | Recommended outcome | Dependencies |
|---|---|---|---|---|---|
| A11Y-01 | P0 | Scrolling the questionnaire or context panel still drives full sidebar rerenders, which is the most likely source of the reported sidebar flicker. | `navigation.js`, `sidebar.js`, `store.js`, `.page-index-column`, repo memory `playwright-nav-rerender` | split scroll metrics from sidebar/content rendering; sidebar updates only on route/progress/tab changes | none |
| A11Y-02 | P0 | Focus behavior is distributed across multiple modules with duplicated trap logic and inconsistent restore rules. | `navigation.js`, `focus-trap.js`, `confirm-dialog.js`, `evidence.js` | introduce one surface/focus manager for drawer, dialog, lightbox, dropdown, and future popovers | A11Y-01 not required |
| CONTENT-01 | P0 | Guidance, reference, and about content are stored in multiple places and already include stale references. | `trust-framework.html`, `help-panel.js`, `about-panel.js`, `sidebar.js`, `sections.js`, `questionnaire-schema.js` | create structured content registry and retire inline HTML as primary source of truth | none |
| TOOLTIP-01 | P0 | Tooltip system is semantically weak, duplicates native `title`, and carries content that should live elsewhere. | `dom-factories.js`, `.tooltip-*` rules in `components.css` | replace with a compact accessible popover-help model and rewrite tooltip copy scope | CONTENT-01 |
| KB-01 | P1 | Shortcut definitions are ad hoc, incomplete, and not conflict-audited for Linux/browser combinations. | `keyboard.js`, `help-panel.js` | implement central shortcut registry with scope model, discoverability, and conflict table | none |
| KB-02 | P1 | Dense navigation clusters expose many tab stops and lack roving keyboard models. | `.completion-strip`, `.page-index-list`, `.context-anchor-list`, sidebar tablist | reduce tab-stop count and add arrow-key movement patterns | KB-01 |
| A11Y-03 | P1 | Score dropdown keyboard groundwork exists, but semantics and focus lifecycle remain local and fragile. | `field-handlers.js`, `dom-factories.js`, `questionnaire-pages.js` | formalize dropdown/listbox semantics and integrate with the shared surface manager | A11Y-02 |
| A11Y-04 | P1 | Live-region behavior is noisy and not intentionally scoped. | `.context-route-card`, `.validation-message`, `.evidence-status` | move to dedicated status regions and narrow alerts to blocking events only | A11Y-02 |
| UI-01 | P1 | Recent compactness work hides criterion statements and evidence labels, reducing explicitness and scanability. | `components.css`, `trust-framework.html` | restore compressed visible context rather than hiding it | CONTENT-01 |
| A11Y-05 | P2 | Reduced-motion support exists but is not fully applied to all surface transitions and scroll behavior. | `animations.css`, `sidebar.js`, `components.css` | complete reduced-motion coverage for drawers, reference jumps, tooltips, and surface transitions | A11Y-02 |
| A11Y-06 | P2 | High-contrast and forced-colors behavior is not explicitly supported. | `tokens.css`, `interaction-states.css`, `components.css` | add `forced-colors` rules and verify text/non-color redundancy | A11Y-04 |
| CONTENT-02 | P2 | There is no governance mechanism that keeps in-app help aligned with framework and product changes. | `sections.js`, `questionnaire-schema.js`, docs | add content validation, ownership rules, and review checkpoints | CONTENT-01 |

## 9. Phased sequencing

### Phase 0 — audit and source-of-truth consolidation

Deliverables:

- content inventory matrix
- shortcut inventory and conflict matrix
- surface inventory (drawer, dialog, lightbox, dropdown, tooltip)
- stale `sourceRefs` list

Do not begin copy rewrites before this inventory exists.

### Phase 1 — render-path stabilization and focus architecture

Deliverables:

- sidebar rerender split
- shared surface/focus manager
- drawer trap and restore behavior aligned with current delayed focus-return constraints
- removal of broad `aria-live` usage on rerendered shells

This phase should precede visual polish. Otherwise the UI will remain unstable during testing.

### Phase 2 — keyboard model completion

Deliverables:

- centralized shortcut registry
- roving focus patterns for dense navigation lists
- keyboard help generated from the registry
- explicit scope handling for dialogs, drawers, dropdowns, and inline editors

### Phase 3 — content migration and rewrite

Deliverables:

- structured content registry
- migrated page guidance, reference content, and about content
- tooltip rewrite pass
- stale link removal
- hardcoded help summaries removed

### Phase 4 — tooltip and readability polish

Deliverables:

- tooltip/help popover redesign
- criterion statement reintroduction in dense compact form
- evidence and validation label cleanup
- high-contrast review
- reduced-motion completion

### Phase 5 — verification and governance hardening

Deliverables:

- accessibility regression pass
- keyboard-only scenario test matrix
- content validation checks
- owner and review workflow documented for future copy changes

## 10. Risks and dependencies

### 10.1 Primary risks

- Replacing DOM-extraction content rendering with structured rendering can break current topic routing if page/topic ids drift.
- Shortcut redesign can create browser or OS conflicts if finalized without Linux validation.
- Sidebar rerender splitting can accidentally desynchronize progress strip, route card, and page index if state channels are not separated carefully.
- Reintroducing visible criterion text without density discipline can regress the intended compactness.

### 10.2 Verified dependencies

- focus-return behavior must preserve the stable-toggle fallback documented in repository memory
- top-level `[data-page-id]` scoping must not regress during any navigation or content-rendering refactor
- content registry work depends on domain review because framework wording is normative, not decorative
- test expectations around rerender timing may need to be updated once the sidebar stops rebuilding on scroll

## 11. Process and ownership model

### 11.1 Content audit approach

The content audit should classify every copy fragment by:

- source file
- target surface
- key or selector (`pageId`, `criterionCode`, `fieldId`, `topicId`, DOM id, class)
- owner
- current length
- canonical source document
- stale/duplicate flag
- whether the content is currently hover-only, visually hidden, or structurally moved by JS

Minimum audit scope:

- `trust-framework.html`
- `static/js/render/help-panel.js`
- `static/js/render/about-panel.js`
- `static/js/render/sidebar.js`
- `static/js/config/sections.js`
- `static/js/config/questionnaire-schema.js`

### 11.2 Ownership recommendation

Recommended ownership split:

- **Domain owner**: framework text, scoring guidance, evidence rules, governance guidance
- **Product/UX owner**: in-app compression, information hierarchy, tooltip scope, surface placement
- **Engineering owner**: ids, routing, render model, shortcut registry, accessibility mechanics

Field-level copy should remain close to the field schema. Page/reference/about copy should not.

### 11.3 Keeping help content aligned with future product changes

Required maintenance controls:

- a content registry with `sourceRefs`, `owner`, and `lastReviewed`
- link validation for `sourceRefs`
- tests ensuring every page/topic has registered guidance or an explicit empty state
- shortcut help derived from the real registry, never duplicated prose
- PR checklist item for “content or shortcut impact”
- domain review for any framework-definition changes

## 12. How the last 24 hours of git activity should influence this plan

Recent work should be treated as partial groundwork, not as finished architecture.

### 12.1 Changes to preserve

- `db063c4` (`fix(navigation): use focusElementWithRetry...`) confirms that focus flakiness is real and that retry-based focus handoff is the correct local pattern.
- `4df3748` (`feat(score-dropdown): add keyboard navigation...`) should be preserved and folded into the broader surface/keyboard model rather than replaced.
- `34f267f` (`fix(animations): add reduced-motion duration-slow token...`) establishes the correct token-based reduced-motion strategy.
- `9dd3a3c` (`fix drawer backdrop state management`) establishes the current data-attribute-driven drawer state approach and should remain intact.

### 12.2 Changes to treat as incomplete or provisional

- `bf2479d` added layout containment and tooltip width changes. These are mitigations, not a confirmed fix for sidebar flicker or tooltip usability.
- `37db684` removed redundant labels and hidden visible text. Some of that work improved density, but some of it crossed into reduced explicitness. The next phase should selectively reverse the hiding behavior while keeping the density gains.

### 12.3 Practical planning consequence

The next phase should not restart keyboard support, drawer behavior, or reduced-motion work from scratch. It should build directly on the patterns introduced in the last 24 hours, while correcting the remaining architectural gaps:

- scroll-driven rerender coupling,
- content-source fragmentation,
- tooltip misuse,
- and duplicated focus/surface logic.

## 13. Recommended next implementation order

If implementation starts immediately after this plan, the most defensible order is:

1. stop scroll-driven sidebar rerenders,
2. unify focus and surface handling,
3. centralize shortcut definitions and roving navigation,
4. migrate help/reference/about/context content into a structured registry,
5. redesign tooltips and restore explicit visible context where it was hidden,
6. finish reduced-motion, screen-reader messaging, and forced-colors coverage.

That order minimizes regressions and prevents copy or polish work from being built on an unstable render path.
