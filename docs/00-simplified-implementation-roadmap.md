# Simplified implementation roadmap

Date: 2026-04-06
Status: planning only

## Purpose

This is the short companion version of the full roadmap.

The goal stays the same: turn the current TRUST questionnaire into a real shared review app without replacing the questionnaire as the main work screen. The app must support login, dashboard, saved reviews, evidence, handover, second review, final team decision, import/export, better help and text, stronger keyboard-first use, denser forms, styling fixes, later test sets, and a later browser extension.

## Product shape

Keep the product shape simple:

- a **dashboard** for starting, finding, and resuming reviews;
- a **review workspace** built around the current questionnaire;
- a small **settings/profile** area;
- one backend, one database, and one private evidence file store behind the app;
- one later tooling area for test sets and linked runs;
- one later browser extension for faster evidence capture.

## Four phases

### Phase 1 — make the current questionnaire a real saved app

Build the first complete working version around the questionnaire that already exists:

- login and logout;
- user profile details and small user settings;
- dashboard with create, open, search, filter, and continue review actions;
- saved reviews in the backend and database;
- save, continue, and resume across sessions and machines;
- evidence upload, drag/drop/paste, reuse, and file storage outside the browser, with review-level and criterion-level links;
- the current questionnaire loaded from and saved back to the backend.

### Phase 2 — complete the shared review workflow

Add the full team process around saved reviews:

- review ownership and assignments;
- handover to a second reviewer;
- second reviewer notes, agreement/disagreement, and added evidence;
- final team decision recording;
- comments, activity, and saved history;
- export for archive and reporting;
- import for older browser-only work.

### Phase 3 — improve the work surface

Make the app faster and clearer to use while keeping the questionnaire at the center:

- move shared Help, Reference, and About content out of the crowded single review page;
- rewrite help text, labels, validation text, tooltips, and evidence instructions in plain language;
- improve keyboard-first navigation and focus handling;
- make forms denser without hiding important detail;
- apply styling fixes and scrolling stability fixes;
- polish evidence upload, preview, note editing, retry, and reuse.

### Phase 4 — planned later tooling and browser capture

This phase is **still part of the roadmap**, just later in sequence.

Build:

- reusable test sets in a tooling workspace;
- linked test runs inside reviews;
- reporting that shows which test cases and evidence supported the outcome;
- a review inbox for captured evidence that is not yet sorted;
- a simple browser extension, inspired by Zotero-style capture but much smaller, that sends screenshots, URLs, selected text, and notes into the same review evidence flow.

## Guardrails

- do not simplify by deleting requested features;
- keep the current questionnaire as the permanent core work screen;
- avoid making a full frontend replacement the main story;
- keep one app, one backend service, one database, one file store, and one later extension;
- treat test sets and the extension as planned later phases, not optional side ideas;
- keep keyboard-first use, denser forms, text/help rewrite, and styling improvements in the main roadmap.

## Recommended next step

Turn **Phase 1** into a short delivery brief with acceptance checks for login/logout, dashboard, user settings, saved reviews, save/continue/resume, and server-side evidence storage around the current questionnaire workspace.
