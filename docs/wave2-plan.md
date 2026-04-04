# Wave 2 Consolidated Implementation Plan

Date: 2026-04-04
Scope: Merge Delight (D1-D11, HIGH+MED) and Bolder (B1-B11, HIGH+MED) recommendations.

## Conflict Resolution

| Conflict | Resolution | Rationale |
|----------|-----------|-----------|
| D5 vs B6 (page transitions) | **B6 wins** -- directional slide with X-axis | B6 is more specific and provides forward/backward choreography. D5's Y-axis approach is simpler but B6's directional model is more complete. |
| D15 vs B10 (card stagger) | **B10 wins** -- CSS custom property driven | B10 uses `--criterion-index` for dynamic stagger, which works with any number of cards. D15 uses fixed nth-child which only covers 4. |
| D4 vs B4 (progress bar) | **Merge both** | D4 adds section accent sync; B4 increases height to 4px and makes track tint more visible. Both are compatible. |

## Implementation Order (grouped by file)

### Phase 1: tokens.css

| ID | Source | Change |
|----|--------|--------|
| B1 | Bolder HIGH | Extend type scale: add --text-xs (0.56rem), --text-sm (0.75rem), --text-sub (1.2rem), --text-display (1.95rem), --text-mega (2.25rem) |
| B2 | Bolder HIGH | Increase section tint visibility: all section tints from 8-10% to 14-16% |

### Phase 2: layout.css

| ID | Source | Change |
|----|--------|--------|
| B4a | Bolder HIGH | top-accent height: 6px -> 8px; site-header inset accordingly |
| B4b | Bolder HIGH | panel-progress height: 3px -> 4px |
| D4/B4 | Merge HIGH | panel-progress-bar: sync background to section accent, add background transition; progress track tint to 14% |
| B5a | Bolder HIGH | questionnaire-shell gap: 18px -> 24px |
| B5b | Bolder HIGH | questionnaire-workspace gap: 16px -> 22px |
| B5c | Bolder HIGH | workspace-layout gap: 18px -> 22px |
| B1b | Bolder HIGH | panel-title font-size: var(--text-body) -> var(--text-display), padding-bottom: 12px |
| B1c | Bolder HIGH | questionnaire panel title: font-size var(--text-mega), letter-spacing 0.06em, border-bottom-width 3px |
| B3 | Bolder HIGH | framework-panel background: slightly deeper tint |
| B12 | Bolder LOW | framework-panel border-left: slightly darker separator |
| B16 | Bolder LOW | surface-card: darker border, more generous padding |
| D9 | Delight MED | context drawer slide: 200ms -> 280ms |
| D14 | Delight LOW | shell-surface backdrop blur |

### Phase 3: components.css

| ID | Source | Change |
|----|--------|--------|
| B1d | Bolder HIGH | section-kicker padding: 6px 14px, margin-bottom: 14px |
| B5d | Bolder HIGH | field-grid gap: 14px -> 10px, margin-top: 14px -> 10px |
| B5e | Bolder HIGH | criteria-stack gap: 18px -> 12px, margin-top: 14px -> 10px |
| B5f | Bolder HIGH | score-cards/reference-cards gap: 14px -> 10px, margin-top: 18px -> 14px |
| B5g | Bolder HIGH | doc-section + doc-section margin-top: 16px -> 22px |
| B3b | Bolder HIGH | field-group background: slight navy tint |
| B3c | Bolder HIGH | mini-card background: slight navy tint |
| B3d | Bolder HIGH | completion-strip background: slight navy tint |
| B8 | Bolder MED | strip-cell min-width 2.8rem, height 24px, padding 0 7px |
| B8b | Bolder MED | completion-strip gap 3px, padding 5px 8px |
| B9 | Bolder MED | rating-scale gap 4px, padding 8px, border 2px |
| B9b | Bolder MED | rating-option padding 10px 8px, min-height 48px |
| B9c | Bolder MED | rating-option left borders 3px |
| B7 | Bolder MED | section-kicker letter-spacing 0.1em |
| B11 | Bolder MED | pager-shell padding 12px 14px, border 2px |
| B11b | Bolder MED | pager-button padding 10px 14px, font-weight 800, border 2px |
| B11c | Bolder MED | pager-status font-weight 700 |
| B15 | Bolder LOW | evidence-block border-left-width 5px, background navy tint |
| B17 | Bolder MED | reference-drawer-summary padding 12px 14px, letter-spacing 0.07em |
| B18 | Bolder LOW | nav-button font-weight 800, border darker; shell-action-button padding-inline 14px |
| D3 | Delight HIGH | rating-option: add position relative, overflow hidden |

### Phase 4: states.css

| ID | Source | Change |
|----|--------|--------|
| B2b | Bolder HIGH | is-active sections: use --section-tint (now 16%), add inactive opacity 0.82 |
| B7b | Bolder MED | section-kicker border-left: 4px solid var(--section-accent) |
| B8c | Bolder MED | strip-cell complete font-weight 800 |
| B9d | Bolder MED | rating-option selected: border-left-width 6px |
| B9e | Bolder MED | rating-option score-0/1/2/3: border-left 6px solid |
| B10 | Bolder MED | criterion-card staggered entrance with --criterion-index |
| B10b | Bolder MED | sectionEnter enhanced: translateY(6px), 180ms |
| B13 | Bolder LOW | header-progress-summary padding 10px 12px, darker border |
| B14 | Bolder LOW | principle sections border-left-width 8px |
| B17b | Bolder MED | reference-drawer.is-open stronger border, left border |
| D1 | Delight HIGH | completion-badge.just-completed: badgeSettle animation |
| D2 | Delight HIGH | strip-cell.just-filled: stripCellGlow animation |
| D3b | Delight HIGH | rating-option.is-just-selected::before borderSweep |
| D5/B6 | Merge HIGH | page transition: directional slide (replace current crossfade) |
| D6 | Delight MED | checkbox-item.has-checked: checkboxSettle animation |
| D7 | Delight MED | reference-drawer[open] panel: drawerReveal animation |
| D8 | Delight MED | evidence-item: evidenceAccentFlash animation |
| D10 | Delight MED | pager-button: press feedback translateY(1px) |
| D11 | Delight MED | skip scaffold transitions |
| D12 | Delight LOW | focus ring accent sync |
| D13 | Delight LOW | field-group focus border accent sync |
| D16 | Delight LOW | top-accent transition: 280ms |
| B4c | Bolder LOW | surface-header h2: font-size var(--text-display); surface-kicker adjustments |

### Phase 5: print.css

| ID | Source | Change |
|----|--------|--------|
| D17 | Delight LOW | section-colored top borders for printed sections |

### Phase 6: JS files

| ID | Source | Change |
|----|--------|--------|
| B6 | Bolder MED | navigation.js: add is-backward class for backward page transitions |
| B10 | Bolder MED | render JS: set --criterion-index on criterion cards |
| D2 | Delight HIGH | sidebar.js: apply just-filled class on strip cell completion |

## Items Excluded (LOW priority only)

The following LOW items are deferred:
- D14 (backdrop blur) -- included since it is trivial
- D12, D13 (focus accent) -- included since trivial and consistent
- D15 (card stagger nth-child) -- superseded by B10
- D16 (top accent duration) -- included since trivial
- D17 (print borders) -- included since useful
- B12-B18 (most LOW items) -- included since they are incremental

## Reduced Motion

All animation additions are automatically suppressed by the existing `prefers-reduced-motion: reduce` rule in states.css which zeros all durations and animation-iteration-counts. The B10 criterion-card stagger needs an explicit opacity:1 override in reduced-motion.
