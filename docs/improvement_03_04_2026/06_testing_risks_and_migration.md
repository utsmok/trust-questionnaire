# Testing, Risk, and Migration Assessment for the TRUST Questionnaire Refactor

## Title and scope

This report assesses implementation risk, quality gates, and migration strategy for refactoring the current TRUST questionnaire prototype in `/home/sam/dev/trust-questionnaire`. The assessment covers the current implementation artifact (`trust-framework.html`), the canonical framework and questionnaire specifications (`docs/trust-framework-v2.md` and `docs/trust-questionnaire.md`), the current absence of build and test tooling at the workspace root, and the implications of the existing wave plans that all target the same HTML file.

The objective is to minimize regression risk while improving maintainability. The report does not propose a framework migration. It evaluates whether minimal tooling is warranted, how validation and dynamic behavior should be tested, and what migration sequence is least risky.

## Current project/tooling state

### Repository structure

The current workspace is a static-document repository.

| Area | Current state |
|---|---|
| Runtime artifact | One primary implementation file: `trust-framework.html` |
| Supporting assets | `static/` contains image assets used by the HTML document |
| Canonical written specification | `docs/trust-framework-v2.md` and `docs/trust-questionnaire.md` |
| Research/planning artifacts | Hidden wave plan and recommendation files in the repository root (`.wave1-plan.md`, `.wave2-plan.md`, `.wave3-plan.md`, related recommendation files) |
| Application packaging | No `package.json` found at workspace root |
| Lockfiles | No `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock` found |
| Test harness | No Playwright, Vitest, Jest, Cypress, or equivalent config found |
| Backend/tooling metadata | No `pyproject.toml` or `requirements.txt` found |

### Canonical source of truth

The questionnaire specification explicitly states that it is the authoritative implementation reference for Microsoft Forms or any other platform (`docs/trust-questionnaire.md:5`). It defines 132 fields across sections `0`, `1`, `2`, `3`, `4`, `5`, `6`, `7`, `8`, `9`, `10A`, `10B`, and `10C` (`docs/trust-questionnaire.md:512-529`).

The framework document defines the operational model and minimum evidence requirements (`docs/trust-framework-v2.md:192-229`) and states that the intended operational stack is Microsoft Forms, Power Automate, and MS Lists / SharePoint (`docs/trust-framework-v2.md:286-292`). This is materially important: the current HTML file is a prototype/reference artifact, not a packaged web application with an existing delivery pipeline.

### Current implementation surface

`trust-framework.html` is a monolithic document containing:

- inline CSS for all layout, typography, color, accessibility, print, and responsive behavior;
- inline JavaScript for navigation, section synchronization, keyboard handling, rating interaction, ARIA state management, checkbox behavior, completion tracking, and scroll shadows;
- a dual-panel structure that couples framework text to questionnaire sections.

The client-side behavior is non-trivial. The script block at approximately `trust-framework.html:2124-2622` currently implements:

- synchronized section navigation and active-state updates across both panels;
- `IntersectionObserver`-based section dominance and panel-title updates (`trust-framework.html:2281-2317`);
- rating-scale interaction, keyboard navigation, `aria-checked` state, and score-specific classes (`trust-framework.html:2356-2440`);
- checkbox state behavior and fallback class management (`trust-framework.html:2442-2464`);
- completion badges and the header completion strip, hardcoded against section IDs and selector contracts (`trust-framework.html:2492-2562`);
- keyboard shortcuts for section jumps (`trust-framework.html:2622-2632`).

This is already beyond a static brochure page. It behaves like a compact prototype application, but it has no automated regression boundary.

## Key implementation risks and likely failure modes

### 1. Specification drift between prototype and canonical docs

This is the primary semantic risk.

The documentation is explicit that `docs/trust-questionnaire.md` is the authoritative implementation source. The HTML file is not identified as authoritative. If the refactor treats `trust-framework.html` as the source of truth, the implementation can drift from:

- field counts;
- section structure;
- conditional rules;
- governance workflow fields;
- wording that determines review semantics.

Likely failure modes:

- a field present in the canonical questionnaire is omitted or renamed in the refactored artifact;
- a conditional field remains visible, hidden, or required under the wrong conditions;
- governance sections `10A`, `10B`, and `10C` lose parity with the spec;
- evidence and scoring language diverges from the framework document.

