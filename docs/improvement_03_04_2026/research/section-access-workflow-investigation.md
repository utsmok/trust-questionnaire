# Section Access, Reviewer Info, and Workflow Investigation

**Date:** 2026-04-04  
**Scope:** Section locking mechanics, missing reviewer info section, context bar update lifecycle

---

## 1. Sections Locked Unnecessarily

### 1.1 How Section Locking Works

Section accessibility is determined by a three-layer system:

**Layer 1: Workflow page rules** (`rules.js:136-179`)  
`WORKFLOW_PAGE_RULES` maps each workflow mode to three arrays:
- `editableSectionIds` — sections the user can edit
- `readOnlySectionIds` — sections visible but not editable
- `systemSkippedSectionIds` — sections completely hidden/inaccessible

**Layer 2: Derivation** (`derive/workflow.js:18-56`)  
`derivePageStates()` reads the current `submissionType` field (or defaults to `nomination` mode), looks up the workflow rule, and computes `isAccessible` for each section:
```js
isAccessible: workflowState !== SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED
```
Sections in `systemSkippedSectionIds` get `isAccessible: false`.

**Layer 3: Navigation enforcement**  
- `navigation.js:728-732` — `navigateToPage()` checks `pageState?.isAccessible === false` and returns `false`, blocking navigation.
- `sidebar.js:856` — Quick-jump buttons are disabled when `!availableQuickJumpPageIds.has(pageId)`.
- `sidebar.js:961` — Page-index buttons are disabled when `pageState?.isAccessible === false`.
- `pager.js:54-57` — `getPagerPageIds()` uses `accessibleSectionIds` to build the page sequence, so skipped sections never appear in prev/next navigation.

### 1.2 Which Sections Are Locked Under What Conditions

#### Nomination mode (default when no submission type selected)
| Section | Status |
|---------|--------|
| S0 (Workflow) | **Editable** |
| S1 (Profile) | **Editable** |
| S2–S10A | **System-skipped** (locked) |
| S10B, S10C | **System-skipped** (locked) |

#### Primary Evaluation mode
| Section | Status |
|---------|--------|
| S0, S1, S2, TR, RE, UC, SE, TC, S8, S9, S10A | **Editable** |
| S10B (Second Review) | **System-skipped** (locked) |
| S10C (Final Decision) | **System-skipped** (locked) |

#### Second Review mode
| Section | Status |
|---------|--------|
| S10B | **Editable** |
| S0–S10A | **Read-only** (accessible) |
| S10C | **System-skipped** (locked) |

#### Final Team Decision mode
| Section | Status |
|---------|--------|
| S10C | **Editable** |
| S0–S10B | **Read-only** (accessible) |

#### Re-evaluation mode
Same as Primary Evaluation — S0–S10A editable, S10B/S10C locked.

### 1.3 Root Cause of Unnecessary Locking

**The problem is in `WORKFLOW_PAGE_RULES` in `rules.js:136-179`.** The workflow system uses an all-or-nothing gating approach: sections are either in the `editableSectionIds` list or they fall into `systemSkippedSectionIds`. There is no concept of "accessible but not yet editable" for review sections.

For **Primary Evaluation** mode (the most common use case), this means:
- All review sections (TR, RE, UC, SE, TC, S8, S9) are immediately accessible — **this is correct.**
- S10B and S10C are locked — **this is the intended governance restriction.**

The locking of review sections occurs **only in Nomination mode** (the default when the form first loads). Until a user selects `submissionType = primary_evaluation`, sections S2–S10A are all system-skipped. This creates a poor first-run experience: the user sees only 2 pages out of 13.

### 1.4 Recommended Fix

The request is to make all review sections accessible immediately regardless of workflow state, while keeping governance sections (S10B, S10C) locked until the appropriate workflow stage. Two approaches:

**Option A: Change default workflow mode**  
In `derive/helpers.js:666-667`, `getWorkflowMode()` returns `WORKFLOW_MODES.NOMINATION` as the default. Change the default to `WORKFLOW_MODES.PRIMARY_EVALUATION` so that on first load, all review sections are accessible. This would require also ensuring S0/S1 remain editable (they already are in primary_evaluation mode).

