# Architecture decomposition recommendation for `trust-framework.html`

> **Note:** This document describes the pre-migration architecture and the planned decomposition. The actual implementation differs — see CLAUDE.md for the current file structure.

## Scope

This report evaluates how to decompose the current single-file page in `trust-framework.html` into maintainable separate HTML, CSS, and JavaScript files, with further decomposition only where it produces a clear maintenance benefit. The focus is architecture, module boundaries, state ownership, metadata/config extraction, and reduction of monolithic coupling. No implementation changes are proposed here.

## Current-state findings

1. **All three concerns are co-located in one file.**
   - Inline CSS occupies `trust-framework.html:10-1357`.
   - Page markup occupies `trust-framework.html:1394-2123`.
   - All behavior is implemented in a single inline script beginning at `trust-framework.html:2124`.

2. **The page is structurally two applications in one document shell.**
   - The left framework panel is long-form reference content (`trust-framework.html:1400-1600`).
   - The right questionnaire panel is a structured evaluation instrument (`trust-framework.html:1619-2117`).
   - These two areas have materially different change patterns and should not share one undifferentiated implementation surface.

3. **The repository already contains canonical source documents that overlap with the HTML page.**
   - `docs/trust-questionnaire.md:5` explicitly states that it is the canonical specification and authoritative reference for implementation.
   - `docs/trust-questionnaire.md:57-510` defines the questionnaire structure and field inventory.
   - `docs/trust-framework-v2.md:13` states that version 2 supersedes the earlier framework.
   - `docs/trust-framework-v2.md:288-294` states that the implementation should store structured fields as typed data rather than burying them in free text.
   - The current HTML duplicates both the framework content and the questionnaire structure instead of consuming one declared source of truth.

4. **The questionnaire side is highly repetitive.**
   - Criterion-card blocks are repeated across the principle sections starting at `trust-framework.html:1855`, `1904`, `1947`, `1980`, and `2003`.
   - The same four-option rating control markup is repeated throughout those blocks, while score labels are also hard-coded separately in `scoreDefinitions` at `trust-framework.html:2349-2354`.
   - This is a direct drift vector: content and UI behavior describe the same concept in multiple places.

5. **Behavior is implemented as one large DOM-coupled IIFE.**
   - Navigation indicator logic starts at `trust-framework.html:2161`.
   - Scroll progress is managed at `trust-framework.html:2188`.
   - Cross-panel synchronization starts at `trust-framework.html:2267` and active-section handling at `trust-framework.html:2293`.
   - Rating-scale hydration starts at `trust-framework.html:2356`.
   - Completion tracking starts at `trust-framework.html:2493`.
   - Title updates start at `trust-framework.html:2568`.
   - Global keyboard shortcuts are attached at `trust-framework.html:2622`.

6. **Runtime state is present, but ownership is implicit and fragmented.**
   - Scroll/visibility state is stored in `ratios`, `activeSections`, `currentKey`, and sync flags at `trust-framework.html:2144-2155`.
   - Questionnaire selection state is not stored in a formal model. It is inferred from DOM classes such as `.selected`, `.complete`, and `.filled` during rating and completion updates (`trust-framework.html:2356-2438`, `2493-2564`).
   - This means DOM structure is both render target and state store.

7. **CSS is not only inline; it is also strongly coupled to exact document IDs.**
   - Special cases depend on `#questionnaire-section-8` and `#questionnaire-section-9` at `trust-framework.html:928-947` and `1192-1196`.
   - Principle completion tracking hard-codes section IDs and selectors in `principleConfigs` at `trust-framework.html:2494-2499`.
   - Renaming, reordering, or splitting sections therefore requires coordinated manual edits in markup, CSS, and JS.

8. **The page already carries embedded change-history noise from prior improvement waves.**
   - Inline optimization and severity comments appear throughout the CSS and JS, for example at `trust-framework.html:145`, `443`, `753`, `870`, and `2220-2616`.
   - These comments are useful during a wave, but inside a single production file they increase local cognitive load and make the file read like an accumulated patch log.

