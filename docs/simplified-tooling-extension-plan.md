# Simplified tooling and browser extension plan

Date: 2026-04-06
Status: planning only

This plan reduces the larger tooling and extension discussion to one practical product sequence:

1. make reusable test sets useful inside the app;
2. make evidence capture, targeting, and storage reliable inside the app;
3. add a small browser extension only after those pieces already work.

The extension should be a convenience layer on top of a working review product, not the place where the product logic starts.

## What a useful test-set feature looks like in the app

A useful test set is a reusable checklist of review scenarios, not a loose note field.

Each test set should let reviewers define:

- a clear title and short purpose;
- ordered test cases;
- the query, prompt, or scenario to run;
- what the reviewer is trying to learn from that case;
- a suggested criterion target, when one is obvious;
- the kind of evidence usually needed, such as screenshot, URL, export, or note;
- optional benchmark or comparison notes.

Test sets should support drafts and published versions. A published version should stay stable once a review uses it. If a reviewer wants to improve a test set later, they should create a new draft/version rather than changing the old one in place.

The app should treat test sets as a separate product area. They should live in a `Tooling` workspace, not as extra sections inside the 13-page review flow.

### Using test sets during a review

During a review, the reviewer should be able to:

- attach one or more published test-set versions to the review;
- see the linked test cases as a practical work list;
- mark each case as not started, in progress, done, skipped, or blocked;
- record a short outcome for each case;
- add evidence while working through a case;
- see which cases still have no evidence attached.

A good review experience is simple:

- the reviewer opens a test case;
- runs the scenario in the target tool;
- records a short result;
- captures or attaches evidence;
- links that evidence to the review overall, to a specific criterion, or to a review inbox if the target is not clear yet.

Reports should be able to say which test-set version was used and which test cases supported the final judgment. That is the real user value: less repetition, better consistency, and clearer traceability.

### Capture to evidence

The capture flow should feed the same evidence system the app already uses.

In plain terms:

- a capture becomes stored evidence in the review;
- that stored evidence can be linked to the review overall or to a specific criterion;
- the same stored evidence can be reused in more than one place if needed;
- if the reviewer is unsure where it belongs, it should go to a review-scoped inbox first.

This matters because the extension should not invent a second evidence system. It should feed the main one.

### Choosing a criterion target

The first version should keep targeting explicit.

A reviewer should be able to choose one of three outcomes for a new capture:

1. attach it at review level;
2. attach it directly to a specific criterion;
3. send it to the review inbox for sorting later.

Test cases may suggest a likely criterion target, but the reviewer should make the final choice.

The system should also protect the reviewer from bad targets. If a criterion is not currently valid for attachment because of workflow state, read-only state, or skip rules, the system should block the direct link or route the capture to the inbox instead.

### Login and session behavior

The login model should be simple for users:

- the web app handles institutional sign-in;
- the extension does not ask the user to manage a separate permanent account;
- the user pairs the extension from the logged-in app;
- the extension gets a short-lived, revocable session that is only allowed to perform capture-related actions.

If that session expires, upload should stop until the user pairs again. No hidden long-lived API key. No silent fallback that makes support and auditing messy later.

### Privacy limits for capture

The first capture model should stay narrow and easy to explain.

Users should only be able to capture what they intentionally choose, such as:

- the current page URL and title;
- selected text;
- a visible-tab screenshot;
- a short reviewer note.

The first release should not collect more than that. In particular, it should not default to:

- background monitoring;
- browsing history capture;
- hidden DOM capture;
- cookies, storage contents, or request headers;
- automatic periodic screenshots;
- broad scraping of page content the reviewer did not explicitly choose.

That privacy boundary is not a detail. It is part of the product definition.

## Build first

This is the work that should happen before building the browser extension.

### 1. Build reusable test sets inside the app

Start with a tooling workspace where reviewers can:

- create test sets;
- edit draft versions;
- publish stable versions;
- duplicate/fork existing sets;
- tag test cases with suggested criterion targets and expected evidence types.

Why first:

- it gives reviewers immediate value even without an extension;
- it turns repeated evaluation practice into a real product feature;
- it creates the structure the extension will later plug into.

### 2. Build the in-review test-run flow

A review should be able to link a published test-set version and use it as a live work list.

That means building:

- review-linked test sets;
- per-case run status;
- short result notes;
- visibility of missing evidence;
- links from runs to captured evidence.

Why first:

- the product should already support repeatable testing before capture automation arrives;
- reviewers need a clear place to use test sets during a review;
- reporting becomes more meaningful when it can point to actual runs.

### 3. Finish the evidence path in the app

Before an extension exists, the app itself should already support:

- durable evidence storage outside browser memory;
- reuse of stored evidence across criteria;
- manual uploads and pasted URLs;
- a review-scoped capture inbox;
- moving evidence from inbox to a criterion target;
- stable traceability from test run to evidence to final review output.

Why first:

- the core evidence workflow must work even if the extension does not exist;
- the extension should later feed a stable evidence system instead of forcing a redesign.