**Option B: Introduce a neutral "all accessible" concept**  
Add a new concept to the workflow derivation where sections can be marked as `accessible` even if they are `system_skipped` for editing purposes. This would require changes to `WORKFLOW_PAGE_RULES` (adding an `alwaysAccessibleSectionIds` array) and updating `derivePageStates()` in `workflow.js` to separate visibility from editability. More invasive but more correct.

**Option A is recommended** as the simpler approach. The governance lock (S10B, S10C remaining inaccessible until the review phase) already works correctly in primary_evaluation mode.

### 1.5 Files Affected

| File | Lines | Role |
|------|-------|------|
| `static/js/config/rules.js` | 103-179 | `WORKFLOW_PAGE_RULES` defines which sections are editable/locked per mode |
| `static/js/state/derive/workflow.js` | 18-56 | `derivePageStates()` computes `isAccessible` from workflow rules |
| `static/js/state/derive/helpers.js` | 666-670 | `getWorkflowMode()` and `getWorkflowPageRule()` resolve current mode |
| `static/js/behavior/navigation.js` | 728-732 | `navigateToPage()` gates on `isAccessible` |
| `static/js/behavior/pager.js` | 54-57 | `getPagerPageIds()` filters to accessible sections only |
| `static/js/render/sidebar.js` | 856, 961 | Quick-jump and page-index buttons disabled for inaccessible sections |
| `static/js/render/questionnaire-pages.js` | 1488-1500 | Page elements receive `pageAccessible` data attribute |

---

## 2. Missing Reviewer Information Section

### 2.1 Search Results

There is **no dedicated reviewer information section** in the questionnaire. Searching the schema and configuration:

- **S0 (Workflow Control)** has a `RESPONDER_ROLE` field (`s0.responderRole`) that captures the *role* of the person filling in the form (information specialist, researcher, etc.) — but not their name or email.
- **S10A (Primary Evaluation Handoff)** has a `PRIMARY_EVALUATOR` field (`s10a.primaryEvaluator`) — a `PERSON` type field for the evaluator's name. This appears late in the questionnaire (page 10 of 13) and is only intended for the handoff step.
- **S10B (Second Review)** has a `SECOND_REVIEWER` field (`s10b.secondReviewer`) — another `PERSON` type field.
- **S10C (Final Team Decision)** has a `MEETING_PARTICIPANTS` field (`s10c.meetingParticipants`) — a `PEOPLE_LIST` type.

**No fields exist for:**
- Reviewer name (early in the form)
- Reviewer email address
- Reviewer affiliation/department
- Review date (at the top level — only `s10a.dateSubmittedForReview` and `s10b.dateOfSecondReview` exist)

### 2.2 Where It Should Be Added

The canonical location would be **Section S0 (Workflow Control)** or a new section between S0 and S1. The current S0 fields are:
1. `s0.submissionType` (dropdown)
2. `s0.toolName` (text)
3. `s0.toolUrl` (url)
4. `s0.existingEvaluationId` (text, conditional)
5. `s0.responderRole` (dropdown)
6. `s0.nominationReason` (textarea, conditional)

Adding reviewer fields to S0 would be the simplest approach. New fields needed:
- `s0.reviewerName` — `SHORT_TEXT` or `PERSON` type
- `s0.reviewerEmail` — `URL` or `SHORT_TEXT` type (with email validation)
- `s0.reviewerAffiliation` — `SHORT_TEXT` (optional)
- `s0.reviewDate` — `DATE` (the date the review is being conducted)

### 2.3 Files That Would Need Changes

| File | Changes |
|------|---------|
| `static/js/config/questionnaire-schema.js` | Add field definitions to `FIELD_IDS.S0`, `S0_FIELDS`, and update assertion counts |
| `static/js/config/rules.js` | No rule changes needed unless fields are conditional |
| `static/js/config/option-sets.js` | Possibly add an email validation pattern (no new option set needed) |
| `static/js/render/questionnaire-pages.js` | Add new field IDs to `PAGE_LAYOUTS.S0` group layout |
| `static/js/config/sections.js` | No changes needed (S0 already exists) |
| `static/js/state/store.js` | No changes needed (field normalization handles `SHORT_TEXT`/`PERSON`) |

