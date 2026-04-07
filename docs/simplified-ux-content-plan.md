# Simplified UX and Content Plan

Date: 2026-04-06
Mode: planning only

## What this plan is for

This plan rewrites the current UX, content, keyboard, and form-density work in simpler terms.

The goal is straightforward: help reviewers move through the questionnaire faster, with less scrolling, less duplicated text, fewer layout surprises, and stronger keyboard support.

The interface should stay dense and explicit. It should not become minimal, decorative, or vague.

## What should feel better for users

When this work is done, reviewers should notice five things immediately:

- the interface feels stable while scrolling, with no sidebar flicker
- the current page, criterion, and next action are easier to see
- help text is shorter, clearer, and shown in the right place
- keyboard users can move through the review without fighting the UI
- evidence upload and attachment feels fast and obvious

## Top 10 UX fixes

1. **Stop sidebar flicker during scroll**
   - Scrolling the questionnaire must not make the sidebar flash, jump, or rebuild visibly.
   - The page index and context panel should feel pinned and stable.
   - Users should be able to scroll long principle pages without visual noise.

2. **Make the current location obvious at all times**
   - The active page, active criterion, and active anchor should be clearly highlighted.
   - Long pages need a stronger sense of position, especially on `TR`, `RE`, `UC`, `SE`, and `TC`.
   - A reviewer should never have to wonder, “Where am I in this review?”

3. **Keep only page-specific guidance on the review page**
   - The review page should show only what helps with the current task.
   - Full Help, full Reference, and full About content should move out of the single review page into app-level features.
   - The review page can keep short guidance plus links to the deeper app-level material.

4. **Rewrite tooltips so they are actually readable**
   - Tooltips should define a term or clarify one field.
   - They should not contain workflow instructions, policy summaries, or long explanations.
   - Tooltip text should be short, left-aligned, wider than the current tiny-help pattern, and readable without hover gymnastics.

5. **Make dense layout clearer, not more hidden**
   - The form can be compact, but it should not hide criterion statements, evidence labels, or other meaning-carrying text.
   - The rule should be: reduce padding and duplication first, hide essential text last.
   - Dense layout is good; hidden-state UI is not.

6. **Reduce scroll distance on principle pages**
   - Score, status, and evidence count should sit near the criterion title.
   - Section summary content should stay closer to the working area, especially on wide screens.
   - Reviewers should not need long up/down travel to connect scoring, notes, and evidence.

7. **Make the page index faster to scan and use**
   - The page index should support a compact mode and stay readable when collapsed.
   - Section codes must remain visible.
   - Progress and status should be readable at a glance, not hidden behind hover or long labels.

8. **Finish the keyboard-first model**
   - The existing shortcuts are a start, but keyboard use still feels partial.
   - Every major navigation path should work without the mouse.
   - Dense interfaces only work when keyboard movement is predictable.

9. **Make evidence upload feel like one clean flow**
   - Adding evidence should be fast whether the user clicks, drops, pastes, or adds a link.
   - Upload state should be obvious per item.
   - Editing notes, previewing a file, retrying a failed upload, and reusing evidence should all feel direct.

10. **Remove duplicated and stale content**
    - The same explanation should not appear in the page, tooltip, help surface, and about surface in different words.
    - Stale references and filler text slow users down.
    - Each piece of content needs one clear home.

## Move help, reference, and about to the right level

The current review page is carrying too much explanatory content.

That makes the page heavier, harder to scan, and harder to maintain.

### What stays on the review page

Keep only the content that helps the reviewer complete the current page:

- short page guidance
- criterion-specific interpretation notes
- evidence expectations for the current page
- current-page anchor navigation
- links to deeper help or reference material

### What moves to app-level features

Move these out of the single review page and make them available from the wider app:

- **Help**
  - how the workflow works
  - keyboard shortcuts
  - how to review a tool
  - common questions and troubleshooting

- **Reference**
  - scoring scales
  - recommendation labels
  - evidence requirements
  - standard terms and definitions
  - critical-fail rules

- **About**
  - what TRUST is
  - framework scope
  - governance model
  - review and decision process

### Practical outcome

The review page becomes a working surface, not a dumping ground for every explanatory block.

That means:

- less text competing with the form
- fewer repeated definitions
- easier updates later
- better fit for a multi-view app

## Keyboard support that must work

The final shortcut letters can be adjusted after Linux/browser conflict checks, but these actions must work.

### Global actions

- open keyboard help
- move to previous page
- move to next page
- jump directly to `TR`, `RE`, `UC`, `SE`, and `TC`
- open or close the sidebar or context drawer
- close the topmost open surface with `Escape`

### Navigation clusters

These groups should support arrow-key movement, plus `Home` and `End` where it makes sense:

- completion strip
- page index
- context anchor list
- sidebar tabs (`Guidance`, `Reference`, `About`, or their app-level replacements)
- pager controls

`Enter` and `Space` should activate the focused item.

### Form controls

These interactions must work without the mouse:

- move through score options with arrow keys
- open a score dropdown from the keyboard
- choose a score with keyboard only
- open and close skip controls
- move through radio and checkbox groups predictably
- keep text inputs, textareas, and note fields safe from accidental global shortcut capture while typing

### Evidence actions

These evidence tasks must work from the keyboard:

- open file picker
- attach a pasted item to the focused evidence area
- open evidence preview
- close evidence preview with `Escape`
- return focus to the item that opened the preview
- edit an evidence note inline
- retry failed upload
- unlink or remove evidence

### Focus rules that must feel consistent

- focus should move to the newly opened drawer, dialog, or preview
- closing a drawer or dialog should return focus to the control that opened it, or a stable fallback control
- hidden or inactive page sections should not stay in the tab order
- keyboard users should never fall into the page background when a drawer or lightbox is open

## Rewrite / remove / keep content guidance

### Rewrite

Rewrite these areas in plain, direct task language:

- page guidance blocks in the right panel
- tooltip copy
- help and shortcut text
- evidence upload instructions
- empty states
- validation messages
- section summary prompts
- handoff and governance guidance

Use this style:

- say what the reviewer should do now
- say why it matters only if needed
- prefer short bullets over long prose
- use the same terms everywhere

### Remove

Remove or retire these patterns:

- repeated principle definitions on every review page
- long explanations inside tooltips
- stale source links or references to removed docs
- filler captions that repeat the page heading
- duplicated help text across page content, tooltip content, and help content
- hidden-but-essential text patterns that force users to guess what a control means

If a reviewer needs the text to do the task, it should not live only in a hover state.

### Keep

Keep these as visible, explicit parts of the UI:

- section codes
- criterion codes
- field IDs where they help audit work
- short visible criterion statements
- recommendation vocabulary
- evidence requirement language
- critical-fail language
- visible status labels instead of icon-only meaning

The product should still feel like a precise review instrument.

## Dense layout without losing clarity

The interface should become denser by removing waste, not by removing meaning.

### Dense layout rules

- keep borders, grid lines, and compact spacing
- keep headings short and block-shaped
- keep labels close to controls
- keep criterion statements visible in short form
- keep evidence labels visible in short form
- keep section and criterion codes easy to spot
- reduce repeated intros and decorative spacing
- avoid large empty areas above or between blocks

### Criterion card changes

Each criterion block should be easier to scan.

A better compact pattern is:

- **row 1:** criterion code, short title or statement, score control, status, evidence count
- **row 2:** main fields and evidence area
- **row 3:** optional skip content, longer notes, or secondary detail

This keeps the most important status and actions near the criterion title.

### Summary placement

Section summary content should stay closer to active work.

On wide screens:

- keep summary controls in a persistent side summary area when possible

On narrower screens:

- keep them inline, but close to the criterion stack

### Page index density

The page index can be denser without becoming cryptic:

- codes always visible
- short status labels
- compact progress display
- optional collapsed mode
- no flicker while scrolling the main content

## Tooltip readability rules

Tooltips need a tighter job description.

### A tooltip is good when it:

- explains one term
- clarifies one field
- fits in one short paragraph or two short sentences
- opens from keyboard focus
- closes with `Escape`
- stays readable at a sensible width

### A tooltip is the wrong tool when it contains:

- step-by-step instructions
- long policy text
- scoring rules
- workflow explanations
- anything users may need to read more than once

When content is longer than that, move it to:

- inline field help
- page-level guidance
- app-level Help
- app-level Reference
- app-level About

## Evidence upload interactions

Evidence work should feel fast, visible, and forgiving.

### Core evidence flow

Each evidence area should support:

- **Browse** a file
- **Drop** a file
- **Paste** a screenshot or file into the focused evidence area
- **Add link** for URL-based evidence
- **Reuse existing** evidence from the review library

All of these should feed the same compact evidence list.

### What users should see immediately

As soon as evidence is added, show a row with clear state:

- queued
- uploading
- processing
- attached
- failed
- retrying

Do not hide upload state behind vague text.

### What each evidence item should allow

Each attached item should support:

- preview
- edit note
- see filename or link title
- see evidence type
- retry if failed
- unlink from criterion
- remove from review when appropriate

### Keep the intake compact

The intake area should be one tight working strip, not a tall mini-form.

A good default layout is:

- left: add file / add link / paste hint
- middle: note field
- right: evidence type or attach action

### Preview behavior

Evidence preview should be fast and predictable:

- open from keyboard or mouse
- close with `Escape`
- return focus to the launching item
- keep note and metadata easy to find

## Suggested implementation order

Work in this order so users feel the biggest gains first:

1. **Stabilize the shell**
   - fix sidebar flicker
   - make page index and context behavior stable while scrolling

2. **Finish keyboard support**
   - complete navigation clusters
   - finish surface open/close behavior
   - make help discoverable

3. **Move and rewrite content**
   - keep only page-specific guidance in the review page
   - move Help, Reference, and About to app-level features
   - rewrite tooltips and helper text

4. **Tighten dense form layout**
   - shorten travel distance
   - restore compact visible context where it was hidden
   - improve criterion and summary layout

5. **Upgrade evidence interactions**
   - unify add flows
   - make upload states obvious
   - improve preview, note editing, retry, and reuse

## Final outcome

If this plan is followed, the interface will be:

- faster to scan
- calmer while scrolling
- stronger for keyboard users
- denser without becoming obscure
- clearer about where help lives
- better for evidence-heavy review work

That is the right direction for this product: an efficient review instrument with less friction and more visible control.