### 4. Lock down criterion targeting rules

Before the extension starts sending captures, the app/server must already know:

- which reviews the current user can attach to;
- which criterion targets are valid right now;
- when a target is blocked by workflow or skip state;
- how review-level evidence differs from criterion-level evidence;
- when a capture should go to the inbox instead of directly to a criterion.

Why first:

- the extension should present clear, valid choices rather than guess;
- this reduces failed uploads and cleanup work.

### 5. Settle login and session behavior

Before extension work starts, the app should already have:

- institutional sign-in in the web app;
- paired extension sessions;
- short-lived access with revoke/re-pair support;
- audit visibility for who captured and uploaded what.

Why first:

- the extension needs a real security model from day one;
- support becomes much easier when the extension is clearly tied to the user’s existing app session.

### 6. Decide the privacy envelope before coding the extension

Write the first capture policy before building the extension.

Decide:

- which capture types are allowed;
- whether some domains are blocked or restricted;
- what provenance metadata is kept;
- whether preview or redaction is required before upload;
- the retention and deletion rules for captured evidence.

Why first:

- privacy review should shape the product, not arrive as a late patch;
- it prevents rework once capture is already implemented.

## Build next

Once the app already supports test sets, review-linked runs, evidence storage, valid targeting, and paired sessions, build the first browser extension.

### What the first extension should do

The first extension should help a reviewer capture evidence quickly into an existing review. That is enough for version 1.

A useful first extension flow is:

1. the reviewer opens the extension on the page they want to capture;
2. the extension shows the paired user and selected review;
3. the reviewer chooses one target:
   - review-level evidence,
   - a specific criterion, or
   - the review inbox;
4. the reviewer captures:
   - a visible-tab screenshot,
   - or URL/title/selected text,
   - or both;
5. the reviewer adds a short note and confirms upload;
6. the capture appears in the review evidence system with clear provenance.

That is already a meaningful product improvement. It removes copy-paste friction without making the extension responsible for the whole review model.

### How the first extension should work with test sets

A good first integration is modest:

- if the review already has linked test sets, the reviewer can optionally select the active test case;
- the extension includes that test-case reference in the upload;
- the app shows the capture under that run and under the chosen review target.

This should stay optional in the first release. The critical job is still: put the capture into the right review and keep it traceable.

### Capture to evidence in the first release

Each upload should carry enough context to be useful later:

- review ID;
- target type: review, criterion, or inbox;
- criterion code when chosen;
- optional test-case or test-run reference;
- capture time;
- page URL and page title;
- selected text if present;
- reviewer note;
- screenshot file if taken;
- browser and extension version.

The important rule is simple: the extension uploads into the normal review evidence flow. It should not create a side channel that only the extension understands.

### Choosing a criterion target in the extension

The first extension should be explicit, not clever.

That means:

- no auto-guessing the right criterion;
- no attaching to arbitrary parts of the form;
- only showing valid targets returned by the app/server;
- sending the capture to the inbox if the reviewer has not chosen a target or the target becomes invalid.

This keeps the first release understandable and reduces cleanup later.

### Login and session behavior in the extension

The extension should:

- show whether it is paired;
- show which user it is paired as;
- refuse upload when the session has expired or been revoked;
- offer a simple re-pair path through the main app;
- avoid long-lived API keys entirely.

This makes the extension feel like part of the app instead of a separate system with its own support problems.

### Privacy limits for the first extension release

Keep the first release narrow:

- capture only when the user clicks capture;
- only the active tab;
- no background monitoring;
- no automatic full-page or full-site collection;
- no hidden-text capture by default;
- no cookie or local-storage harvesting;
- preview before upload;
- small, reviewable permission scope.

If cropping or redaction is required, keep it lightweight and explicit. The user should stay in control of what is uploaded.

## Leave for later

These ideas may be valuable later, but they should not be part of the first extension release.

- automatic criterion suggestion based on page analysis;
- automatic capture while a test case is running;
- full-page HTML snapshots;
- hidden DOM extraction;
- OCR, summarization, or AI labeling of captures;
- bulk capture workflows;
- browser support beyond Chromium/Edge;
- public browser-store rollout if internal distribution is enough at first;
- direct SharePoint/Graph upload from the extension;
- offline-first local evidence storage as the system of record;
- creating reviews or test sets from the extension;
- editing questionnaire answers from the extension.

Each of these adds complexity, policy risk, or cleanup cost before the basic capture workflow has proven itself.

## Recommended sequence

1. build reusable test sets in the app;
2. build review-linked test runs in the app;
3. finish durable evidence storage, the review inbox, and explicit criterion targeting;
4. settle institutional login, paired extension sessions, and capture privacy rules;
5. build a small Chromium-first extension for explicit, user-confirmed capture into an existing review;
6. expand only after the first capture workflow is stable, trusted, and clearly useful.

In short: make test sets and evidence useful in the app first, then add a narrow extension that speeds up capture without widening the product scope too early.
