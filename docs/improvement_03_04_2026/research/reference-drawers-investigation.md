# Reference Drawers Investigation

Date: 2026-04-04

## Overview

The reference drawers system provides three expandable accordion panels ("Standard answer sets", "Evaluation scoring model", "Minimum evidence requirements") containing scoring rubrics, recommendation vocabulary, and evidence requirements. This investigation traces the full rendering pipeline and diagnoses three reported UI/UX issues.

---

## Rendering Pipeline

### 1. Source content (HTML)

Three `<details>` elements with static HTML content live inside `#referenceDrawerMount` at `trust-framework.html:76-270`. This mount sits inside the **questionnaire panel**, directly between the panel header/caption and the workspace layout grid:

```
questionnairePanel > panel-inner > form > .questionnaire-shell
  ├── .questionnaire-panel-header (title + toolbar)
  ├── .panel-caption
  ├── .panel-title-section "Quick Reference"        ← heading
  ├── #referenceDrawerMount                          ← MOUNT POINT (questionnaire panel!)
  │   └── .reference-drawer-stack (created by JS)
  │       ├── details.reference-drawer[data-drawer-id="answer-sets"]
  │       ├── details.reference-drawer[data-drawer-id="scoring-model"]
  │       └── details.reference-drawer[data-drawer-id="evidence-requirements"]
  └── .workspace-layout
      ├── .page-index-column > #pageSidebarMount
      └── .questionnaire-workspace
          ├── #pagerMount
          └── #questionnaireRenderRoot
```

### 2. Drawer definitions (JS)

`static/js/render/reference-drawers.js:39-61` — `REFERENCE_DRAWER_REGISTRY` defines three frozen objects:

| drawerId | topicId | code | title |
|---|---|---|---|
| `answer-sets` | `reference.answer-sets` | `REF-A` | Standard answer sets |
| `scoring-model` | `reference.scoring-model` | `REF-S` | Evaluation scoring model |
| `evidence-requirements` | `reference.evidence-requirements` | `REF-E` | Minimum evidence requirements |

### 3. Renderer initialization

`createReferenceDrawersRenderer()` in `reference-drawers.js:149-299`:

1. Grabs `#referenceDrawerMount` from the DOM
2. Extracts existing `<details>` elements via `extractDrawersById()` (line 71-78)
3. Clears the mount (`clearChildren(mount)`, line 169)
4. Creates a `<section class="reference-drawer-stack">` wrapper (line 171-174)
5. For each registered drawer, calls `ensureSummaryChrome()` to restructure the `<summary>` element

### 4. Summary chrome construction

`ensureSummaryChrome()` at `reference-drawers.js:80-147` transforms each `<summary>` from plain text (e.g. `<summary>Standard answer sets</summary>`) into a structured layout:

```
summary.reference-drawer-summary
├── span.reference-drawer-summary-main       [display: grid, auto 1fr]
│   ├── span.reference-drawer-code           "REF-A"
│   └── span.reference-drawer-title          "Standard answer sets"
├── span.reference-drawer-summary-actions    [display: inline-flex]
│   ├── span.reference-drawer-status         "PAGE LINK" / "PINNED" / "REFERENCE"
│   └── button.reference-pin-button          "PIN" / "UNPIN"
```

A `p.reference-drawer-subtitle` is also inserted as a sibling AFTER the `</summary>` via `insertAdjacentElement('afterend', ...)`.

### 5. State sync

`sync()` at `reference-drawers.js:214-253` runs on every store change:

- Reads `state.ui.activePageId` to determine which reference topic IDs are relevant for the current page
- Compares against each section definition's `referenceTopicIds` array
- Sets classes: `is-open`, `is-pinned`, `is-contextual-match`
- Sets status text: "PINNED" | "PAGE LINK" | "REFERENCE"
- Sets pin button text: "PIN" | "UNPIN"

### 6. Pin behavior

`handleClick()` at `reference-drawers.js:255-279`:

- Clicking PIN adds the drawer ID to a local `pinnedDrawerIds` Set
- Pinning also calls `store.actions.setReferenceDrawerOpen(drawerId, true)` to force the drawer open
- Pinned drawers are forced open on every sync cycle (line 196-199: if pinned and user closes, it reopens)
- The pin state is purely local (not persisted in the store) — it resets on page reload

### 7. Section-to-reference mapping

Each section in `static/js/config/sections.js` declares `referenceTopicIds`:

| Section | Reference topics |
|---|---|
| S0 (Workflow Control) | `reference.answer-sets`, `reference.scoring-model` |
| S1 (Tool Profile) | `reference.answer-sets` |
| S2 (Evaluation Setup) | `reference.evidence-requirements`, `reference.scoring-model` |
| TR–TC (Principles) | `reference.scoring-model`, `reference.evidence-requirements` |
| S8 (Critical Fails) | All three |
| S9 (Recommendation) | `reference.scoring-model`, `reference.answer-sets` |
| S10A–S10C (Governance) | `reference.answer-sets` |

When a page is active, any drawer whose `topicId` appears in the page's `referenceTopicIds` gets `is-contextual-match` class and status text "PAGE LINK".

---

## Issue 1: Accordion Header Styling Broken

### Reported symptom

The summary header text runs together as plain text: `REF-AStandard answer setsPAGE LINK`. The code, title, and status badge lack proper visual separation.

### Root cause analysis

The CSS rules for the summary structure exist at `components.css:1413-1498` and DO define proper grid layouts:

```css
/* components.css:1413-1427 */
.reference-drawer-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  /* ... font, color, padding ... */
}

/* components.css:1438-1443 */
.reference-drawer-summary-main {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 10px;
  align-items: start;
}
```

**The grid layouts are correctly defined.** However, the issue manifests because of two compounding problems:

#### Problem A: `.reference-drawer-code` lacks badge/label styling

`components.css:1452-1456`:
```css
.reference-drawer-code {
  color: var(--ut-muted);
  font-family: var(--ff-mono);
  font-size: var(--text-xs);
}
```

The code element ("REF-A") has **no padding, border, or background** — it's plain muted text at 0.625rem. Compare this to the `.reference-drawer-status` badge (lines 1462-1472) which HAS `padding: 3px 6px`, `border`, and `background`. The code is visually indistinguishable from surrounding text; it looks like part of the title.

#### Problem B: `.reference-drawer-title` has almost no styling

`components.css:1458-1460`:
```css
.reference-drawer-title {
  line-height: var(--lh-sub);
}
```

The title inherits everything from `.reference-drawer-summary` (bold, uppercase, `font-family: var(--ff-heading)`, `font-size: var(--text-sm)`) but has **no distinct visual treatment** of its own — no color override, no font-weight distinction, no visual separator from the code.

#### Problem C: No visual boundary between `.reference-drawer-summary-main` and `.reference-drawer-summary-actions`

The two-column grid on `.reference-drawer-summary` separates main content from actions with a 10px gap, but there is **no divider, no background contrast, and no border** between the code/title and the status/pin button. On wider viewports the grid gap is the only separator.

At 760px and below, `components.css:1617-1619` collapses the summary to a single column:
```css
.reference-drawer-summary {
  grid-template-columns: 1fr;
}
```
This stacks main and actions vertically, but without any visual boundary they appear to be one continuous text block.

#### Why "REF-AStandard answer setsPAGE LINK" appears to run together

While the grid DOES create separate cells, the visual effect is:

1. **REF-A** — tiny (0.625rem), muted grey, no background/border — looks like decoration
2. **Standard answer sets** — bold heading text, immediately adjacent — no visual separator
3. **PAGE LINK** — badge with border/background, but in a separate grid column that wraps on narrow screens

