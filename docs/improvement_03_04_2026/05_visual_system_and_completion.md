# Visual system consistency and completion model review

## Scope

This note reviews the current visual system represented in `trust-framework.html`, interpreted against the project design context in `.github/copilot-instructions.md` and the questionnaire/specification documents in `docs/`. The focus is limited to section colors, documentation accents, navigation, completion-strip behavior, judgment states, info/help behavior, and the relationship between section colors and validation, success, error, and skip states.

This is a design-system and interaction-model recommendation only. No implementation changes are proposed here.

## Current inconsistencies and fragility points

### 1. Color semantics are overloaded

The current prototype uses the same color space for multiple unrelated meanings:

- **section context** (`TR`, `RE`, `UC`, `SE`, `TC`),
- **score scale** (`0–3`),
- **judgment outcome** (`Pass`, `Conditional pass`, `Fail`),
- **completion/success**,
- **interactive/focus behavior**,
- **recommendation chips**.

This produces several semantic collisions:

- `RE` uses green as a **principle color**, while green also represents **success/completion**.
- `TR` uses blue as a **principle color**, while blue also represents **focus**, **secondary action**, and score `2`.
- `Recommended` is rendered in red in the reference chips, while red elsewhere means **error**, **critical fail**, or **destructive attention**.
- `Not recommended` is rendered in teal, which is currently the `TC` principle color rather than a negative outcome color.

The result is that hue does not consistently answer a single question. In some places it means “where the user is,” in others “how well this scored,” and in others “whether this is safe to proceed.” That is the largest source of inconsistency.

### 2. Non-principle section accents are ad hoc

The principle sections have a clear palette. The non-principle sections do not.

Current non-principle section accents are effectively one-off assignments:

- `intro` / `governance` → dark blue,
- `scope` → blue,
- `scoring` → pink,
- `evidence` → slate/default.

Those assignments are visible in both the docs panel and questionnaire panel, but they are not defined as a stable semantic family. They function as exceptions rather than as part of a system.

This becomes fragile when more UI surfaces need the same mapping, especially a sidebar, compact navigation, completion strip, and validation summaries.

### 3. Completion currently measures scoring, not completion

The completion badge and the top completion strip are tied only to whether every criterion card in a principle section has a selected score.

That is narrower than the questionnaire definition of completion. A section is not complete when only scores are selected. It is complete only when all **currently applicable required fields** are satisfied, including:

- evidence summary,
- evidence links,
- uncertainty/blocker fields for scores `0` or `1`,
- principle summary,
- principle judgment,
- section-specific required fields outside the five principles,
- completion checklist items if they are treated as a finalization gate.

The current strip therefore communicates a stronger state than the form logic supports.

### 4. Completion is principle-only, while the questionnaire is section-based

The top strip has five cells, one per TRUST principle. The questionnaire itself has additional top-level sections before and after the principles.

That creates a structural mismatch:

- navigation is partially principle-based,
- scrolling is full-section based,
- docs synchronization includes non-principle sections,
- completion ignores non-principle sections entirely.

As a result, the user can fully complete the five principle cells while the evaluation remains operationally incomplete.

### 5. Navigation is incomplete as a system

The current navigation model exposes only the five principle sections as explicit controls. Workflow, profile, setup, critical-fail/confidence, recommendation, and governance sections are not represented in the top navigation.

That is acceptable for a narrow quick-jump control, but not as the sole visible navigation model.

This will become more problematic if a sidebar is introduced without a shared model. At present there is no explicit canonical registry that defines, for each section:

- code,
- label,
- accent token,
- docs anchor,
- nav item,
- completion state,
- validation state,
- skip/applicability state.

Without that registry, navigation and completion will drift independently.

### 6. Active-state styling is only partially section-aware

Active docs/form sections use a generic navy-tinted background, then switch border colors by principle. That means the “active section” background is not truly driven by the section accent; it is driven by a shared fallback.

This weakens consistency across:

- docs section highlight,
- form section highlight,
- navigation active indicator,
- future sidebar active row,
- info-panel context highlight.

A section should have one tint pair and one accent pair applied uniformly wherever the section is highlighted.

### 7. Judgment states compete with section context

Principle judgment controls (`Pass`, `Conditional pass`, `Fail`) recolor the full control background and left border using judgment colors.

