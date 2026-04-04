# Review: Arrange & Distill Findings

Reviewers: arrange + distill skill lenses
Date: 2026-04-04
Source: CONSOLIDATED_FINDINGS_REPORT.md validated against source files

---

## 1. Arrange Findings

### 1.1 Confirmed issues

All layout issues in the report are technically accurate:

- **Duplicate navigation (3.1)** — Confirmed. `completion-strip` (`trust-framework.html:44`) renders non-clickable `<li>` elements with `aria-hidden="true"`. `quickJumpMount` (`trust-framework.html:45`) renders functional principle buttons. Both occupy header space and display overlapping data.
- **Reference drawers above form (4.3)** — Confirmed. `#referenceDrawerMount` sits at `trust-framework.html:75`, between the panel header and `workspace-layout` grid. Three `<details>` drawers push all form content down on every page.
- **Surface z-index covers header (2.4)** — Confirmed. `.shell-surface` z-index 40 (`layout.css:327`) exceeds `.site-header` z-index 25 (`layout.css:15`). The tokens.css z-index scale confirms this: `--z-surface: 40` vs `--z-header: 25`.
- **Accent scoping wipes per-section colors (3.2)** — Confirmed. The `:where()` block at `accent-scoping.css:113-136` overrides `--section-accent` (and 4 related tokens) on `.strip-cell`, `.page-index-button`, and `.nav-button[data-page-id]` to the active section's values. The `data-accent-key` attributes are set correctly in JS but no CSS rule uses them for per-element resolution.
- **Sidebar width fixed (2.10)** — Confirmed. Grid column `minmax(20rem, 28rem)` at `layout.css:229` with no resize mechanism.

### 1.2 Layout issues the report missed

#### 1.2.1 Spacing scale exists but is unused

`tokens.css:349-358` defines a complete spacing scale (`--space-1` through `--space-12`). However, virtually every value in `layout.css` and `components.css` uses hardcoded pixel values instead: `6px`, `8px`, `10px`, `12px`, `14px`, `16px`, `18px`, `20px`, `22px`, `24px`, `48px`. This means:

- Spacing is inconsistent (e.g., `gap: 18px` in `header-inner` vs `gap: 22px` in `workspace-layout` vs `gap: 24px` in `questionnaire-shell`)
- Any layout change will perpetuate the inconsistency unless the scale is adopted first
- The report's proposed changes (sidebar tabs, nav consolidation) should use the scale, but the report doesn't mention it

**Recommendation**: Before Phase 5 (navigation consolidation) or Phase 8 (sidebar architecture), audit `layout.css` and `components.css` to replace hardcoded spacing with scale tokens. This is a prerequisite for layout changes producing consistent results.

#### 1.2.2 Framework panel content width is too narrow

`layout.css:262` constrains `.framework-panel .panel-inner` to `max-width: 560px`. Combined with the panel's grid column (`minmax(20rem, 28rem)`), the content area for context, reference drawers, and about/help surfaces is very tight. This has two consequences:

1. Moving reference drawers to the sidebar (Issue 4.3) will squeeze tables and multi-column card grids into 560px. The scoring model table (`trust-framework.html:155-176`) and evidence requirements grid (`trust-framework.html:226-267`) need horizontal space.
2. The sidebar tab merger (Issue 2.8) adds a tab bar that further reduces vertical space in this narrow panel.

**Recommendation**: The report should either (a) propose removing `max-width: 560px` from the framework panel, or (b) account for the constraint when designing the tab layout and reference drawer placement.

#### 1.2.3 Nested card structures in context sidebar

The context sidebar currently renders four card-like containers inside `#contextSidebarMount`: `context-route-card`, `context-anchor-card`, `context-generated-slot`, and `context-topic-stack`. Each has borders, backgrounds, and padding (`components.css:1110-1119`). The `context-topic-stack` appends `doc-section` elements which themselves have `border: 1px solid`, `border-left: 6px solid`, `background`, and `padding: 18px 20px` (`components.css:87-97`). This creates cards-within-cards nesting.

The report doesn't flag this as a layout issue. When the sidebar tab merger adds a tab bar above these cards, the nesting depth increases further.

**Recommendation**: The sidebar tab proposal (Issue 2.8) should specify that the inner containers (`route-card`, `anchor-card`) should lose their card styling (borders, backgrounds) and rely on spacing alone for grouping. Reserve card treatment for the tab panels themselves.

#### 1.2.4 Panel progress bars and shadow pseudo-elements create edge noise