### 2. DOM-selector coupling in the current JavaScript

The current script is tightly coupled to the existing markup contract. It depends on exact section IDs, `data-section` values, `.criterion-card` structure, `.rating-scale` containers, and specific heading placement.

The completion logic is particularly fragile because it hardcodes section IDs and selector strings (`trust-framework.html:2492-2499`). The ARIA labeling for rating groups depends on a heading inside `.criterion-card` and a `data-criterion` attribute (`trust-framework.html:2434-2436`).

Likely failure modes:

- renaming or re-wrapping sections silently breaks navigation sync or completion tracking;
- moving headings or criterion markup breaks radiogroup labels;
- extracting repeated markup without preserving classes and attributes breaks multiple behaviors simultaneously.

### 3. Scroll synchronization and observer instability

The dual-panel sync logic uses active-section dominance and mirrored scrolling. This is inherently sensitive to layout changes, threshold tuning, and wrapper changes.

Likely failure modes:

- oscillation between adjacent sections during scrolling;
- incorrect active section in the header/nav;
- lock state not releasing correctly after programmatic scroll;
- active panel title and completion state referring to different logical sections;
- breakage at responsive breakpoints when the split layout collapses.

This is the highest-risk behavior cluster in the file.

### 4. Validation logic can be implemented from the wrong source

The questionnaire spec contains many conditional rules, for example:

- nomination reason required for nominations (`docs/trust-questionnaire.md:68`);
- scope rationale required for out-of-scope or partially in-scope tools (`docs/trust-questionnaire.md:82`);
- sign-in method required when an account is required (`docs/trust-questionnaire.md:87`);
- repeated-query text and benchmark sources required conditionally (`docs/trust-questionnaire.md:102-104`);
- uncertainty/blocker fields required when scores are `0` or `1` across multiple criteria (`docs/trust-questionnaire.md:123-398`);
- critical fail notes required when any critical-fail checkbox is selected (`docs/trust-questionnaire.md:426`);
- recommendation caveats required for non-clean recommendation states (`docs/trust-questionnaire.md:453`);
- second-review conflict fields required under partial agreement or disagreement (`docs/trust-questionnaire.md:489-491`).

The current HTML mostly surfaces these conditions as visual tags. It does not implement a complete executable validation model. Refactoring without first establishing a validation matrix from the spec creates a direct risk of incorrect business rules.

### 5. Accessibility regression risk

The current file already includes a non-trivial accessibility surface: skip link, heading hierarchy, visible focus states, keyboard shortcuts, radiogroup behavior, reduced-motion handling, print fallbacks, and read-only checkbox conventions.

Likely failure modes:

- keyboard-only navigation degrades during markup extraction;
- `aria-checked`, `aria-labelledby`, or focus behavior regresses while moving rating markup;
- read-only mock controls become inaccessible to screen readers;
- print styles or section labels disappear during CSS cleanup.

### 6. Visual-density and print regression risk

The design intentionally optimizes for information density. Minor spacing or typography changes can substantially change scan performance. The print stylesheet is also part of the usable surface, not an afterthought.

Likely failure modes:

- increased whitespace reduces effective information density;
- long text causes overflow in badges, headings, or criterion labels;
- responsive breakpoints produce unusable rating grids;
- print output loses principle identity or becomes structurally ambiguous.

### 7. Multi-wave merge pressure on one file

The repository contains several wave plans and recommendation files, all focused on `trust-framework.html`. This increases the probability of overlapping edits, stale assumptions, and partial application of prior recommendations.

Likely failure modes:

- a refactor reintroduces issues already addressed in a previous wave;
- new changes assume a selector or token still exists when it has already been renamed;
- future waves become harder to apply because the file no longer matches the assumptions encoded in the plan documents.

## Recommended quality gates and verification strategy for this repo

The quality strategy should reflect the actual repository shape: one static prototype file, no build pipeline, and significant DOM-coupled behavior. The correct first layer is browser-level regression testing, not deep unit-test coverage.

### Gate 0: Canonical spec parity check

Before structural changes, create a traceability matrix from the canonical docs.