The semantic intent is correct — judgment is an outcome state — but the treatment is heavy enough that it can visually override the section context. A judgment value should be visually legible without replacing the section identity.

The same problem exists in smaller form within score selections: score color and section color are both trying to dominate the same component surface.

### 8. Validation and skip states are under-specified

The prototype includes conditional tags and some score-related cues, but there is no complete model for:

- invalid after interaction,
- blocked pending required predecessor,
- skipped / not applicable,
- escalated / unresolved,
- complete but attention-required,
- section-level error summaries.

This matters because the questionnaire has substantial branching and conditional requirements. A robust visual system needs an explicit representation for “not required,” “not yet complete,” and “cannot complete yet.”

### 9. Some styling logic is positional rather than semantic

Several visual behaviors are tied to section IDs, first/last child position, or manually enumerated principle mappings. Examples include:

- hard-coded section IDs for special checkbox styling,
- `:first-of-type` / `:last-of-type` assumptions for Section 8 blocks,
- manual principle configuration arrays for completion,
- manual dark variants for only some nav buttons.

This is manageable in a static prototype, but it is a weak foundation for a form that will likely grow more conditional and more stateful.

### 10. Info/help behavior is inconsistent and incomplete

The prototype uses three different help mechanisms:

- inline helper text,
- condition tags,
- native `title` tooltips.

There is no single, explicit information trigger or help panel pattern. There is also no defined relationship between a help trigger and the docs panel.

This is especially relevant because the form is dense, technical, and condition-heavy. A dense tool can hide nothing critical, but it still needs compact on-demand explanation.

## Recommended semantic token structure

The visual system should be layered. Each layer should answer one question only.

| Layer | Question answered | Recommended token families | Notes |
|---|---|---|---|
| Foundation | What is the neutral UI surface? | `canvas`, `surface`, `surface-alt`, `border-default`, `border-strong`, `text`, `text-muted` | Used everywhere; never encode domain state here. |
| Interaction | What is interactive or focused? | `focus-ring`, `link`, `hover-surface`, `pressed-surface` | Keep separate from section colors. |
| Section context | Where am I? | `section-*` tokens | Owns section accent, tint, border, heading marker, synced docs highlight, nav marker, completion cell identity. |
| Score scale | How did this criterion score? | `score-0` to `score-3` tokens | Restricted to score controls, score legends, score badges, and score summaries. |
| Validation / workflow state | Can this field or section proceed? | `state-error`, `state-warning`, `state-success`, `state-info`, `state-skipped`, `state-blocked` | Used for field/section health, not section identity. |
| Judgment / decision state | What is the review outcome? | `judgment-pass`, `judgment-conditional`, `judgment-fail`, plus recommendation-status tokens | Distinct from section colors. |
| Help / documentation | What explains this field or section? | `help-trigger`, `help-panel`, `docs-highlight` | Default help trigger should be neutral, not status-colored. |

### Recommended section token families

Each section root should resolve a local token bundle:

- `--section-accent`
- `--section-accent-strong`
- `--section-tint`
- `--section-border`
- `--section-text`
- `--section-on-accent`

Components inside the section should use the local bundle instead of hard-coded per-principle classes wherever possible.

### Recommended section palette ownership

#### Principle sections

- `TR` → blue
- `RE` → green
- `UC` → purple
- `SE` → orange
- `TC` → teal

These should remain the only high-chroma principle hues.

#### Meta sections

Meta sections should not borrow principle colors arbitrarily. They should use a small reserved meta family, for example:

- `control/setup` → dark blue family,
- `reference/scoring` → pink family,
- `evidence/neutral structure` → slate family,
- `governance/review` → dark blue or slate family.

The exact split is less important than the rule: **meta sections must come from a defined meta palette, not from one-off assignments.**

### Recommended status token families

#### Score tokens

- `score-0` → destructive red
- `score-1` → warning orange
- `score-2` → baseline blue
- `score-3` → strong green

These tokens belong to the scoring model only.

#### Validation/workflow state tokens

- `state-error` → red
- `state-warning` → orange
- `state-success` → green
- `state-info` → blue or neutral-info blue
- `state-skipped` → slate/neutral
- `state-blocked` → slate base with destructive marker

