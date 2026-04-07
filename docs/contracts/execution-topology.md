# Execution topology contract

Date: 2026-04-06  
Status: Wave 0 / T003 substream A complete  
Scope: selected runtime topology, backend-for-frontend boundary, storage responsibilities, deployment shape, and current-questionnaire compatibility constraints only

This document freezes the **execution-topology** portion of T003 for the current repository. It defines the corrected file-level interpretation of the selected runtime, the one-web-app deployment shape, the same-origin backend-for-frontend boundary, the database and private file-store responsibilities, and the compatibility constraints required to keep the current questionnaire runtime viable while the product grows into a saved-review application.

This document is intentionally narrower than the full T003 task bundle. It does **not** replace the companion route-model, save/autosave/concurrency, policy-constraints, or deferred-scope documents. It freezes the runtime topology so later backend, shell, persistence, and workflow work do not branch into incompatible product shapes.

## What this document freezes

- one **same-origin web application** as the selected product topology;
- one **Fastify backend-for-frontend (BFF)** as the server boundary for auth, routing, persistence APIs, and secure evidence access;
- one **compatibility-first routed frontend shell** rather than multiple standalone product HTML documents;
- one **PostgreSQL database** for structured records and versioned questionnaire/review state metadata;
- one **private object/file store** for evidence bytes and other large binary artifacts;
- the compatibility boundary between the current `trust-framework.html` / `static/js/app.js` runtime and the later authenticated app-shell/review-shell model;
- the current repository’s static-serving and test-entry assumptions that must survive the topology transition.

## Corrected first-pass file-level requirements

The first-pass T003 execution-topology analysis was reviewed against the roadmap, the executable plan, the backend/frontend plans, the dependency assessment, the current repository entry files, and the already-frozen T001/T002 contracts. The corrected file-level requirements are:

| File or surface | Current responsibility | Contract requirement frozen here |
|---|---|---|
| `package.json` | Defines the current static-only developer commands: `serve:static`, validation, unit tests, and Playwright e2e. No backend runtime exists yet. | Current static commands remain the **compatibility baseline** until T004 adds backend scripts. The selected topology must preserve existing repo-level validation and test command behavior while adding a same-origin server runtime. The topology must not assume a second package root or a mandatory frontend build step before Wave 1. |
| Planned `server/**` runtime | Does not exist yet. T003 must define its role before T004 scaffolds it. | The planned server runtime is a **single Node.js Fastify BFF** that serves the routed compatibility-first web app and same-origin API endpoints. It owns auth/session, API routing, secure downloads, import/export job initiation, and static asset delivery in deployed environments. |
| `trust-framework.html` | Current single document for the questionnaire-only SPA. Assumes the questionnaire shell is the whole page and owns the viewport. | `trust-framework.html` remains the **compatibility document** during the saved-review build-out. It is expanded into the routed application shell path rather than multiplied into separate dashboard/auth/product documents. Its questionnaire workspace remains the canonical work surface embedded inside the broader app topology. |
| `static/js/app.js` | Current bootstrap seam. Creates the store, mounts questionnaire pages, and wires navigation/controls directly against `document`. | `static/js/app.js` remains the **workspace bootstrap seam** for the questionnaire runtime. The selected topology must allow authenticated preload and review-state hydration to be injected around this seam rather than forcing an immediate renderer rewrite. Dashboard/auth shell concerns must stay outside this module. |
| Dashboard entry path | Does not exist yet as a routed app concern. | The selected topology reserves an **authenticated app-shell entry path** that lands users on a dashboard view without creating a second standalone frontend application. Dashboard entry is a routed subview of the same web app, not a separate deployment artifact. |
| Workspace bootstrap path | Today: direct navigation to `trust-framework.html` plus questionnaire hash ownership. | The selected topology must preserve a **review-workspace bootstrap path** inside the same routed web app. The current questionnaire remains the workspace engine; hash/page behavior becomes an internal workspace concern under a review-scoped route rather than the owner of global app identity. |
| `tests/e2e/helpers.js` and current Playwright entry assumptions | Current tests assume direct navigation to `/trust-framework.html`. | The topology must preserve a compatibility path for existing static coverage during the transition. Same-origin server delivery must continue to support current test-path coverage until route-aware replacements are deliberately introduced. |