Required checks:

- section count and section IDs align with the questionnaire spec;
- principle criterion counts align with the framework and questionnaire docs;
- all conditional rules in the questionnaire spec are represented in the migration test matrix;
- governance subsections `10A`, `10B`, and `10C` are preserved;
- evidence and scoring semantics remain aligned with `docs/trust-framework-v2.md`.

A refactor should not proceed past this gate if the HTML artifact and canonical docs do not agree on structure.

### Gate 1: Static structure validation

Add structural checks that can run quickly on every change set.

Recommended checks:

- HTML validation for duplicate IDs, invalid nesting, missing labels, and broken ARIA references;
- verification that all required section IDs, `data-section` values, and `data-criterion` attributes remain present;
- formatting check to reduce accidental diff noise.

### Gate 2: Browser interaction smoke tests

Run these on a local static server, not via `file://`. The current behavior depends on layout, scroll position, focus movement, and animation timing; those are best tested in a real browser engine.

Minimum automated scenarios:

1. **Navigation sync**
   - clicking `TR`, `RE`, `UC`, `SE`, `TC` updates both panels;
   - active nav state matches the visible dominant section;
   - panel titles update correctly while scrolling.

2. **Rating interaction**
   - clicking a rating option applies `selected` and the correct score class;
   - arrow keys move focus; `Enter` and `Space` select;
   - `aria-checked` state changes correctly;
   - radiogroups retain valid labels after refactor.

3. **Completion tracking**
   - scoring all cards in a principle updates the principle badge;
   - the matching header strip cell becomes filled;
   - refactoring section wrappers does not break hardcoded completion mappings.

4. **Checkbox/read-only state**
   - checkbox fallback classes still apply;
   - focus rings remain visible where expected;
   - read-only placeholder semantics remain intact.

5. **Keyboard navigation**
   - skip link works;
   - `Alt+1` through `Alt+5` jump to the expected principles;
   - focus order remains stable after markup extraction.

6. **Responsive behavior**
   - stacked layout at the mobile/tablet breakpoint remains usable;
   - rating controls do not collapse into unreadable states.

Recommended browser matrix:

- Chromium: mandatory;
- Firefox: mandatory, because of the existing `:has()` fallback and layout/scroll behavior risk;
- WebKit: optional, useful for print and layout confidence but not required for the first pass.

### Gate 3: Validation-rule tests

Validation should be tested as a rule matrix, not as ad hoc manual clicking.

Minimum branch set:

- submission type: nomination vs primary evaluation vs second review vs final decision vs re-evaluation;
- account required: yes/no;
- in-scope check: in scope / out of scope / partially in scope;
- repeated-query test: yes/no;
- benchmark comparison: yes/no;
- low criterion score: `0/1` vs `2/3`;
- any critical-fail flag checked vs none checked;
- recommendation status: recommended vs conditional states;
- second-review agreement: full / partial / disagreement.

For each branch, test both the positive and negative requirement condition. This is the only reliable way to prevent conditional-rule regressions across a 132-field specification.

### Gate 4: Visual regression snapshots

Because the interface is deliberately dense, visual regressions are operationally relevant.

Minimum snapshots:

- desktop split view;
- stacked layout breakpoint;
- narrow mobile breakpoint;
- one completed principle state;
- one low-score/condition-tag state;
- print/PDF output.

These snapshots should be treated as regression assets, not design references.

### Gate 5: Manual accessibility and print audit

Automated checks are necessary but not sufficient. A minimal manual pass remains necessary after each structural batch.

Required manual checks:

- keyboard-only traversal;
- screen-reader smoke test for headings, radiogroups, and section landmarks;
- reduced-motion behavior;
- print preview legibility and principle identification.

## Recommendation on whether to add minimal tooling for maintainability/testing

### Recommendation

Yes. Minimal tooling is warranted.

### Rationale

The repository is too interactive to refactor safely without repeatable checks, but it is not complex enough to justify a framework or bundler migration. The correct response is to add test-only and validation-only tooling, not runtime architecture.

### Recommended minimum toolset

1. **`package.json` for scripts only**
   - no bundling requirement;
   - no runtime dependency graph beyond testing and validation.