If the font hasn't loaded or the grid isn't rendering (e.g. FOUC, or the summary element's default `display: list-item` conflicting), all three would indeed appear as continuous inline text.

### Affected files and line numbers

| File | Lines | What |
|---|---|---|
| `static/css/components.css` | 1452-1456 | `.reference-drawer-code` — missing badge styling |
| `static/css/components.css` | 1458-1460 | `.reference-drawer-title` — under-styled |
| `static/css/components.css` | 1413-1427 | `.reference-drawer-summary` — grid layout works but no visual separator between children |
| `static/css/components.css` | 1617-1619 | Mobile collapse removes column separation |
| `static/js/render/reference-drawers.js` | 96-106 | Code and title creation — no distinguishing attributes beyond class names |

### All instances affected

All three drawers exhibit identical behavior:

1. `details[data-drawer-id="answer-sets"]` — shows "REF-AStandard answer sets"
2. `details[data-drawer-id="scoring-model"]` — shows "REF-SEvaluation scoring model"
3. `details[data-drawer-id="evidence-requirements"]` — shows "REF-EMinimum evidence requirements"

Each also has the status badge ("PAGE LINK" / "PINNED" / "REFERENCE") and pin button appended with no visual boundary.

### Recommended fix approach

**CSS enhancements (not a JS change):**

1. **Style `.reference-drawer-code` as a badge** — add `padding`, `border`, `background`, `border-radius` consistent with the `.reference-drawer-status` badge treatment. Consider `display: inline-flex` with centering.

2. **Give `.reference-drawer-title` explicit styling** — add `font-weight: 700`, `color: var(--ut-navy)`, and optionally a left border or separator from the code badge. The grid gap alone is insufficient.

3. **Add a visual separator between main and actions** — either:
   - A vertical border-left on `.reference-drawer-summary-actions`
   - A `::after` pseudo-element on `.reference-drawer-summary-main`
   - A subtle background difference on the actions area

4. **Review the mobile single-column layout** — when the grid collapses, add explicit spacing (e.g. `margin-top`) between `.reference-drawer-summary-main` and `.reference-drawer-summary-actions`.

---

## Issue 2: PIN Buttons Unclear

### Reported symptom

PIN buttons in the accordion headers seem to just fold out the accordions. Their purpose is unclear.

### Root cause analysis

The PIN button is created at `reference-drawers.js:123-131`:

```javascript
let pinButton = actions.querySelector('.reference-pin-button');
if (!pinButton) {
  pinButton = documentRef.createElement('button');
  pinButton.type = 'button';
  pinButton.className = 'reference-pin-button';
  pinButton.dataset.referencePin = drawerDefinition.drawerId;
  pinButton.setAttribute('aria-label', `Pin ${drawerDefinition.title}`);
  actions.appendChild(pinButton);
}
```

#### What PIN actually does

When clicked (`handleClick` at lines 255-279):

1. **Pinning** adds the drawer ID to `pinnedDrawerIds` (a local `Set`, not in the store)
2. Calls `store.actions.setReferenceDrawerOpen(drawerId, true)` to open the drawer
3. On subsequent `sync()` calls (line 196-199), if the drawer is pinned and the user tries to close it, the toggle handler forces `drawer.open = true` — **pinned drawers cannot be closed**
4. The status text changes to "PINNED" and the pin button shows "UNPIN"

#### Why PIN seems to "just fold out the accordions"

The confusion arises because:

1. **The default state already has "answer-sets" open** (`store.js:128`: `'answer-sets': true`). So clicking PIN on the first drawer appears to do nothing visible — the drawer was already open.

2. **For closed drawers**, clicking PIN opens them (because `setReferenceDrawerOpen(drawerId, true)` is called). This makes PIN indistinguishable from simply clicking the summary to expand the `<details>`.

3. **The only differentiator** is the "PINNED" status text and "UNPIN" button text, but these are small UI changes that don't communicate the lock behavior.

4. **The PIN button is inside the summary** alongside the status badge. There is no tooltip, no icon, and no visual affordance explaining what "pinning" means. The button text just says "PIN" in uppercase.

5. **The pin state is session-only** (stored in a local `Set` that resets on page reload), which undermines its usefulness.

#### Interaction conflict with native `<details>` toggle

The `<details>` element has native toggle behavior. The `handleToggle` listener (lines 189-211) fires when the `<details>` opens or closes. For pinned drawers, it forces `drawer.open = true` — but this creates a confusing UX where clicking the summary to close a pinned drawer immediately re-opens it with no explanation.

### Affected files and line numbers

| File | Lines | What |
|---|---|---|
| `static/js/render/reference-drawers.js` | 123-131 | PIN button creation |
| `static/js/render/reference-drawers.js` | 255-279 | PIN click handler |
| `static/js/render/reference-drawers.js` | 196-199 | Forced-open on pinned drawer toggle |
| `static/js/render/reference-drawers.js` | 246 | PIN/UNPIN button text |
| `static/js/render/reference-drawers.js` | 238-239 | PINNED/PAGE LINK status text |
| `static/js/state/store.js` | 127-131 | Default drawer states (answer-sets is open) |
| `static/css/components.css` | 1163-1194 | PIN button styles (generic button, pressed state) |

### All instances affected

All three drawers have PIN buttons with identical behavior.

### Recommended fix approach

**Option A: Remove PIN entirely**

The pin feature adds complexity with minimal value:
- Pin state is not persisted (lost on reload)
- The sidebar already has a "Reference drawers" section with buttons to open drawers from the context panel (sidebar.js:1148-1175)
- The forced-open behavior conflicts with native `<details>` UX

Removing pin would simplify the accordion headers and remove the confusing interaction.

**Option B: Redesign PIN with clear affordance**

If pinning is kept:
1. Add an icon (📌 or a pin SVG) alongside the text
2. Add a tooltip explaining "Keep this reference visible on all pages"
3. Change the forced-open behavior to instead show a confirmation or prevent close with visual feedback
4. Persist pin state in the store so it survives navigation

---

## Issue 3: Placement of Quick Reference Section

### Reported symptom

The quick reference section takes up prime space at the start of each section in a completely different visual style.

### Root cause analysis

The reference drawers are mounted in the **questionnaire panel** (the main form area), not in the context/sidebar panel. Specifically:

**`trust-framework.html:75-76`:**
```html
<h2 id="referenceDrawerHeading" class="panel-title-section">Quick Reference</h2>
<section id="referenceDrawerMount" data-shell-mount="reference-drawers" aria-labelledby="referenceDrawerHeading">
```

This sits inside `questionnairePanel > panel-inner > form > .questionnaire-shell`, ABOVE the `workspace-layout` grid that contains the page index and actual questionnaire pages.

#### Why this is problematic

1. **Vertical space consumption**: The reference drawers (especially when open) push the actual questionnaire form content far down. The "answer-sets" drawer alone contains 4 mini-cards with tables, chips, and lists.

2. **Always visible, always the same**: Unlike the context panel which changes per page, the reference drawers show the same content regardless of which page is active. They're static reference material occupying the most valuable screen real estate.

3. **Visual style mismatch**: The drawers use a `<details>` accordion pattern with `.reference-drawer` styling, while the actual questionnaire content uses `.form-section` / `.criterion-card` patterns. The reference drawers look like documentation injected into the form.

4. **Redundant with sidebar links**: The context sidebar already renders "Reference drawers" link buttons per page (`sidebar.js:1148-1175`), which call `openReferenceDrawer()` to open the drawers. But since the drawers are in the questionnaire panel, clicking those sidebar links just scrolls the questionnaire panel.

5. **Between header and form**: The hierarchy is Panel Title → Caption → "Quick Reference" heading → Drawers → Page Index → Pager → Form Pages. Users must scroll past all reference material to reach the actual questionnaire.

#### How the context sidebar integration works

The sidebar renders reference drawer links in `sidebar.js:1144-1179`:

```javascript
if (route.referenceTopicIds.length) {
  route.referenceTopicIds.forEach((topicId) => {
    const drawerDefinition = REFERENCE_DRAWER_BY_TOPIC_ID[topicId];
    list.appendChild(
      createLinkButton({
        className: 'context-link-button',
        text: `${drawerDefinition.code} ${drawerDefinition.title}`,
        dataName: 'contextDrawerId',
        dataValue: drawerDefinition.drawerId,
      }),
    );
  });
}
```

Clicking these buttons calls `openReferenceDrawer(drawerId)` in `navigation.js:863-869`:

```javascript
openReferenceDrawer(drawerId) {
  store.actions.setReferenceDrawerOpen(drawerId, true);
}
```

This sets the drawer state to open, which takes effect on the next sync. But the drawers are in the other panel, so the user may not notice.

### Affected files and line numbers

| File | Lines | What |
|---|---|---|
| `trust-framework.html` | 75-76, 270 | Reference drawer mount location in questionnaire panel |
| `trust-framework.html` | 272-280 | Workspace layout (below the drawers) |
| `static/js/render/reference-drawers.js` | 151 | `documentRef.getElementById('referenceDrawerMount')` |
| `static/js/render/sidebar.js` | 1144-1175 | Sidebar reference drawer link buttons |
| `static/js/behavior/navigation.js` | 863-869 | `openReferenceDrawer()` handler |
| `static/css/layout.css` | 274-280 | `.questionnaire-shell` and `.workspace-layout` positioning |

### All instances affected

This affects every page in the questionnaire — the reference drawers are always visible at the top of the questionnaire panel regardless of which section is active.

### Recommended fix approach

**Move reference drawers to the context panel (sidebar).**

The context panel already has the infrastructure for reference drawer links. The drawers themselves should be rendered there too:

1. **Move `#referenceDrawerMount` from the questionnaire panel to the context panel** — relocate the `<section>` and its children from `trust-framework.html:75-270` into the `frameworkPanel > panel-inner` area (currently at line 286+).

2. **Place it inside the context shell** — the sidebar renderer already creates a `contextShell` with `routeCard`, `anchorCard`, `generatedSlot`, and `topicStack` divs (`sidebar.js:325-350`). The reference drawers could be added as a fifth slot in the context shell, rendered below the topic stack.

3. **Update the renderer initialization** — `createReferenceDrawersRenderer()` currently finds `#referenceDrawerMount` in the document. If the mount is moved to the context panel, the renderer continues to work without changes since it queries by ID.

4. **Connect sidebar buttons to drawer open/scroll** — the existing `openReferenceDrawer()` in `navigation.js:863-869` already sets the drawer open state. If the drawers are in the context panel, this would immediately make them visible (the context panel is already visible when the sidebar link is clicked).

5. **Remove the "Quick Reference" heading from the questionnaire panel** — `trust-framework.html:75` can be removed along with the mount.

6. **Adjust context panel caption** — `trust-framework.html:293` already mentions "Scoring references are in the drawers above" — this would become accurate.

This approach:
- Frees the entire questionnaire panel for form content
- Keeps reference material in the panel designed for context/guidance
- Makes the sidebar "Reference drawers" buttons immediately useful (they'd open/scroll-to drawers in the same panel)
- Requires no changes to the drawer renderer JS or CSS
- Follows the existing architectural pattern of context-side supporting material

---

## Summary Table

| Issue | Root cause | Primary files | Architectural fix |
|---|---|---|---|
| Header styling | Code/title/status lack visual boundaries | `components.css:1452-1460`, `reference-drawers.js:96-106` | Add badge styling to code, explicit title styles, separator between main and actions |
| PIN buttons unclear | Pin appears identical to expand; default-open drawer masks behavior | `reference-drawers.js:123-131, 196-199, 255-279` | Remove pin feature, or add icons/tooltips and persist state |
| Placement | Drawers in questionnaire panel instead of context panel | `trust-framework.html:75-76`, `layout.css:274-280` | Move `#referenceDrawerMount` into context panel; remove from questionnaire shell |