9. **There is no existing frontend asset pipeline.**
   - Workspace inspection found no separate `.css` or `.js` files, no `package.json`, and no bundler configuration.
   - The only external/static dependencies in the current page are fonts and images (`trust-framework.html:7-9`, `1365-1370`; assets in `static/`).

10. **The current questionnaire is presentation-oriented rather than submission-oriented.**
    - The right panel is built from mock controls, placeholder lines, and disabled checkboxes rather than a true persisted form model (`trust-framework.html:1666-2117`).
    - This reduces the need for a heavy application framework. The main need is clean decomposition, not a large client architecture.

## Primary maintainability problems in the current implementation

1. **Single-file ownership of unrelated concerns**
   - Content, design tokens, layout, interaction logic, state, and accessibility behavior are edited in one place.
   - Reviewability is poor because unrelated changes share the same file boundary.

2. **Duplicate source-of-truth problem**
   - The framework and questionnaire already exist as standalone markdown documents, but the HTML duplicates them as hard-coded content.
   - Any wording change, field change, or criterion addition risks divergence.

3. **DOM-as-state architecture**
   - Selection state, completion state, and active-state styling are encoded through class mutation and DOM queries.
   - This is workable for a demo page, but it does not scale cleanly to richer interactions or later data persistence.

4. **Selector fragility**
   - Styling and behavior depend on exact IDs and DOM shapes rather than semantic data ownership.
   - Small structural edits have disproportionate regression risk.

5. **High markup repetition in the questionnaire**
   - Rating scales, criterion cards, field groups, and summary blocks repeat with minor variations.
   - This makes systematic changes expensive and increases the probability of inconsistent updates.

6. **No explicit boundary between narrative content and structured schema**
   - The framework prose and the questionnaire field model have different maintenance characteristics, but the current file does not distinguish them.
   - The result is one large undifferentiated document instead of separate content and schema layers.

7. **CSS token usage is partially structured but still operationally noisy**
   - The root token block is a good start, but many section-specific tints and one-off selectors remain distributed across the file.
   - The token system is not separated from layout rules, component rules, or print rules.

## Recommended target file structure

The recommended target is a **vanilla multi-file static architecture** with one HTML shell, external CSS files, and native ES module JavaScript. The questionnaire should be schema-driven. The framework prose should remain static HTML initially.

```text
trust-framework.html                     # page shell + framework panel markup + questionnaire mount point
static/
  css/
    tokens.css                          # color, type, spacing, motion, radius, z-index tokens
    base.css                            # reset, typography, element defaults, utility classes
    layout.css                          # header, split layout, panels, responsive rules
    components.css                      # cards, fields, badges, chips, rating controls, notices
    print.css                           # print-only rules currently mixed into the main stylesheet
  js/
    app.js                              # bootstrap only; no business logic
    config/
      principles.js                     # principle metadata, labels, colors, nav order, shortcuts
      questionnaire-schema.js           # sections, criteria, fields, answer sets, conditions
    state/
      ui-state.js                       # runtime state store and derived selectors
    render/
      dom-factories.js                  # reusable DOM builders for repeated widgets
      questionnaire-renderer.js         # renders the right panel from schema + state
    behavior/
      panel-sync.js                     # observers, nav indicator, progress bars, scroll shadows
      questionnaire-interactions.js     # score selection, completion tracking, checkbox delegation
      accessibility.js                  # keyboard shortcuts, ARIA wiring, reduced-motion branches
```

### Notes on this structure

- `trust-framework.html` should become a small shell, not a content-and-logic monolith.
- The **framework panel should remain literal HTML in phase 1** because it is narrative content and currently easier to review as document markup than as JavaScript strings.
- The **questionnaire panel should move to schema-driven rendering** because it is repetitive, strongly structured, and already defined in `docs/trust-questionnaire.md`.
- No further split is recommended until the above boundary is in place. More files than this would add indirection without a corresponding maintenance gain.