## Roadmap and plan mismatch corrections applied before freezing this contract

The following mismatches were corrected before writing the topology contract.

| Drift risk | Corrected contract position |
|---|---|
| Treating the frontend UX plan’s React/Vite route-shell recommendation as if it were the selected Wave 0 execution topology. | Corrected: React/Vite remains an **optional later technical evolution** only. The selected topology is compatibility-first and does **not** make React, TypeScript, Vite, or a frontend rewrite mandatory for Waves 0–3. |
| Letting the product drift into multiple standalone HTML entrypoints for dashboard, workspace, help, or review views. | Corrected: the product is frozen as **one routed web application** with one app shell and one nested review shell. Major views are routes/subviews, not separate product documents. |
| Treating the current `serve:static` command as if it were the target production topology. | Corrected: `serve:static` is only the **current development compatibility baseline**. The selected runtime topology is a same-origin Fastify BFF that later serves both app routes and APIs. |
| Treating the current questionnaire bootstrap as if it can continue owning the whole page lifecycle forever. | Corrected: the questionnaire remains the **workspace engine**, but app-level concerns such as auth, dashboard entry, review identity, and secure API access move to the enclosing routed app topology. |
| Allowing save/resume architecture to assume a separate frontend deployment talking to a general-purpose public API. | Corrected: the selected topology is explicitly **backend-for-frontend** and same-origin. Auth/session, CSRF boundaries, save/revision APIs, and secure evidence access are all mediated by the BFF. |
| Leaving storage roles vague enough that review JSON, evidence bytes, and future binary exports could be spread across ad hoc stores. | Corrected: structured data and canonical review state live in PostgreSQL; large binary payloads live in the private file/object store; the BFF mediates both. |
| Treating live co-editing or realtime-first architecture as part of the selected topology. | Corrected: the topology assumes **structured stage ownership**, optimistic conflict handling, and no CRDT/live multi-user editing requirement in the initial path. |

## Reconciliation against roadmap and execution-plan constraints

The corrected topology reflects the following non-negotiable constraints from the roadmap and execution documents:

1. **The current questionnaire remains the permanent core work surface.** The runtime grows around the current workspace instead of replacing it first.
2. **The selected runtime is one same-origin web application.** The browser should interact with one origin for app routes, auth, review APIs, and secure evidence access.
3. **The backend is a Fastify BFF.** The selected architecture uses Node.js + Fastify because it best fits the current JavaScript codebase and the security model.
4. **The initial persisted review contract stays close to `EvaluationState`.** The topology must support direct hydration through `createAppStore({ initialEvaluation })` / `replaceEvaluation()`.
5. **Evidence assets and evidence links stay separate, and durable bytes live outside questionnaire JSON.** The topology must provide both structured metadata storage and private binary storage.
6. **Frontend stack churn is explicitly constrained.** Route and shell ownership are frozen, but a framework rewrite is not on the critical path.
7. **The same-origin path must preserve current static verification during transition.** Existing validation and Playwright baselines are compatibility requirements, not disposable scaffolding.

## Selected runtime topology

The selected product topology is:

- **one web application** exposed under one origin;
- **one Node.js Fastify backend-for-frontend** that serves both routed application delivery and authenticated API endpoints;
- **one compatibility-first frontend shell** that expands from the current questionnaire runtime into an authenticated app shell with a nested review shell;
- **one PostgreSQL database** for structured application and review data;
- **one private object/file store** for evidence binaries and other large non-database artifacts;
- **no separate public SPA host and no separate general-purpose public API surface** as the selected Wave 0–3 topology.

### Topology statement in plain terms

The browser talks to one application origin. That origin serves the routed web UI, performs OIDC/session handling, exposes review/evidence/workflow APIs, and authorizes file downloads. PostgreSQL stores structured state and metadata. Private object/file storage holds evidence bytes and similar large artifacts. The current questionnaire runtime remains the review workspace engine inside that application.

## Selected shell/topology layering

The selected runtime has three layers.

### 1. Same-origin application origin

This is the deployment boundary visible to the browser.

Responsibilities:

- serve the routed web application;
- terminate authentication/session flows;
- expose same-origin APIs;
- mediate secure access to evidence and export artifacts;
- preserve current compatibility access to `trust-framework.html` during transition.