These tokens belong to health/progress, not to section identity.

#### Recommendation-status tokens

The recommendation chips need their own consistent mapping. At minimum:

- `Recommended` must not use red.
- `Not recommended` must not use a principle color.
- `Out of scope` should be neutral.

A coherent mapping would be:

- `Recommended` → success green,
- `Recommended with caveats` → warning orange,
- `Needs review / provisional` → blue or dark blue,
- `Pilot only` → purple,
- `Not recommended` → red,
- `Out of scope` → slate.

If the team wants recommendation categories to remain more categorical than evaluative, they can also use neutral surfaces with narrow colored rules and explicit text labels. The important point is semantic consistency, not saturation.

## Rules for applying section colors consistently

### Rule 1 — Section color encodes context, not evaluation quality

A section accent should answer: **which section is this?**

It should not independently answer:

- whether the section is valid,
- whether the section is complete,
- whether the answer scored well,
- whether the section contains an error.

Those meanings belong to score and state tokens.

### Rule 2 — Every section gets one canonical accent bundle

For each top-level questionnaire section and each matching docs section, define one section token bundle and reuse it in all of the following surfaces:

- section kicker,
- section left rule,
- panel title suffix,
- docs highlight,
- sidebar active marker,
- compact navigation marker,
- completion strip identity,
- local info-panel accent.

The same section should not change hue between docs, form, and navigation.

### Rule 3 — Active state uses section tint, not a global fallback

When a section becomes active, use the current section’s tint and accent bundle. Do not use a generic navy active background and only switch the border color.

The active-state recipe should be uniform:

- section tint background,
- section accent border or left rule,
- unchanged text contrast token,
- optional section-accent heading suffix.

### Rule 4 — Principle colors stay at section/chrome level

For principle sections, the principle color should dominate the section chrome, not every child control surface.

Recommended surfaces for section color:

- section card border,
- section code label,
- section title suffix,
- sidebar row marker,
- docs anchor highlight,
- completion segment identity.

Not recommended as the primary surface:

- full validation background,
- full judgment background,
- full score-option background across large areas,
- help-trigger icon color at rest.

### Rule 5 — Status overlays do not replace section identity

If a field or section is invalid, skipped, blocked, or complete, the status indicator should overlay the section identity rather than replace it.

Examples:

- a `TR` section with an error is still a `TR` section;
- a `SE` section that is complete is still a `SE` section;
- a `UC` field that is skipped should still be visually locatable within `UC`.

That means the system should combine cues instead of recoloring everything to the status hue.

### Rule 6 — Dark variants are systemic, not per-section exceptions

The current prototype manually introduces stronger nav colors for only some principle buttons. A robust system should instead define contrast-aware tokens per section bundle:

- `--section-accent`
- `--section-accent-strong`
- `--section-on-accent`

Then any filled-surface treatment can consume those tokens consistently.

## Completion-strip behavior recommendations tied to section completion

### Completion must be section-completion, not score-count completion

The completion strip should represent **section completion state**, not merely “all score controls have a selection.”

A section should be considered complete only when all currently applicable required fields for that section are satisfied.

### Recommended completion state model

Each section should resolve to one of the following states:

1. **Not started**
   - No applicable required fields completed.
2. **In progress**
   - At least one applicable required field completed, but section not complete.
3. **Complete**
   - All applicable required fields completed.
4. **Invalid / attention required**
   - A required field is missing or invalid after interaction, or required follow-up content is missing.
5. **Skipped / not applicable**
   - The section is not required because of branching, or is explicitly marked not applicable with rationale.
6. **Blocked / escalated**
   - The section cannot close because a higher-order requirement is unresolved.

### Section-completion definition by content type

The section-completion algorithm should include all applicable required fields, including:

- criterion score,
- evidence summary,
- evidence links,
- uncertainty/blocker fields when score is `0` or `1`,
- principle summary,
- principle judgment,
- additional section fields such as counts, confidence, status, dates, and governance fields,
- any explicit completion-checklist requirements used as a finalization gate.

This is required to align the visual completion model with the questionnaire specification.

### Recommended strip encoding

Use section color to indicate **identity**, then use overlays/patterns to indicate **state**.

