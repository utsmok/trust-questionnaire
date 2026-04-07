# Simplified core product plan

## Product shape in one sentence

This should become a shared review app for the EIS-IS team: reviewers pick up a tool from a dashboard, work through the TRUST questionnaire in a dense workspace, save as they go, share the review with a second reviewer, record a team decision, and export the result.

## What this app is for

The current single page already contains the core review flow:

- workflow control
- tool profile
- evaluation setup
- the five TRUST principle sections
- critical fails and confidence
- overall recommendation
- primary handoff
- second review
- final team decision

That flow should stay. The main change is that it should no longer be the whole product by itself.

The finished product should wrap that review flow in the missing pieces users actually need:

- a main dashboard
- saved reviews that can be resumed later
- sharing and handoff between reviewers
- clear second-review and team-decision steps
- import and export
- reusable help and reference content

## Who the product is for

### Primary reviewer

The person who creates or owns the review, gathers evidence, fills in most of the questionnaire, and hands it off.

### Second reviewer

The person who checks the first review, agrees or disagrees, adds corrections, and records a second opinion.

### Team decision maker

The person or small group who look at the finished review, resolve disagreement if needed, and record the final recommendation.

### Important scope note

For v1, this can stay an internal tool for the EIS-IS team and close collaborators. It does not need a broad public-user model on day one.

## What the finished app should let a user do

A user should be able to:

1. open a dashboard and immediately see what reviews exist, what needs attention, and what they should work on next;
2. create a new review for a tool or import an existing review bundle;
3. open a saved review and continue where they left off;
4. move quickly through the questionnaire with keyboard-friendly controls and dense forms;
5. attach evidence at review level and criterion level;
6. see context, reference material, and help alongside the form while working;
7. save continuously and trust that work is not trapped in one browser tab;
8. share a stable review link with another team member;
9. hand the review to a second reviewer without copying data around manually;
10. record second-review agreement, disagreement, and follow-up points clearly;
11. record a final team decision, publication status, caveats, and next review date;
12. export a review for archiving, sharing, or reporting;
13. import an earlier review so work can be resumed or migrated;
14. understand the interface quickly because labels, help text, and action names are clearer than they are now.

## The recommended finished product

The simplest correct end state is:

- **one app**;
- **one main dashboard**;
- **many saved reviews**;
- **one core review workspace per review**;
- **a clear handoff from primary reviewer to second reviewer to team decision**;
- **export/import as a normal part of the product**;
- **shared help and context content that can be shown both in the workspace and in a help view**.

In plain terms: the current questionnaire page becomes the main work screen inside a broader review application.

## Proposed app structure: screens and jobs to be done

| Screen / view | Main job to be done | What the user should be able to do there |
|---|---|---|
| **Dashboard** | Find and manage work | See all reviews, filter by status, open recent work, create a review, import a review, see items waiting for second review or team decision |
| **Review overview** | Understand the state of one review | See tool identity, review status, reviewers, save status, progress, evidence count, open actions, and jump into the right section |
| **Review workspace** | Do the detailed evaluation work | Fill in sections, score criteria, add notes, attach evidence, move by keyboard, use the page index, see guidance/reference/about content, save automatically |
| **Evidence view** | Check and manage evidence across the whole review | See all evidence in one place, filter by section or criterion, reuse evidence, remove duplicates, confirm that evidence coverage is complete |
| **Second review view** | Review and challenge the first pass | Read the first review, compare judgments, record agreement or disagreement, flag criteria to revisit, add second-review comments |
| **Team decision view** | Record the final institutional outcome | Review both reviewer inputs, record final status, note caveats, choose publication status, set next review date, capture final rationale |
| **Import / export view** | Move reviews in and out safely | Import an existing review bundle, export the current review bundle, export a human-readable summary for sharing or archive |
| **Help / reference view** | Get context outside the form | Read the TRUST guidance, scoring model, evidence rules, workflow help, and keyboard shortcuts in one place |

## How these screens fit together

A simple v1 flow should look like this:

1. **Dashboard**
   - user sees their queue;
   - opens an existing review or creates a new one.

2. **Review overview**
   - user checks the tool, status, reviewers, and progress;
   - enters the workspace.

3. **Review workspace**
   - user completes the questionnaire;
   - adds evidence and notes;
   - saves automatically;
   - shares or hands off when ready.

4. **Second review view**
   - second reviewer checks the work and records agreement or disagreement.

5. **Team decision view**
   - final decision is recorded with rationale and review timing.

6. **Export**
   - review can be exported as a bundle and as a readable summary.

That is the core product. If the app does these things well, it already solves the real need.

## What should be reused from the current page

The current page already contains a lot of the right product behavior. Reuse it.

### Reuse the questionnaire structure

Keep the current section order and section types:

- intake and setup sections;
- five TRUST principle sections;
- critical fails and confidence;
- recommendation;
- handoff, second review, and final decision.

This is already the real work model. It should remain the core review workflow.

### Reuse the dense workspace layout

The current split is good and should survive:

- left page index;
- center form workspace;
- right context/reference/about area.

That is already a strong keyboard-first review instrument. It should become the review workspace screen, not be thrown away.

### Reuse the existing UI patterns

Keep these as the baseline:

- criterion cards;
- score dropdown;
- skip accordion;
- evidence block;
- progress strip and section progress logic;
- keyboard handling and focus behavior;
- compact, dense layout.

### Reuse the existing help structure

The current guidance, reference, and about content already has useful structure. Keep the structure, but stop keeping the source text only inside one HTML page.

The content should be extracted and reused in:

- the right-side workspace panel;
- a dedicated help/reference view;
- overview and decision screens where useful.

## What needs to change

### 1. The app needs a real starting point: the dashboard

Right now the product drops users straight into one review page. That is not enough once there are many reviews.

The dashboard should become the first screen after sign-in. It should show:

- reviews assigned to me;
- reviews in progress;
- reviews waiting for second review;
- reviews waiting for team decision;
- recently updated reviews;
- simple search and filters.

### 2. Saving must become normal, not fragile

The finished app should save work as a normal feature.

Users should be able to:

- close the browser and come back later;
- reopen the same review from another machine;
- trust that evidence and notes are still there;
- see when the review was last saved.

### 3. Sharing should be built in

Sharing should not mean sending screenshots or moving files around manually.

A user should be able to:

- send another reviewer a stable review link;
- assign or hand off the review to a second reviewer;
- know who owns the current step.

### 4. Second review and team decision should be first-class

The current questionnaire already has handoff, second review, and final decision sections. That is good.

What is missing is product-level clarity around them.

The app should make it obvious:

- when a review is still in first pass;
- when it is waiting for second review;
- when reviewers disagree;
- when it is ready for team decision;
- when the final decision has been made.

### 5. Export/import should be part of the normal workflow

Import and export should not be emergency tools only.

Users should be able to:

- import an existing review bundle to continue work;
- export a full bundle for backup or transfer;
- export a readable report for discussion, archive, or publication prep.

### 6. Help and context content should be easier to maintain and easier to use

The current context rail is useful, but its content should be cleaned up and reused.

The finished app should:

- keep context beside the form while users work;
- offer the same content in a dedicated help/reference view;
- make keyboard shortcuts easy to find;
- make help text shorter, clearer, and less repetitive.

### 7. Forms should get denser and clearer

The recent direction is correct: less visual waste, less filler text, more useful information.

The finished workspace should:

- stay compact;
- keep section and criterion codes visible;
- keep scores and evidence counts easy to scan;
- reduce repeated labels and decorative text;
- rewrite field labels and help text in plainer language;
- keep long explanations available without making every screen feel bloated.

## What can stay simple in v1

V1 does not need to solve every workflow edge case.

Keep these parts simple:

- **Internal users only.** No need for a complicated public or external-user model at launch.
- **One main dashboard.** It can start as a practical table/list view with a few useful filters.
- **One primary reviewer and one second reviewer.** Do not design for large review committees in v1.
- **Simple sharing.** A stable internal link plus clear assignment is enough.
- **No live co-editing.** Users do not need Google Docs-style simultaneous editing for v1.
- **Simple save model.** Autosave plus visible save state is enough.
- **Simple comments.** Review notes and second-review notes are enough; full threaded discussions can wait.
- **Simple import/export.** One durable import format and one or two export formats are enough.
- **Assignments inside the review overview.** A separate assignment management area is not necessary in v1.
- **Help center kept practical.** Reuse the current content and improve it; do not build a huge documentation product first.

## What should wait until later

These are useful, but they should not define the first real product:

- browser extension capture;
- capture inboxes and advanced tooling workspaces;
- live presence indicators;
- simultaneous editing;
- advanced analytics and reporting dashboards;
- highly granular permission models;
- external reviewer invitations;
- complex notification systems;
- reusable benchmark/test-set management outside the main review flow;
- large-scale workflow automation.

## Keep / change / add later

### Keep

- the current questionnaire section model;
- the dense review workspace;
- left index + center form + right context layout;
- criterion cards, score dropdown, skip accordion, evidence block;
- keyboard-first interaction and strong focus handling;
- explicit progress and workflow visibility.

### Change

- make the dashboard the main entry point;
- turn reviews into saved records that can be reopened and shared;
- make second review and team decision clear product steps;
- add import/export as standard features;
- extract help/context/reference content so it can be reused across screens;
- simplify and clarify form copy.

### Add later

- browser-assisted capture;
- real-time collaboration;
- advanced reporting;
- extra tooling workspaces;
- broader user/role models;
- deeper automation.

## Recommended v1 target

V1 should be considered successful when a reviewer can:

- start from a dashboard;
- open or create a review;
- complete the questionnaire in a dense keyboard-friendly workspace;
- save and resume work;
- share the review with a second reviewer;
- record second-review feedback;
- record a final team decision;
- export or import the review;
- use clear help and context without leaving the app.

That is the core product.

Everything else is useful, but secondary.
