# Master implementation roadmap

Date: 2026-04-06
Status: planning only
Scope: authoritative full-scope roadmap for turning the current TRUST questionnaire into a real shared review app

## Purpose

This is the main roadmap for the product.

It keeps the full requested scope, simplifies the implementation approach, and avoids unnecessary architecture churn. The key product decision is simple: **the current questionnaire stays the permanent core work screen**. We are not planning around a full frontend replacement. We are planning around adding the missing product pieces around the questionnaire that already works.

Those missing pieces include login, user settings, dashboard, saved reviews, collaboration workflow, durable evidence storage, import/export, clearer help and reference content, keyboard-first working patterns, denser forms, styling fixes, later test-set tooling, and a later browser extension for faster evidence capture.

## What the app should do

The finished app should let the team:

- sign in and sign out with real user accounts;
- keep basic profile details and small personal settings;
- land on a dashboard that shows reviews to start, continue, review, or decide;
- create a review, save it, leave it, and resume it later from another session or machine;
- do the main work in the **current questionnaire workspace**;
- upload, drag, drop, paste, link, and reuse evidence at review level and criterion level;
- hand work over to a second reviewer;
- let the second reviewer record agreement, disagreement, notes, and added evidence;
- let the team record a final decision and its rationale;
- keep comments, activity, and saved history so the review process is traceable;
- export completed work and import older browser-only work when needed;
- move shared help, reference, and about material out of the crowded single review page while keeping page-specific guidance close to the work;
- improve keyboard-first use, form density, text clarity, and styling without hiding important detail;
- later use reusable test sets and linked test runs inside the app;
- later use a simple browser extension to capture screenshots, URLs, and selected text into the same evidence system.

## Simple architecture choice

Use one straightforward product shape:

- **one web app** for the user interface;
- **one backend service** for login, saving, permissions, workflow, export/import, and evidence APIs;
- **one database** for users, settings, reviews, saved history, assignments, comments, activity, decisions, test sets, and test runs;
- **one private file store** for evidence files;
- **one later browser extension** that sends captures into the same backend and evidence flow.

Implementation should stay equally simple:

- keep the current questionnaire structure, rules, and derived logic as the core review model;
- save each review as one structured review record at first, rather than splitting every field into separate database columns;
- store evidence files outside the browser and keep their links in the database;
- build later tooling and extension work on the same review and evidence model instead of inventing side systems.

## What to keep from the current app

The current app already contains the heart of the product. Keep and build from these parts:

- the current questionnaire as the main review workspace;
- the existing questionnaire structure, section flow, and TRUST principle pages;
- the current rules and derived state model;
- the dense, explicit working layout;
- visible codes, statuses, and progress markers;
- the score control, skip handling, and evidence patterns already in place;
- drag/drop/paste-style evidence intake and evidence reuse patterns;
- the existing keyboard and focus work as the base for stronger keyboard-first operation;
- the current handover, second review, and final decision sections already present in the questionnaire;
- the current styling direction: compact, explicit, and engineered rather than soft or minimal.

## What to build first

### Phase 1 — turn the questionnaire into a real saved app

Start with the smallest complete product shape that makes the current questionnaire usable for real team work.

Build first:

- login and logout;
- user profile details and small user settings;
- a dashboard with create, open, search, filter, and continue actions;
- saved reviews in the database, with save/continue/resume behavior;
- saved history at important moments;
- server-side evidence file storage and evidence links;
- loading the current questionnaire from saved review data;
- saving the current questionnaire back to the backend without changing its core work pattern.

By the end of this phase, the app should already feel like a real product: users can sign in, open the dashboard, resume saved work, and keep evidence with the review instead of inside one browser session.

## What comes next

### Phase 2 — complete the shared review workflow

Once the saved-review core is working, add the collaboration flow that the questionnaire already points toward:

- review ownership and assignments;
- handover from primary reviewer to second reviewer;
- second reviewer notes, agreement/disagreement, and added evidence;
- final team decision recording;
- comments and activity history;
- server-side permissions by role and review stage;
- export for archive, reporting, and sharing;
- import for older browser-only work and existing evidence manifests.

### Phase 3 — make the work surface faster and clearer

After the saved workflow is real, improve day-to-day use without replacing the questionnaire as the main work screen:

- move shared Help, Reference, and About content out of the single review page into app-level surfaces;
- keep only page-specific guidance on the review page itself;
- rewrite help text, labels, validation text, tooltips, and evidence instructions in plain task language;
- finish keyboard-first navigation and focus behavior;
- make forms denser without hiding meaning;
- apply styling fixes so the app stays compact, readable, and stable while scrolling;
- polish evidence upload, preview, note editing, retry, and reuse.

## Later planned features still in scope

These are **later phases in the committed roadmap**, not optional extras.

### Phase 4 — tooling, test sets, and browser-assisted capture

Build the later product layers on top of the same saved review and evidence system:

- a tooling workspace for reusable test sets;
- versioned test sets and linked test runs inside reviews;
- review-level reporting that can show which test cases supported the final judgment;
- a review inbox for captured evidence that is not yet linked to a criterion;
- a later browser extension inspired by Zotero-like capture flow, but much simpler;
- explicit browser capture of screenshot, URL, title, selected text, and note into an existing review;
- direct targeting to review level, criterion level, or review inbox;
- the same login, permissions, evidence storage, and traceability model as the web app.

This later phase matters because the team asked for reusable testing support and faster evidence capture. Those features stay in scope; they are simply sequenced after the core saved review app is stable.

## Guardrails

Use these rules to keep the roadmap simple without quietly cutting scope:

- do not reduce scope by deleting requested features;
- do simplify the build approach and the language used to describe it;
- keep the current questionnaire as the permanent core work screen;
- do not make React, Vite, a full renderer replacement, or a compatibility-migration story the center of the roadmap;
- prefer one web app, one backend service, one database, one file store, and one later extension;
- keep one evidence system for manual uploads, pasted items, imported items, and later extension captures;
- move shared help and reference material out of the single review page, but keep page-specific guidance close to the task;
- keep keyboard-first work, denser forms, and styling improvements in scope as real product work, not polish that can be ignored;
- keep test sets and the browser extension in the committed roadmap even though they come later;
- if a deeper frontend cleanup is wanted later, treat it as optional technical cleanup after the product goals above are working, not as the starting point.

## Recommended next step

Turn **Phase 1** into a short delivery brief with clear acceptance checks for:

- login/logout;
- user profile and settings;
- dashboard and saved review list;
- create/open/save/continue/resume;
- server-side evidence file storage and evidence linking;
- loading and saving the current questionnaire as the main review workspace.

That gives the team a concrete first implementation target while keeping the full roadmap intact.