Both panels have:
- A `panel-progress` bar (4px, sticky, z-index 5) at `layout.css:86-104`
- `::before` and `::after` pseudo-elements (6px each) that create gradient shadow edges at `layout.css:173-203`

Together these occupy 16px of vertical space at panel edges with competing visual purposes (scroll progress indicator vs. shadow mask). The progress bar is nearly invisible at 4px, while the shadow pseudo-elements have `opacity: 0` by default.

**Recommendation**: This is minor but should be cleaned up during the sidebar refactor. Keep one edge indicator, remove the other. The progress bars are more useful.

#### 1.2.5 Header grid creates ambiguous column sizing on medium screens

`layout.css:24-28` uses `grid-template-columns: auto 1fr auto` for `.header-inner`. The completion strip sits in the middle `1fr` column while brand takes `auto` and nav takes `auto`. When the completion strip has 13 cells at medium viewport widths (e.g., 900-1160px), it competes for space with nothing constraining it, and the nav buttons wrap awkwardly. There is no responsive breakpoint between 760px and the implicit 1160px shell breakpoint.

**Recommendation**: The navigation consolidation (Issue 3.1) should address this by defining explicit column sizing for the consolidated bar. The report's step 5 ("Move Context/Info/Help toggles to the right end of the completion strip bar") would place action buttons inside the `1fr` column, which is better than the current layout but still needs a defined column template.

### 1.3 Assessment of proposed layout changes

#### Sidebar tabs (Issue 2.8) — Sound, with caveats

The three-surfaces-to-one-tabbed-sidebar merger is architecturally correct. It eliminates z-index issues, reduces state management complexity, and provides a consistent content location.

**Caveats**:
- The `max-width: 560px` constraint must be relaxed or the tab content will be cramped
- The tab bar itself needs 3 labels (Context, Info, Help) to fit in a narrow panel. Consider icon-only tabs or a segmented control instead of text labels
- The migration steps in the report are correctly ordered (fix help panel first, then merge)
- The report correctly identifies the cost (~200 lines of `navigation.js` refactoring) but underestimates the CSS changes needed — `layout.css:324-391` (overlay styles) removal is simple, but new tab styles, tab panel transitions, and responsive tab handling in drawer mode will add significant CSS

#### Reference drawer relocation (Issue 4.3) — Correct direction, needs spacing plan

Moving reference drawers from the questionnaire panel to the context panel is the right call. Reference material should not push form content down.

**Caveats**:
- Drawers contain wide tables and multi-column grids that currently benefit from the questionnaire panel's `max-width: 1680px`. In the 560px sidebar, these will reflow to single column
- The drawers would compete with context content for vertical scroll space. Consider making them collapsible tab panels or accordion sections within the sidebar, not free-standing drawers
- The sidebar already has "Reference drawers" link buttons (`sidebar.js:1148-1175`). After the move, these should scroll-to or auto-expand the drawer in the same panel, not call `store.actions.setReferenceDrawerOpen()`

#### Navigation consolidation (Issue 3.1) — Sound, needs visual cue replacement

Making the completion strip interactive and removing the duplicate principle buttons is correct.

**Caveats**:
- The report says to "Remove the `nav-indicator` sliding underline" (step 4) but doesn't propose what replaces it. The sliding underline is the only animated visual cue showing which section is active. The completion strip's `is-active` class would need an equally clear visual treatment
- Placing Context/Info/Help toggles at the right end of the strip (step 5) mixes navigation (section cells) with panel toggles (surface buttons). A visual separator or grouping is needed

---

## 2. Distill Findings

### 2.1 Confirmed text issues

The verbose text inventory (Section 6.1) is accurate and well-catalogued. Each item was verified against source:

| Item | Location | Verified | Assessment |
|------|----------|----------|------------|
| A | `evidence.js:89-92` | Confirmed | Correct to remove |
| B | `evidence.js:94-109` | Confirmed | Correct to simplify |
| C | `questionnaire-pages.js:40-41` | Confirmed | Correct to shorten |
| D | `questionnaire-pages.js:42-43` | Confirmed | Correct to shorten |
| E | `questionnaire-pages.js:44-45` | Confirmed | Correct to shorten |
| F | `trust-framework.html:73` | Confirmed | Correct to remove |
| G | `trust-framework.html:293` | Confirmed | Correct to remove |
| H | `trust-framework.html:296-299` | Confirmed | Correct to shorten |
| I | `sidebar.js:34-107` | Confirmed | Understated — see below |
| J | `sidebar.js:484` | Confirmed | Correct to remove |
| K | `sidebar.js:521-522` | Confirmed | Correct to remove |
| L | `help-panel.js:19-33` | Confirmed | Correct to keep |