## Proposed JS module boundaries and responsibilities

### 1. `config/principles.js`

Owns all principle-level metadata currently scattered across CSS, HTML, and JS:

- principle key (`tr`, `re`, `uc`, `se`, `tc`)
- display label
- long label
- nav label
- keyboard shortcut mapping
- color token key
- corresponding questionnaire section ID / schema ID

This removes duplicated knowledge now split between nav buttons, section classes, completion tracking, and keyboard shortcut maps.

### 2. `config/questionnaire-schema.js`

Owns the structured questionnaire definition:

- section order
- section titles
- criterion IDs (`TR1`, `RE2`, etc.)
- per-field labels
- field types
- conditional help text
- summary blocks
- standard answer sets (score labels, recommendation options, confidence levels, critical-fail flags)

This should be the single application-level representation of the questionnaire. The HTML page should not separately hard-code the same field topology.

### 3. `state/ui-state.js`

Owns runtime state. Proposed minimum state shape:

```text
{
  activeSectionKey,
  reducedMotion,
  sync: {
    lockedBy,
    ratiosByPanel,
    activeElementsByPanel
  },
  questionnaire: {
    scoresByCriterion,
    completionByPrinciple
  }
}
```

State ownership rules:

- **Config modules own static definitions.**
- **State module owns runtime values.**
- **Render/behavior modules may read state, but must not invent parallel state in DOM classes.**
- CSS classes and ARIA attributes become a projection of state, not a substitute for it.

### 4. `render/dom-factories.js`

Provides small pure builders for repeated structures:

- rating scale
- criterion card
- field group
- completion badge
- checkbox list
- summary group

This is the appropriate place to remove repeated rating markup. It is not necessary to build a general-purpose component framework.

### 5. `render/questionnaire-renderer.js`

Consumes `questionnaire-schema.js` and `ui-state.js` and renders the right panel. Responsibilities:

- create the questionnaire DOM from schema
- attach semantic `data-*` attributes used by CSS and behavior
- render score selection states from store values
- render derived completion badges and strip states

This module should not own scrolling or active-section logic.

### 6. `behavior/panel-sync.js`

Owns the left/right panel synchronization layer currently mixed into the main script:

- intersection observers
- dominant-section calculation
- nav indicator movement
- scroll progress bars
- scroll shadow state
- synchronization lock lifecycle

This is a coherent subsystem and should remain isolated from questionnaire scoring logic.

### 7. `behavior/questionnaire-interactions.js`

Owns right-panel interactions:

- score selection
- updating `scoresByCriterion`
- completion recalculation
- delegated checkbox handling
- animated confirmation states where still desired

This module should update state first and let the renderer or view-sync layer reflect the result in DOM.

### 8. `behavior/accessibility.js`

Owns cross-cutting accessibility behavior:

- keyboard shortcuts
- radio-group keyboard rules
- ARIA state hydration
- reduced-motion branch handling
- any panel tab-order policy

Keeping this separate prevents accessibility behavior from being buried inside unrelated interaction code.

### 9. `app.js`

Bootstrap only:

- load config
- create initial state
- mount renderer
- initialize behavior modules
- perform one initial render/update cycle

`app.js` should not carry domain logic.

## Proposed CSS organization and token strategy

### CSS file organization

1. **`tokens.css`**
   - primitives: UT brand colors, principle colors, neutrals
   - semantic tokens: text, border, panel background, status colors, subtle tints
   - scales: type, spacing, radius, motion, z-index

2. **`base.css`**
   - reset
   - `html`, `body`, typography defaults
   - generic utility classes where justified

3. **`layout.css`**
   - page shell
   - fixed header
   - split panel grid
   - responsive breakpoints
   - panel wrappers and scroll containers

4. **`components.css`**
   - `doc-section`
   - `form-section`
   - `criterion-card`
   - `field-group`
   - `rating-scale`
   - `chip`
   - `completion-badge`
   - `notice`
   - `panel-progress`