### 2. Fastify backend-for-frontend layer

This is the server execution boundary.

Responsibilities:

- OIDC login/logout/callback handling;
- secure cookie session issuance and validation;
- CSRF boundary enforcement for mutating requests;
- route delivery for the one routed web app;
- review, revision, workflow, evidence, import/export, and profile API endpoints;
- server-authoritative review identity, lifecycle, permissions, and revision metadata;
- secure download/stream mediation for private evidence assets;
- generation or brokering of export/import operations;
- compatibility serving of current static assets during migration.

### 3. Compatibility-first frontend shell

This is the browser-side application layer.

Responsibilities:

- authenticated app shell entry;
- dashboard and app-level surfaces;
- nested review shell ownership of review identity and review-scoped navigation;
- questionnaire workspace bootstrap using the current runtime;
- route-aware embedding of the existing page-based questionnaire behavior as a workspace concern.

## Database responsibilities frozen here

The PostgreSQL database is the durable home for **structured** product state and metadata.

### Canonical database responsibilities

The database stores:

- user records and preference records;
- review records and immutable revisions;
- canonical saved questionnaire state JSON and related version metadata;
- review lifecycle state, workflow metadata, assignments, comments, activity, and audit records;
- evidence asset metadata and evidence link metadata;
- import/export bookkeeping and related job metadata;
- later tooling/test-set/test-run metadata when those waves begin;
- later extension session metadata when that wave begins.

### What the database must not be required to do in the selected topology

The database is **not** the durable home for:

- evidence file bytes;
- screenshot binaries;
- large preview payloads;
- inline browser `dataUrl` blobs as a production storage model;
- questionnaire `derived` or `ui` state as canonical persisted review state.

### Canonical database role relative to current runtime

The database stores the canonical saved-review envelope defined by `docs/contracts/review-state-contract.md`, including:

- `workflow_mode`
- `lifecycle_state`
- `state_schema_version`
- `framework_version`
- `current_state_json`
- revision/concurrency metadata

That means the database is the durable home for the **saved-review record**, while the current frontend derive layer continues to compute validation, progress, recommendation, and escalation from hydrated questionnaire state.

## Private file/object store responsibilities frozen here

The private object/file store is the durable home for **large binary artifacts** and other non-database payloads.

### Canonical file-store responsibilities

The file/object store stores:

- uploaded evidence file bytes;
- captured screenshots and similar binary evidence assets;
- server-generated previews or renditions when those exist;
- imported evidence bundles staged for processing where needed;
- export ZIPs or other large generated package artifacts when those are materialized outside the database.

### What the file/object store must not become

The file/object store is **not** the durable home for:

- the canonical questionnaire/review state JSON;
- assignments, comments, lifecycle state, permissions, or audit metadata;
- the only source of truth for evidence link scope or link notes;
- frontend-only session state or hash/page navigation state.

### Canonical relationship between database and file store

The selected topology freezes the following relationship:

- binary payloads live in private object/file storage;
- structured metadata, ownership, review scoping, and provenance live in PostgreSQL;
- the Fastify BFF mediates access between them;
- the browser does not treat object storage as a direct public system of record.

## Current-questionnaire compatibility constraints

The selected topology is only compliant if all of the following remain true.

1. **The current questionnaire runtime remains bootstrappable through `trust-framework.html` and `static/js/app.js`.**
   - The workspace engine remains the current questionnaire runtime.
   - App-shell growth wraps or contains that runtime rather than replacing it first.

2. **The hydration seam remains `createAppStore({ initialEvaluation })` / `replaceEvaluation()`.**
   - The routed application topology may preload review data around the workspace bootstrap.
   - It must not require a new canonical questionnaire state shape.

3. **The current derive layer remains authoritative for derived questionnaire behavior.**
   - Validation, progress, escalation, recommendation, and workflow accessibility remain derived from hydrated state.
   - The topology must not force those semantics into server-only rendered output before the contracts say so.

4. **Hash-based page navigation remains a workspace-local compatibility concern during transition.**
   - The current workspace may continue to use hash behavior internally.
   - Global app identity, review identity, and major subview ownership must move above that layer.