2. **Playwright**
   - highest value for this repository because the risk surface is browser behavior, not business logic in isolated modules;
   - suitable for interaction tests, keyboard tests, responsive snapshots, and print checks.

3. **HTML validation**
   - use an HTML validator such as `html-validate` to catch structural and ARIA regressions early.

4. **Optional formatting guard**
   - use a formatter such as Prettier only to control diff noise.

### Explicit non-recommendations

Do not add the following in the first refactor phase:

- React, Vue, Svelte, or another UI framework;
- Vite, Webpack, or another bundler;
- TypeScript migration for the inline script as a first move;
- component-library extraction before browser tests exist.

The current prototype and the documented production target do not justify that cost. The repo needs regression protection, not a new runtime model.

## Proposed migration sequence and rollback points

The least risky sequence is to freeze behavior first, then refactor in narrow batches while preserving the current DOM contract.

### Stage 1: Baseline capture

Actions:

- freeze the current HTML artifact as the behavioral baseline;
- capture desktop, tablet, mobile, and print screenshots;
- record a short manual checklist for navigation, rating selection, completion strip updates, and keyboard shortcuts.

Rollback point: **R0**

- exact current `trust-framework.html` with no structural changes.

### Stage 2: Add tooling only

Actions:

- add minimal test tooling and a local static-server test path;
- implement structural validation and browser smoke tests against the current file;
- do not refactor markup, CSS, or JS yet.

Rollback point: **R1**

- tooling is present, runtime artifact unchanged.

This stage is low risk and creates the safety boundary required for all later changes.

### Stage 3: Lock the canonical contract

Actions:

- derive a machine-checkable contract from `docs/trust-questionnaire.md` and `docs/trust-framework-v2.md`;
- confirm field counts, section identifiers, criterion counts, and conditional rules;
- resolve any prototype/spec drift before code movement.

Rollback point: **R2**

- spec-aligned baseline with tests, still using the existing monolithic file.

### Stage 4: Refactor static structure without changing selectors

Actions:

- extract or normalize repeated static markup only if classes, IDs, `data-section`, `data-criterion`, and heading relationships remain unchanged;
- avoid moving behavior and structure in the same change set.

Rollback point: **R3**

- static markup cleanup complete, dynamic behavior contract unchanged.

This is the last safe point before touching behavior.

### Stage 5: Refactor behavior in isolated clusters

Perform behavior work in separate commits or PR-sized batches.

Recommended order:

1. navigation and section-sync cluster;
2. rating/ARIA/completion cluster;
3. checkbox/read-only/focus cluster;
4. responsive/print cleanup cluster.

Run the full gate set after each cluster.

Rollback points:

- **R4** after navigation/sync changes;
- **R5** after rating/completion changes;
- **R6** after checkbox/accessibility changes;
- **R7** after responsive/print changes.

### Stage 6: Optional code organization cleanup

Only after the prior stages are stable:

- consider moving inline CSS and JS into separate assets or modules;
- only do this if the DOM contract is already covered by tests;
- do not combine asset extraction with semantic content updates.

Rollback point: **R8**

- behavior stable, code organization improved, no semantic drift.

## Highest-risk migration step

The highest-risk step is any change that alters the current section and criterion markup contract before browser tests are in place.

In practical terms, the most dangerous operation is refactoring the panel and criterion wrappers while preserving all of the following simultaneously:

- section IDs;
- `data-section` values;
- `data-criterion` attributes;
- heading placement used for ARIA labels;
- selector paths used by completion tracking;
- layout relationships used by scroll synchronization.

If this step is executed before Stage 2 and Stage 3 are complete, failure will be difficult to detect quickly and difficult to attribute precisely.

## Explicit proposed solution summary

1. Treat the documentation, not the HTML file, as the canonical contract.
2. Keep the runtime model static. Do not introduce a framework or bundler.
3. Add minimal tooling only: static validation plus Playwright browser checks.
4. Freeze the current DOM contract before refactoring structure or behavior.
5. Refactor in narrow behavior clusters with a rollback point after each cluster.
6. Defer deeper architectural cleanup until the browser regression boundary exists.

This approach minimizes semantic drift, preserves the current dense interaction model, and introduces only the amount of tooling required to make the refactor testable and reversible.