### 2.2 Items being removed that shouldn't be

The report proposes removing the dynamic section subtitle appended to panel titles (Section 6.2). This is borderline:

- The subtitle ("Questionnaire — Transparent") is redundant in the questionnaire panel because the completion strip and page index already show the active section
- But in the **context panel**, the subtitle serves a different purpose: it tells the user which section's context they're viewing, especially when pinned. Without it, the context panel title would just be "Context" regardless of what's shown
- The report acknowledges this ("Panel titles remain just 'Questionnaire' and 'Context'") but doesn't provide an alternative way to indicate the pinned section in the context panel

**Recommendation**: Keep the subtitle on the context panel but remove it from the questionnaire panel. Or replace it with a more compact indicator (e.g., a section code chip like "TR" next to the title).

### 2.3 Additional elements that should be stripped

#### 2.3.1 Header progress summary block

`sidebar.js:352-401` creates `ensureHeaderProgressSummary()` which inserts a three-paragraph block (`header-progress-title`, `header-progress-body`, `header-progress-meta`) into the header between the completion strip and the nav. The visible text reads:

> Questionnaire progress
> 5/23 applicable required fields satisfied
> 3/13 active pages resolved, 1 attention, 2 escalated, 2 skipped

This is a large block of prose in the header, duplicating information already present in the completion strip (per-section progress) and the page index (per-page status). The only unique data is the overall aggregate, which could be a single compact line or badge.

**Recommendation**: Remove the header progress summary block entirely. The completion strip and page index already convey progress. If an aggregate is needed, replace the three-paragraph block with a single `chip` or `badge` element showing "X/Y required" next to the completion strip.

#### 2.3.2 Route card info grid redundancy

`renderRouteCard` (`sidebar.js:1068-1219`) creates a definition list with 6-7 rows:

1. **Mode** — "Live route" / "Pinned route" — Useful, but "Live route" is the default and provides no information. Only "Pinned route" is informative.
2. **Topic** — Topic title or "No registered context topic" — Useful.
3. **Focus** — Active anchor label or "Page-level overview" — Useful.
4. **Workflow** — "Editable" / "Read-only" / "System-skipped" — **Redundant**: shown in the page index button as a `page-index-state` badge.
5. **Status** — Progress state label — **Redundant**: shown in the page index button as a `page-index-status` badge.
6. **Required** — Compact progress string — **Redundant**: shown in the page index button as a `page-index-progress` badge.
7. **Live page** — Only shown when pinned and viewing a different page — Useful for pinning context.

Rows 4-6 duplicate information already visible in the page index column. The route card is the first thing in the sidebar and takes up significant vertical space for mixed-value content.

**Recommendation**: Remove the Workflow, Status, and Required rows from the route card. Keep Mode, Topic, Focus, and the conditional Live page row. This reduces the card from ~6 rows to ~3, freeing vertical space for context content.

#### 2.3.3 Criterion companion field enumeration

`buildCriterionCompanion` (`sidebar.js:418-465`) generates a full section in the context sidebar for each criterion focus, including a "Field obligations" list that enumerates the criterion's fields (score, evidence summary, evidence links, uncertainty/blockers). These are the exact same fields visible on the questionnaire page. The enumeration serves no purpose when the user is already looking at the form.

**Recommendation**: Remove the "Field obligations" list from `buildCriterionCompanion`. Keep only the criterion statement (which provides context not visible on the form).

#### 2.3.4 Summary companion text

`buildSummaryCompanion` (`sidebar.js:467-503`) generates a section that includes the text "Use the section-level summary fields to translate criterion evidence into a page-level judgment and handoff-ready rationale" (already flagged as Item J). But it also enumerates all section-level fields with their labels and required policies. This enumeration duplicates the form layout.

**Recommendation**: Remove `buildSummaryCompanion` entirely or reduce it to a single-line prompt ("Section-level summary fields are below"). The field enumeration adds no value over the visible form.

#### 2.3.5 Reference drawer subtitles

`reference-drawers.js:133-140` adds a subtitle paragraph (`.reference-drawer-subtitle`) after each drawer's summary header. The subtitle repeats information already in the registry definition (`summary` field). For example:

- Title: "Standard answer sets"
- Subtitle: "Reusable answer vocabularies, confidence levels, and critical-fail flag references."

When the drawer is closed, this subtitle is visible but adds little. When open, the content itself makes the subtitle redundant.