5. **`print.css`**
   - rules currently inside the large `@media print` block
   - isolated because print behavior is materially different and should not be maintained inside the same file as interactive layout rules

### Token strategy

The current token block is usable, but it should be formalized into three levels:

1. **Primitive tokens**
   - raw UT and TRUST colors
   - font families
   - spacing scale
   - radii
   - duration/easing

2. **Semantic tokens**
   - `--color-text-default`
   - `--color-text-muted`
   - `--color-border-default`
   - `--color-panel-framework-bg`
   - `--color-score-fail`
   - `--color-score-strong`
   - `--color-principle-tr-subtle`
   - etc.

3. **Component tokens only where reuse justifies them**
   - rating option background/border tokens
   - card accent border tokens
   - badge background tokens

### Specific CSS recommendations

- Replace repeated inline `rgba(...)` values with named subtle-tint tokens.
- Stop targeting special questionnaire sections by hard-coded IDs where semantics exist. For example:
  - use `data-kind="critical-fails"` instead of `#questionnaire-section-8`
  - use `data-kind="overall-recommendation"` instead of `#questionnaire-section-9`
- Prefer semantic `data-*` attributes over DOM position selectors such as `:first-of-type` when section meaning is stable.
- Keep principle-specific styling keyed off a single semantic attribute, e.g. `data-principle="tr"`, rather than duplicated class/ID combinations.

## Proposed HTML templating / partial strategy

### Recommended strategy

**Do not introduce runtime-loaded HTML partials in phase 1.**

Rationale:

- There is no current build or serving pipeline.
- Runtime `fetch()` of HTML partials adds a dependency on HTTP serving and creates avoidable failure modes for a single-page static asset.
- If this page is ever opened directly from the filesystem, runtime partial loading becomes fragile.

### Phase-1 HTML strategy

- Keep one entry HTML file: `trust-framework.html`.
- Reduce it to:
  - document head
  - header/navigation shell
  - framework panel markup
  - questionnaire mount node
  - external CSS links
  - one `<script type="module">` entry

### Repetition strategy inside the page

- Do **not** keep repeated questionnaire criterion markup literal in HTML.
- Render the questionnaire from `questionnaire-schema.js` using DOM factory functions.
- If a small amount of literal template markup is preferred for repeated widgets, use `<template>` elements inside the shell rather than external partial fetches.

### When HTML partials become justified

Only introduce build-time partials if one of the following becomes a requirement:

- the framework panel must be generated directly from `docs/trust-framework-v2.md`
- multiple related pages need the same header/footer/panel scaffolding
- the team wants one content source rendered into both docs and page artifacts

If that threshold is reached, use a build-time solution rather than client-side partial loading.

## Recommendation: vanilla multi-file HTML/CSS/JS or tooling

### Recommendation

**Keep this as vanilla multi-file HTML/CSS/JS for now. Do not introduce a frontend framework or bundler in the first decomposition pass.**

### Justification

1. **Current complexity does not justify a framework.**
   - The page is a single static document with moderate client-side behavior.
   - The main failure mode is structural coupling, not application-scale complexity.

2. **There is no existing frontend toolchain to integrate with.**
   - The repository currently has no package manager or bundler surface.
   - Adding one now would create operational cost without directly fixing the source-of-truth and repetition problems.

3. **Native browser features are sufficient.**
   - External stylesheets solve the CSS monolith.
   - Native ES modules solve the JS monolith.
   - A schema-driven renderer solves the questionnaire repetition problem.

4. **Tooling does not solve the core issue by itself.**
   - Vite, React, or a template engine would still need a source-of-truth decision for framework text and questionnaire schema.
   - Without that decision, tooling only relocates the monolith.

5. **The questionnaire is currently display-oriented.**
   - It is not yet a full client application with persistence, validation, network I/O, or routing.
   - A framework would be premature.

### Revisit tooling only if one of these becomes true

- markdown-to-HTML generation becomes an explicit requirement
- the page becomes a real data-entry application with persistence or validation workflows
- multiple pages need shared layouts and compile-time partials
- TypeScript, tests, or build-time asset processing becomes a requirement