5. **Dashboard/auth/app-shell concerns must stay outside the questionnaire modules.**
   - `static/js/app.js` and the current questionnaire renderer are not the right place for global app routing, auth chrome, or dashboard logic.
   - The selected topology encloses the questionnaire instead of smearing app concerns through it.

6. **Same-origin serving must preserve current static testability during the transition.**
   - Existing static entry assumptions must remain supportable until route-aware tests intentionally replace them.
   - This includes continued support for current validation and Playwright coverage paths.

7. **Current viewport/shell ownership assumptions must be treated as compatibility constraints, not ignored.**
   - The current questionnaire runtime owns body scroll and viewport shell behavior today.
   - Later shell embedding must explicitly contain or revise those assumptions rather than silently colliding with them.

8. **Evidence compatibility remains projection-based.**
   - The selected topology must support the current `EvaluationState.evidence` compatibility view even after durable asset/link storage moves server-side.
   - It must not invent a second user-facing evidence system during the saved-review transition.

## Compatibility path for current serving and testing

The repository currently exposes a static-only development path through `package.json` and Playwright assumptions rooted in `/trust-framework.html`.

This contract freezes the following compatibility path:

1. the current static document path remains a supported compatibility entry during the transition;
2. the future same-origin Fastify runtime must be able to serve the same static asset tree and compatibility document path while also hosting routed application entry and APIs;
3. no selected topology may require immediate replacement of current validation or Playwright coverage before the backend scaffold exists;
4. route-aware shells may be introduced later, but they must preserve or deliberately supersede the current coverage path rather than accidentally breaking it.

## Local, staging, and production topology expectations

### Local development

Local development in the selected topology is expected to support:

- one same-origin Fastify runtime once T004 begins;
- local PostgreSQL;
- local private object-storage emulation or equivalent private file-store development path;
- a development OIDC configuration or mock;
- continued ability to run today’s static compatibility path until the backend runtime becomes the normal dev entry.

### Staging/integration

Staging is expected to support:

- the same-origin routed app + API topology as production;
- a separate PostgreSQL database;
- a separate private object store;
- separate OIDC application registration/configuration;
- export/import and migration validation against the same selected topology.

### Production

Production is expected to support:

- one same-origin HTTPS deployment;
- Fastify BFF mediation of auth, APIs, and secure asset access;
- PostgreSQL with backup/recovery controls;
- private object storage with no public anonymous evidence access;
- structured operational logging and auditability.

## Explicitly rejected topology options for the selected path

The following are **not** the selected topology for Waves 0–3.

- a React/Vite frontend rewrite as a prerequisite to saved-review delivery;
- multiple standalone HTML product entrypoints for dashboard/workspace/help/review subviews;
- a separate public SPA deployment plus separate cross-origin API as the baseline architecture;
- browser-held long-lived auth tokens as the core security model;
- field-per-column questionnaire persistence as the initial storage strategy;
- durable inline evidence `dataUrl` storage in canonical review state;
- live simultaneous co-editing as an assumed architectural requirement;
- microservices as the initial product topology.

## Explicit non-goals

This document does **not** do any of the following:

- define the detailed app-shell/review-shell route tree or URL grammar;
- define save cadence, autosave timing, conflict UX, or revision triggers;
- define the policy decisions for guest reviewers, second-reviewer rights, comment granularity, retention, or extension capture scope;
- define backend folder/file structure under `server/**` beyond the runtime role frozen here;
- define specific cloud deployment vendors as binding requirements beyond the same-origin BFF + database + private file-store shape;
- define export/import package contents in detail.

## Acceptance condition for downstream work

Any implementation that claims compliance with this execution-topology contract must satisfy all of the following:

- the selected runtime remains a **same-origin Fastify BFF plus one routed compatibility-first frontend shell**;
- the product remains **one web app**, not multiple standalone product documents;
- PostgreSQL owns structured review/application metadata and canonical saved-review state;
- the private file/object store owns evidence binaries and similar large artifacts;
- the current questionnaire runtime remains a valid workspace engine and compatibility bootstrap path;
- current static validation/e2e coverage paths remain preserved or intentionally superseded, not accidentally broken;
- React/Vite or other frontend framework migration remains optional later technical evolution rather than an implicit prerequisite.