**Recommendation**: Remove drawer subtitles entirely. The drawer title alone is sufficient.

#### 2.3.6 Surface focus return anchors

`trust-framework.html:54-56` has three dedicated `<div>` elements for focus return:
```html
<div id="contextSidebarFocusReturn" class="shell-focus-anchor" tabindex="-1"></div>
<div id="aboutSurfaceFocusReturn" class="shell-focus-anchor" tabindex="-1"></div>
<div id="helpSurfaceFocusReturn" class="shell-focus-anchor" tabindex="-1"></div>
```

After the sidebar tab merger, only one focus return anchor is needed (for the sidebar panel itself). The two overlay-specific anchors become dead markup.

**Recommendation**: Flag for removal in Phase 8 implementation.

#### 2.3.7 Duplicate Context toggle in questionnaire panel

`trust-framework.html:70` has `#toolbarContextToggle` — a second Context toggle inside the questionnaire panel header, in addition to the one in the site header (`trust-framework.html:46`). On mobile (`≤760px`), the questionnaire panel toolbar is hidden entirely (`layout.css:529-531`), so this button serves no purpose on small screens. On desktop, it duplicates the header button.

**Recommendation**: Remove `#toolbarContextToggle`. The header button and sidebar close button provide sufficient toggles.

### 2.4 Could the sidebar tab system be simplified?

The report proposes three tabs: Context, Info, Help. This can be reduced to two:

1. **Guidance** — Current context content + help content merged. The help surface was always empty (P0 bug 2.1) and its intended content is a per-page interaction legend. This is essentially page-specific help, which belongs with page-specific guidance. The legend can be a collapsible section at the bottom of the guidance tab.
2. **Reference** — Current about/info content (framework background, scope, governance). This is static reference material that doesn't change per page.

This eliminates one tab, simplifying the tab bar in a narrow panel. It also aligns better with user mental models: "What help do I need for this page?" (Guidance) vs "What is the framework?" (Reference).

### 2.5 Unnecessary UI elements the report didn't flag

| Element | Location | Why unnecessary |
|---------|----------|----------------|
| `#toolbarContextToggle` button | `trust-framework.html:70` | Duplicates header Context toggle; hidden on mobile |
| Surface focus return anchors (×2) | `trust-framework.html:55-56` | Only needed for overlay surfaces; removable after tab merger |
| `nav-indicator` div | `trust-framework.html:49` | Report mentions removing but doesn't flag as standalone element; will be orphaned by nav consolidation |
| `context-drawer-dismiss` button | `trust-framework.html:291` | "Close context" button shown only in drawer mode; semantics change after tab merger |
| `PAGE_FALLBACK_COPY` bullets | `sidebar.js:38-106` | Each entry has 3 bullets that repeat information in the route card and topic stack; trim to summary-only |

---

## 3. Suggested Amendments to the Report

### Amendment 1: Add spacing scale adoption as prerequisite

**Section to amend**: Phase 5 (Navigation consolidation) and Phase 8 (Sidebar architecture)

**Add before Phase 5**: A new Phase 4.5 — "Spacing normalization" — that replaces hardcoded pixel values in `layout.css` and `components.css` with the existing `--space-*` tokens from `tokens.css:349-358`. This is low-risk and can be done as a mechanical find-replace. Without it, all subsequent layout changes will use inconsistent spacing.

### Amendment 2: Address framework panel width constraint

**Section to amend**: Issue 2.8 (Sidebar tab merger) and Issue 4.3 (Move reference drawers)

**Add**: Both proposals must address the `max-width: 560px` constraint on `.framework-panel .panel-inner` (`layout.css:262`). Options:
- Remove the max-width entirely and let the grid column control width
- Increase to `min(100%, 680px)` to accommodate tables and card grids
- Accept the constraint and plan for single-column drawer content in the sidebar

### Amendment 3: Reduce sidebar tab count from 3 to 2

**Section to amend**: Issue 2.8

**Change**: Instead of three tabs (context, info, help), propose two tabs (Guidance, Reference). Merge help content (interaction legend) into the Guidance tab as a collapsible section. Rename "Info" to "Reference" to better communicate its purpose. This simplifies the tab bar and reduces visual clutter in a narrow panel.

### Amendment 4: Add route card info grid reduction to text cleanup

**Section to amend**: Section 6 (Verbose text cleanup)

**Add new item**: Remove the Workflow, Status, and Required rows from the sidebar route card (`sidebar.js:1100-1127`). These duplicate badges already visible in the page index buttons. Keep only Mode, Topic, Focus, and the conditional Live page row.