If that happens, a light build step such as **Vite with plain HTML/CSS/JS** is the appropriate next step. A framework should still not be the default choice.

## Migration risks and sequencing notes

### Recommended sequence

1. **Declare source of truth before moving files.**
   - Treat `docs/trust-questionnaire.md` as the authoritative questionnaire definition.
   - Decide whether the framework panel is maintained manually in HTML or generated later from `docs/trust-framework-v2.md`.

2. **Extract CSS first with no DOM changes.**
   - Move stylesheet content into the proposed CSS files.
   - Preserve current selectors initially.
   - This reduces file size and review noise without changing behavior.

3. **Extract JS second, still preserving the DOM contract.**
   - Move the IIFE into ES modules.
   - Keep existing markup intact during this step.
   - This isolates behavior without multiplying migration variables.

4. **Extract shared metadata into config modules.**
   - principle list
   - score definitions
   - shortcut map
   - answer sets
   - section labels

5. **Replace questionnaire markup with schema-driven rendering.**
   - Do this after JS extraction, not before.
   - Start with one principle section and verify parity.
   - Then migrate the remaining principle sections and summary blocks.

6. **Replace ID-based special cases with semantic attributes.**
   - Remove section-specific CSS/JS coupling gradually.
   - Keep compatibility shims temporarily if needed.

7. **Leave the framework panel static unless a real need for generation emerges.**
   - This limits migration scope and avoids turning narrative prose into JavaScript string content.

### Primary risks

1. **Temporary dual-source drift during migration**
   - Risk: schema/config and old HTML diverge while both exist.
   - Mitigation: migrate questionnaire sections fully, not partially, once schema rendering begins.

2. **Accessibility regressions**
   - Risk: keyboard and ARIA behavior currently embedded in the script is lost during modularization.
   - Mitigation: isolate accessibility behavior into its own module and regression-check keyboard navigation explicitly.

3. **Selector breakage from ID removal**
   - Risk: CSS and JS both depend on current IDs.
   - Mitigation: preserve IDs through the first modular pass; introduce semantic attributes before removing ID-coupled rules.

4. **Print regression**
   - Risk: print-specific behavior is currently intertwined with the main stylesheet.
   - Mitigation: move print rules as a dedicated file and review print output separately.

5. **File-protocol compatibility loss if runtime partial fetch is used**
   - Risk: client-side partial loading may fail outside an HTTP server.
   - Mitigation: avoid runtime HTML partial loading in phase 1.

## Explicit proposed solution summary

The recommended decomposition is:

1. **Keep one small HTML shell.**
   - The shell keeps static framework markup and mount points only.

2. **Split CSS into five files by concern.**
   - Tokens, base, layout, components, and print.

3. **Split JS into config, state, render, and behavior modules.**
   - The current inline IIFE becomes a small ES-module graph with clear ownership.

4. **Make the questionnaire schema-driven.**
   - The structured right panel should be rendered from extracted metadata, not hand-maintained repeated markup.

5. **Keep the framework prose static initially.**
   - Do not force long-form narrative content into JavaScript or introduce build tooling unless markdown generation is later required.

6. **Do not introduce a frontend framework in the first pass.**
   - Vanilla multi-file HTML/CSS/JS is sufficient and lower-risk for this repository.

## Open questions

1. **Must the page remain usable when opened directly from `file://`, or is a local/static HTTP server acceptable?**
   - This determines whether build-time partial generation remains optional or becomes preferable.

2. **Should `docs/trust-framework-v2.md` and `docs/trust-questionnaire.md` be enforced as the sole source of truth for page content?**
   - This affects whether framework prose should eventually be generated rather than manually mirrored.

3. **Is the questionnaire intended to remain a presentation mock, or is it expected to evolve into an actual entry form?**
   - If it becomes a true form, state, validation, and persistence requirements expand materially.

These questions do not block the recommended first decomposition pass. They only affect whether a later build-time generation step becomes justified.