### 2.4 Existing "Person" Fields Are Not Sufficient

The `s10a.primaryEvaluator` and `s10b.secondReviewer` fields use the `PERSON` type, which accepts a name or identifier string. They appear too late in the workflow to serve as top-level reviewer identification. A reviewer filling in a primary evaluation should identify themselves on the first page, not page 10.

---

## 3. Context Bar Not Updating Correctly

### 3.1 The Context Update Lifecycle

The context sidebar displays information about the current page. Here is the full lifecycle:

1. **User action** triggers a navigation event (clicking sidebar link, quick-jump button, pager, or hash change)
2. **`navigateToPage()`** (`navigation.js:719-756`) is called:
   - Checks `isAccessible` — returns `false` if locked
   - Closes context drawer if in mobile mode
   - Optionally clears sub-anchor (`resetSubAnchor: true`)
   - Calls `store.actions.setActivePage(pageId)`
   - Scrolls questionnaire and context panels to top
   - Calls `syncPanelTitles()` immediately after setting the page
3. **Store subscription** fires (`navigation.js:891-896`):
   - `syncFromState()` is called
   - This calls `sidebar.sync(state)`, which rebuilds the entire sidebar
4. **`sidebar.sync()`** (`sidebar.js:1255-1264`):
   - Calls `refreshPageAnchors()` — rebuilds the anchor map from DOM
   - Calls `renderQuickJump()` — rebuilds quick-jump buttons
   - Calls `renderPageIndex()` — rebuilds page index
   - Calls `resolveDisplayedRoute()` — determines what to show in context
   - Calls `renderRouteCard()`, `renderAnchorCard()`, `renderContextContent()`
5. **Context tracking** (`context-tracking.js:111-118`):
   - Subscribes to store changes
   - When `activePageId` changes, calls `updateHashForPage()`

### 3.2 Identified Issue: Stale Route on Sidebar Link Clicks

When a user clicks a link in the **page index** or **anchor card**, the following sequence occurs:

1. `handlePageIndexClick` or `handleContextClick` fires
2. These call `navigateToPage()` or `navigateToSubAnchor()`
3. The store updates, which triggers `syncFromState()`
4. `syncFromState()` calls `sidebar.sync(state)`

The problem: **`sidebar.sync()` calls `refreshPageAnchors()` on every state change** (`sidebar.js:1256`). This rebuilds the anchor descriptor map from the DOM. If the DOM is being updated concurrently (e.g., via `syncPageVisibility()` which toggles `is-page-hidden` and `inert` attributes), the anchors can be stale or point to hidden elements.

### 3.3 Specific Problem: Sub-Anchor Navigation Confusion

When clicking an anchor link in the context sidebar:

1. `handleContextClick` (`sidebar.js:1320-1326`) fires
2. It looks up the anchor descriptor from `anchorById`
3. Calls `navigateToSubAnchor(descriptor)` (defined in `navigation.js:758-779`)
4. `navigateToSubAnchor()`:
   - If the target page is different, calls `navigateToPage(descriptor.pageId, { resetSubAnchor: false })`
   - Then sets the active sub-anchor via `contextTracking?.setActiveSubAnchorById()`
   - Then scrolls to the element and calls `syncPanelTitles()`

**The bug:** When `navigateToPage()` is called with `resetSubAnchor: false`, it still calls `store.actions.setActivePage(pageId)`. This triggers the store subscription, which calls `syncFromState()`, which calls `sidebar.sync()`, which calls `refreshPageAnchors()`. The `refreshPageAnchors()` call rebuilds the anchor map. But the sub-anchor hasn't been set yet (it's set on the next line in `navigateToSubAnchor`). So the sidebar renders with **no active sub-anchor** for one frame.

Then `setActiveSubAnchorById` fires, which triggers another state change, another `sync()`, and now the sidebar renders correctly. This causes a **flash** where the context bar briefly shows the wrong state.