| State | Strip treatment | Meaning preserved |
|---|---|---|
| Not started | Neutral base, thin section outline or no fill | Section exists, no progress |
| In progress | Section tint fill + section border | Section identity visible, partial progress |
| Complete | Solid section accent | Section identity and completed state combined |
| Invalid | Current state + red top edge / corner / dot | Error does not erase section identity |
| Skipped | Slate fill + dashed border + explicit skipped marker | Distinct from untouched or invalid |
| Blocked / escalated | Muted fill + red corner or lock marker | Section cannot close yet |

### Structural recommendation for the strip

The current five-cell strip is too narrow in meaning because it represents only the five principles.

The better model is:

- one segment per top-level questionnaire section, or
- a grouped strip that still preserves all top-level sections in the authoritative sidebar.

For this questionnaire, the strip should at minimum include:

- workflow/profile/setup,
- the five principle sections,
- critical fail/confidence,
- overall recommendation,
- governance.

If the strip must remain compact, it can visually cluster those groups, but the underlying state model should still be section-level.

### Accessibility requirement for the strip

If the strip is only decorative, it can remain visually compact and secondary. In that case, the accessible completion state must be exposed elsewhere, for example in the sidebar or explicit status text.

If the strip is interactive, it must not be `aria-hidden`, and its targets must meet keyboard and mobile target-size requirements.

## Navigation and info-menu/icon recommendations

### Navigation should be driven by a single section registry

Define one canonical section registry with, for each section:

- section key,
- display code,
- display label,
- section token bundle,
- docs anchor,
- nav grouping,
- completion state,
- validation state,
- skip/applicability state.

This registry should drive:

- the sidebar,
- the compact navigation row,
- the completion strip,
- synced docs highlighting,
- info-panel routing.

Without that registry, each surface will continue to implement its own partial interpretation.

### Sidebar recommendation

A sidebar should be the authoritative navigation surface because it can expose more state than the top row.

Each sidebar item should show:

- section code,
- section label,
- current/active marker,
- completion marker,
- validation marker,
- optional docs-jump affordance.

Section color should be applied as:

- a narrow leading rule or marker,
- the active-item accent,
- the completion segment identity,
- not as a full heavy background for all items.

### Top navigation recommendation

The current principle row can remain as a fast-jump mechanism for `TR/RE/UC/SE/TC`, but it should be clearly subordinate to the full section navigation model.

It should use the same section tokens and active-state rules as the sidebar. It should not be treated as a separate visual language.

### Info-menu/icon recommendation

The interface needs one explicit help pattern.

Recommended behavior:

- use a consistent `Info` trigger component next to section titles and complex conditional labels;
- default trigger color should be neutral (`text-muted` or similar), not section-colored and not status-colored;
- on open, the info panel may use the current section accent as a narrow header rule or top border to preserve context;
- the panel content should support short explanatory text, scoring guidance, conditional-requirement explanation, and a direct jump to the matching docs section;
- opening behavior should work for mouse, keyboard, and touch;
- `Escape` should close the panel and return focus to the trigger;
- native `title` tooltips should not be used for any essential explanation.

### Relationship between info panels and the docs panel

The best use of an info trigger in this interface is not generic tooltip text. It is **context linkage**.

A good info interaction should be able to do one or both of the following:

1. reveal compact local guidance inline, and/or
2. jump/highlight the corresponding framework docs section in the left panel.

That preserves density while still exposing the machine.

## Validation, error, success, and skip state rules relative to section colors

### Core rule

Section color and validation state must be visually composable. They must not compete for the same semantic layer.

### Field-level rules

| State | Visual rule | Relation to section color |
|---|---|---|
| Default | Neutral field surface, section context visible in section chrome only | Section identity remains on container/chrome |
| Focused | Standard focus ring token | Focus is global interaction state, not section state |
| Invalid | Red border or outline, red message text, optional red icon | Section chrome remains section-colored |
| Warning / conditional attention | Orange border/badge/message | Section identity remains visible |
| Valid / resolved | Neutral field with optional small success marker | Do not flood the field with green |
| Skipped / not applicable | Slate/neutral surface, dashed border or hatch, explicit `Skipped` or `N/A` label | Optional 1–2 px section marker may remain |
| Blocked / escalated | Neutral or muted surface with lock/escalation marker and destructive accent | Section identity should remain locatable |