### Amendment 5: Add header progress summary removal

**Section to amend**: Section 6 (Verbose text cleanup)

**Add new item**: Remove or drastically simplify `ensureHeaderProgressSummary()` (`sidebar.js:352-401`). The three-paragraph block in the header duplicates progress information from the completion strip and page index. Replace with a compact aggregate badge if needed.

### Amendment 6: Clarify context panel subtitle treatment

**Section to amend**: Section 6.2 (Section subtitle removal)

**Change**: Instead of removing `ensurePanelTitleSuffix()` entirely, keep it for the context panel but remove it from the questionnaire panel. The context panel needs section identification when pinned; the questionnaire panel does not. Alternatively, replace the text suffix with a section code chip.

### Amendment 7: Add redundant element removal to Phase 3

**Section to amend**: Phase 3 (Verbose text cleanup)

**Add**:
- Remove `#toolbarContextToggle` (`trust-framework.html:70`)
- Remove criterion companion field enumeration (`sidebar.js:446-461`)
- Remove or reduce `buildSummaryCompanion` to a single line (`sidebar.js:467-503`)
- Remove reference drawer subtitles (`reference-drawers.js:133-140`)

### Amendment 8: Specify card de-nesting for sidebar tabs

**Section to amend**: Issue 2.8

**Add**: The sidebar tab implementation should strip card styling (borders, backgrounds, padding) from inner containers (`context-route-card`, `context-anchor-card`). Use spacing and typography alone for grouping within tab panels. Reserve card treatment for the tab panel wrapper.

---

## 4. Concerns

### 4.1 Phase 8 scope is underestimated

The report marks Issue 2.8 as "P2 — Medium" with "Large" effort. This is the correct effort rating but the severity should be higher. The three-surface architecture is the root cause of 8 issues (2.1-2.7 plus the tab proposal itself). The current severity doesn't reflect how much the broken architecture degrades the overall experience. Consider elevating to P1 after the P0 fixes are in.

### 4.2 Reference drawer relocation without width adjustment will create new problems

Moving reference drawers (with their tables and multi-column grids) into the 560px-max-width sidebar will cause content reflow that makes the drawers harder to use. The tables in "Evaluation scoring model" (`trust-framework.html:155-176`) have 3 columns with meaningful text. At 560px minus padding, these will be cramped. The report should explicitly address this or the "fix" will create a worse experience than the current layout.

### 4.3 Navigation consolidation loses active-section animation

The `nav-indicator` sliding underline (`components.css:77-85`) provides a smooth animated transition when switching sections. The report proposes removing it without proposing a replacement. The completion strip's `is-active` class toggle is instantaneous. If the animation is valued, a CSS transition on the active cell's background or border could replace it.

### 4.4 Context pinning adds complexity that should be reconsidered

The context pinning feature (`sidebar.js:1288-1296`) adds significant complexity: a separate `pinnedRoute` state, `resolveDisplayedRoute()` branching, stale anchor handling (Issue 8.3.3), and title staleness (Issue 2.7). The report doesn't question whether pinning is worth keeping at all. For a tool used primarily by evaluators moving linearly through sections, pinning is an edge case that generates multiple bugs.

**Recommendation**: Consider removing the pin feature entirely in Phase 8. It adds complexity, generates bugs, and the primary use case (linear evaluation) doesn't need it. If retained, it should be re-implemented after the sidebar tab merger, not before.

### 4.5 Dragging sidebar width (Issue 2.10) may conflict with responsive behavior

The draggable width proposal adds a `--sidebar-width` CSS custom property clamped to 16rem-40rem. The current responsive breakpoint at 1160px switches to drawer mode. If a user drags the sidebar to 40rem on a 1400px screen, the questionnaire panel gets only ~540px — potentially too narrow for the workspace layout's inner grid (`minmax(13rem, 16rem) + minmax(0, 1fr)`). The report doesn't address this interaction.

**Recommendation**: The drag implementation should dynamically adjust the maximum width based on viewport width, ensuring the questionnaire panel never drops below a usable minimum (e.g., 600px).

### 4.6 Tooltip system (Phase 7) adds new surface area before architecture stabilizes

The tooltip proposal adds a new component, new schema property, and new rendering logic in Phases 7, before the sidebar architecture stabilizes in Phase 8. If the sidebar merger changes how field labels are rendered, the tooltip wiring may need to be redone.

**Recommendation**: Move the tooltip system to after Phase 8, or implement only the schema property (`tooltip`) in Phase 7 and defer the component and rendering to after the architecture is stable.