### 3.4 Specific Problem: Pinned Context Route

The sidebar supports a "pin" feature (`sidebar.js:1287-1297`). When pinned:
- `resolveDisplayedRoute()` (`sidebar.js:737-753`) returns the pinned route instead of the live route
- The context sidebar continues showing the pinned page's information even when the user navigates away

The issue: when clicking a **page index button** while pinned, the page navigates but the context stays pinned to the old page. This is by design, but the anchor card in the context sidebar still shows anchors for the **pinned** page. If the user clicks an anchor that scrolls to an element on a different page, the scroll target doesn't exist in the DOM (because the questionnaire only shows the active page — other pages have `is-page-hidden` and `inert`).

**The result:** clicking a pinned-page anchor when you've navigated away silently fails because the target element is on a hidden page.

### 3.5 Specific Problem: Hash-Based Navigation Race

`context-tracking.js:75-86` handles `hashchange` events. When a user clicks a sidebar link:

1. The link click handler calls `navigateToPage()`
2. `navigateToPage()` sets `activePageId` in the store
3. The store subscription in `context-tracking.js:111-118` calls `updateHashForPage()`
4. `updateHashForPage()` uses `history.replaceState()` — this does **not** trigger a `hashchange` event

However, if the user uses browser back/forward, or if there's a programmatic `location.hash` change, the `hashchange` handler fires and calls `navigateToPage()` again. This can cause a double-navigation if the hash change happens between the click and the store update.

### 3.6 Root Causes Summary

| Issue | Root Cause | Location |
|-------|-----------|----------|
| Flash of wrong context on anchor click | Sub-anchor is set after `sync()` fires from page change | `navigation.js:758-779`, `sidebar.js:1255-1264` |
| Pinned anchor clicks fail silently | Target element is on a hidden page | `sidebar.js:1320-1326`, `navigation.js:766` |
| Potential double-navigation on hash change | `hashchange` handler races with store-driven hash updates | `context-tracking.js:75-86, 111-118` |
| Stale anchor map on every sync | `refreshPageAnchors()` is called on every state change, even when DOM hasn't changed | `sidebar.js:1256` |

### 3.7 Recommended Fixes

1. **Batch the sub-anchor update with the page change.** In `navigateToSubAnchor()`, set both `activePageId` and `activeSubAnchorId` in a single store commit (or use a combined action) to prevent the intermediate state from triggering a render cycle.

2. **Guard pinned-anchor clicks.** In `handleContextClick`, when the context is pinned and the user clicks an anchor that belongs to a different page than the live active page, either: (a) navigate to that page and unpin, or (b) show a message indicating the target is not currently visible.

3. **Debounce `refreshPageAnchors()`.** Only rebuild the anchor map when the questionnaire DOM has actually changed (the `MutationObserver` in `navigation.js:1054-1068` already detects this — `refreshPageAnchors` could be called from there instead of on every `sync()`).

4. **Deduplicate hash changes.** In `context-tracking.js`, compare the resolved page ID before calling `navigateToPage()` in the `hashchange` handler, and skip if the active page already matches.

---

## Summary of Recommended Actions

| Priority | Issue | Fix | Effort |
|----------|-------|-----|--------|
| P0 | Sections locked in default nomination mode | Change default workflow mode to `primary_evaluation` in `getWorkflowMode()` | Small — 1 file, 1 line |
| P1 | Missing reviewer info fields | Add `reviewerName`, `reviewerEmail`, `reviewerAffiliation`, `reviewDate` to S0 schema and page layout | Medium — 3-4 files |
| P2 | Context bar flash on anchor click | Batch sub-anchor + page change into single store commit | Medium — 2 files |
| P2 | Stale anchor map rebuilt every sync | Move `refreshPageAnchors()` to be called only on DOM mutation | Small — 1 file |
| P3 | Pinned anchor click fails silently | Add guard or unpin-on-navigate behavior | Small — 1 file |
| P3 | Hash navigation race | Add equality check before `hashchange` navigation | Small — 1 file |