### Section-level rules

A section can have both a context and a health state.

Recommended combination model:

- section chrome = section color,
- section health = small overlay markers and status badges,
- section completion = section-colored fill progression,
- section errors = red marker or summary badge,
- section skipped = slate/dashed treatment with explicit label.

### Judgment-state rules

Judgment states (`Pass`, `Conditional pass`, `Fail`) should use outcome tokens, but they should not replace the section chrome.

Recommended treatment:

- keep the section border and heading in the section color;
- show the judgment as a contained badge or compact control state inside the section;
- use green/orange/red for the value, not for the entire section frame.

This preserves both answers:

- **where am I?** → section color
- **what is the outcome?** → judgment color

### Score-state rules

Score controls should use the score palette consistently everywhere, but the score treatment should remain local to the score component.

Recommended treatment:

- score dot or score edge uses `score-0` to `score-3`,
- score text uses score token where needed,
- the containing criterion card remains section-colored.

That avoids the section card becoming a second score legend.

### Recommendation-status rules

Recommendation categories are final decision states and should be consistent with broader state semantics.

At minimum:

- `Recommended` must read as positive,
- `Not recommended` must read as negative,
- `Out of scope` must read as neutral,
- `Needs review / provisional` must read as unresolved,
- `Pilot only` must read as restricted/experimental.

Current chip colors do not meet that requirement.

## Accessibility and contrast considerations

### 1. Do not rely on color alone

Every meaningful state should have a second cue:

- label text,
- icon,
- pattern,
- border style,
- count badge,
- explicit section code.

This is especially important for:

- skipped vs untouched,
- invalid vs warning,
- complete vs in progress,
- recommendation categories.

### 2. Contrast needs explicit token support

Some surfaces need stronger variants for contrast. Those should come from the token system, not from ad hoc exceptions.

Required token concepts:

- `on-accent` text color,
- `accent-strong` for filled controls,
- section tints for large surfaces,
- border-strong for low-chroma sections.

### 3. Native tooltips are not sufficient help

Native `title` behavior is inconsistent across devices, weak for keyboard use, and poor for dense structured guidance. Any critical explanation needs a real info/help component.

### 4. Completion strip accessibility must be explicit

A compact strip with five small cells is acceptable only if it is decorative. If it is intended to communicate progress, the same state must be exposed in an accessible navigation summary.

### 5. Interactive size constraints apply if the strip or info triggers are clickable

The design context requires mobile touch targets of at least `44x44px`. Current compact cells are below that if treated as interactive elements.

### 6. Motion should remain secondary

Completion pulses and highlight flashes should remain optional and short. The current reduced-motion handling is appropriate in direction and should be retained in any future state model.

## Explicit proposed solution summary

1. **Separate the token layers.** Introduce distinct token families for section context, score scale, validation/workflow state, judgment/decision state, and help/documentation.
2. **Make section identity canonical.** Every section should resolve one local section token bundle and reuse it across docs, form, sidebar, compact navigation, and completion indicators.
3. **Replace score-count completion with true section completion.** A section is complete only when all currently applicable required fields are satisfied, not when all score widgets are selected.
4. **Expand completion from principles to the full questionnaire structure.** The completion strip and sidebar must represent all top-level sections, not only the five principle sections.
5. **Layer state on top of section context rather than replacing it.** Errors, warnings, skipped states, blocked states, and judgment outcomes should overlay the section identity instead of recoloring the entire section.
6. **Adopt one explicit info/help pattern.** Replace reliance on native tooltips with a consistent info trigger and compact help panel that can also sync to the docs panel.
7. **Correct the decision-color semantics.** Recommendation states need their own coherent mapping; `Recommended` must not be red and `Not recommended` must not borrow a principle color.
8. **Drive navigation, completion, and docs sync from one section registry.** This is the main robustness requirement. Without it, new UI surfaces will continue to diverge.

## Sources reviewed

- `trust-framework.html`
- `.github/copilot-instructions.md`
- `docs/trust-questionnaire.md`
- `docs/review/trust-ms-forms-questionnaire-spec.md`
- `docs/review/trust-framework-v2-comparison-and-final-review.md`
