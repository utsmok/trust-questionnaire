# TRUST Framework Questionnaire

Single-page application for evaluating AI-based search tools against the TRUST principles (Transparent, Reliable, User-centric, Secure, Traceable) in academic contexts. Pure vanilla JS/CSS/HTML — no frameworks, no build step, no bundler.

## Serving & Testing

```bash
npm run serve:static          # Python HTTP server on http://127.0.0.1:4173
npm run validate:html         # Lint trust-framework.html
npm run test:e2e              # Playwright tests (Chromium + Firefox)
npm run test:e2e:headed       # Playwright with visible browser
npm run test:e2e:install      # Install browser binaries (first time)
npm run test                  # Validate + test
```

Tests live in `tests/e2e/` — 5 suites: completion, evidence, navigation, rendering, validation.

## Architecture

```
trust-framework.html          # SPA entry point, static structure
static/css/                   # Stylesheets (loaded in order)
  tokens.css → base.css → layout.css → components.css → states.css → print.css
static/js/
  app.js                      # Bootstrap — wires all modules together
  state/
    store.js                  # Central immutable state (action/subscription pattern)
    derive.js                 # Computed state — 20+ derivation functions
  config/
    sections.js               # 12 section definitions, workflow states, completion groups
    rules.js                  # Validation/business rules (visibility, requirement, skip, judgment)
    questionnaire-schema.js   # 100+ field defs, 15 criteria across 5 principles
    option-sets.js            # Dropdown/selection option values
  behavior/
    navigation.js             # Page transitions, sidebar, responsive shell, surfaces
    field-handlers.js         # DOM ↔ store binding, control-specific handlers
    pager.js                  # Prev/next navigation, workflow-aware page sequence
    context-tracking.js       # Hash-based deep linking and sub-anchor tracking
    keyboard.js               # Global keyboard shortcuts and bindings
    form-controls.js          # Re-exports from field-handlers.js
  render/
    questionnaire-pages.js    # Dynamic form page generation
    sidebar.js                # Left nav, context panel, sub-anchors
    evidence.js               # Evidence file attachment and criterion associations
    dom-factories.js          # DOM element creation helpers
    reference-drawers.js      # Collapsible reference info panels
    about-panel.js             # About overlay surface
    help-panel.js              # Help overlay surface
  utils/
    shared.js                 # Cross-module utility functions
  adapters/
    evidence-storage.js       # Evidence persistence adapter (placeholder)
```

## Core Patterns

**State flow**: Store holds source-of-truth state. Changes go through named actions. Components subscribe and re-render. Derive.js computes everything else (field states, progress, judgments, recommendations) from store state — never duplicate derived logic elsewhere.

**Rules engine**: `rules.js` declaratively defines visibility, requirement, validation, skip, judgment, and escalation rules using a condition DSL (operators: `equals`, `not_equals`, `in`, `not_in`, `has_any`, `not_empty`, `empty`; logical: `all`, `any`, `not`). Behavior modules evaluate these rules against current state.

**Section workflow**: 12 sections (S0–S10C) have different accessibility per workflow mode (nomination, primary, second review, final decision, re-evaluation). The pager and navigation are workflow-aware.

**CSS layered loading**: Tokens → base → layout → components → states → print. Always preserve this order. Design tokens are CSS custom properties in `tokens.css` — use them, never hardcode values. Each section has an accent family (`--section-{id}-accent`, `-strong`, `-tint`, `-border`, `-on-accent`).

**Responsive**: Two-panel shell collapses context panel into a drawer at 1160px. No other breakpoints.

**Accessibility**: Skip links, `aria-hidden`/`inert` on inactive pages, focus management with retry logic, keyboard shortcuts (Escape closes overlays).

## Code Style

- **Vanilla JS with ES modules** — no framework, no JSX, no transpilation
- **No external runtime dependencies** — only Playwright and html-validate for dev
- **Immutable state** — store returns new objects on mutation
- **Event delegation** — input/change events caught at questionnaire root
- **CSS custom properties** for all colors, spacing, typography — never magic numbers
- **No TypeScript** — plain JS with clear naming conventions

## Key Documentation

| Path | Purpose |
|------|---------|
| `docs/trust-framework-v2.md` | Full framework specification |
| `docs/trust-questionnaire.md` | Questionnaire field-by-field spec (45KB) |
| `docs/improvement_03_04_2026/IMPLEMENTATION_PLAN.md` | Master refactoring plan |
| `docs/improvement_03_04_2026/01_architecture_decomposition.md` | Architecture decisions |
| `docs/framework/revised-framework.md` | TRUST framework v2 definition |
| `docs/review/trust-framework-v2-comparison-and-final-review.md` | V1→V2 comparison |
