# Evidence uploads and evidence workflow proposal for the TRUST questionnaire

## Scope

This report analyzes how uploaded evidence should be handled in the actual TRUST questionnaire, based on the current questionnaire structure and workflow defined in:

- `trust-framework.html`
- `docs/trust-questionnaire.md`
- `docs/trust-framework-v2.md`
- `docs/review/trust-ms-forms-questionnaire-spec.md`

The current specification already establishes three relevant facts:

1. evidence is mandatory for a valid primary evaluation;
2. the questionnaire already separates evaluation-wide evidence (`2.10 Evidence folder link`) from criterion-specific evidence fields (`Evidence summary`, `Evidence links`);
3. the target storage model is a SharePoint document library with metadata keyed to evaluation and criterion codes.

The upload model should therefore extend the existing evidence workflow. It should not replace the current evidence summaries, criterion judgments, or auditable SharePoint storage pattern.

## Current-state implications

The current instrument is conceptually correct but operationally incomplete for uploads.

- Section 2 contains a single evaluation-wide evidence reference (`2.10 Evidence folder link`).
- Sections 3-7 collect criterion-specific evidence as text only (`Evidence summary`, `Evidence links`).
- Section 8 requires the evaluator to confirm that the evidence bundle has been assembled.
- Framework v2 and the Microsoft Forms specification both require screenshots, exports, notes, and supporting documents to exist in an auditable evidence bundle with criterion metadata.

This means uploads belong in the questionnaire workflow at the point where evidence is produced and interpreted, not only in an external folder after the fact.

## Where uploads and evidence should be collected in the workflow

| Workflow stage | Questionnaire location | Upload policy | Rationale |
|---|---|---|---|
| Nomination | Sections 0-1 only | No required uploads | The nomination path is intentionally lightweight. Requiring files here would increase friction and duplicate later work. A URL is sufficient. |
| Primary evaluation | Section 2 (`Evaluation Setup`) | Required evaluation-level evidence intake | Section 2 already carries the global evidence reference. This is the correct place to create or expose the evaluation evidence workspace and collect evidence that is not tied to a single criterion. |
| Primary evaluation | Sections 3-7 (`TR`-`TC`) | Criterion-level uploads available on each criterion card | Evidence should be attached where the reviewer assigns the score. This preserves traceability between file, observation, and criterion judgment. |
| Primary evaluation | Section 8 (`Critical fails and confidence`) | Conditional evidence association when a critical-fail flag is checked | Critical-fail notes should be able to reference one or more existing uploaded items directly. New uploads here should be allowed only when the failure evidence was not already attached earlier. |
| Second review | Section 10B | Optional reviewer addendum only | The second reviewer should work from the existing bundle, not create a parallel bundle. Additional uploads should be treated as addenda linked to the same evaluation. |
| Final team decision | Section 10C | No uploads | This stage records the decision. It should consume existing evidence, not create new operational evidence. |
| Re-evaluation / update | Same pattern as primary evaluation | Required new evidence bundle for the new cycle | Framework v2 requires re-evaluations to have their own evidence bundle. New uploads must be associated with the new evaluation cycle, not silently merged into the old one. |

### Recommended placement model

The preferred structure is a two-level model:

1. **Section 2 evaluation-level evidence workspace**
	- general screenshots;
	- exported results;
	- policy PDFs;
	- methodology documents;
	- benchmark artifacts;
	- files that support multiple criteria.

2. **Per-criterion evidence association controls in Sections 3-7**
	- each criterion card gets an `Add evidence` action;
	- uploaded files are automatically tagged with the criterion code when added from that card;
	- previously uploaded evaluation-level files can be re-used without re-uploading the binary.

Section 8 should not become the main upload area. It should function as a validation and exception layer.

## Recommended upload field types and accepted file classes

### Field types

| Field | Placement | Type | Behavior |
|---|---|---|---|
| Evaluation evidence upload | Section 2 | Multi-file upload | Creates or appends to the evaluation evidence bundle. Auto-tags records as `GLOBAL` unless reclassified later. |
| Criterion evidence upload | Each criterion card in Sections 3-7 | Multi-file upload | Adds evidence directly to the current criterion. Auto-tags `SectionCode` and `CriterionCode`. |
| Evidence type | Per uploaded item | Required single-select | `Screenshot`, `Exported result`, `Policy/terms document`, `Vendor documentation`, `Source verification record`, `Reviewer note`, `Other`. |
| Per-file note/comment | Per uploaded item | Required short/long text | Explains what the file shows and why it matters. |
| Re-use existing evidence | Each criterion card | Picker/search control | Associates an already-uploaded file with another criterion without duplicating storage. |
| Existing evidence links | Keep current text fields | Long text / URL references | URLs remain necessary for source pages and external documentation. Uploads complement these fields rather than replacing them. |

### Accepted file classes

| File class | Extensions | Default use |
|---|---|---|
| Image evidence | `.png`, `.jpg`, `.jpeg`, `.webp` | Screenshots of interface states, output views, warnings, source panels |
| PDF documents | `.pdf` | Privacy policies, terms, methodology papers, exported pages, saved vendor statements |
| Structured/text exports | `.txt`, `.md`, `.csv`, `.json`, `.ris`, `.bib` | Query logs, export files, citation exports, benchmark records |
| Office fallback | `.docx`, `.xlsx`, `.pptx` | Only when the source artifact cannot reasonably be stored as PDF or structured text |

### Rejected by default

The questionnaire should reject the following by default:

- archives: `.zip`, `.rar`, `.7z`;
- executables and scripts: `.exe`, `.msi`, `.bat`, `.sh`, `.js`, `.ps1`;
- active web content: `.html`, `.svg`.

These formats are harder to preview, harder to audit, and create unnecessary security and provenance ambiguity.

## Preview behavior for images vs non-images

### Images

Uploaded images should appear immediately below the upload control that received them. The preview should be compact and scannable.

Recommended image preview row/card contents:

- thumbnail;
- filename;
- file size;
- evidence type;
- criterion tag (if applicable);
- note status indicator;
- actions: `Open`, `Replace`, `Remove`.

The inline thumbnail is for recognition and confirmation only. It should not attempt to become a full inspection surface.

### Non-images

Non-image files should not be rendered as embedded previews inside the questionnaire.

Recommended non-image row contents:

- file-type label or icon;
- filename;
- extension;
- file size;
- upload date;
- evidence type;
- actions: `Open`, `Download` if applicable, `Replace`, `Remove`.

This is consistent with the requirement for filenames for non-images and avoids low-value inline rendering of PDFs or office files in an already dense form.

### Preview placement

The primary preview surface should be **inline, directly below the current upload area**. A single end-of-form evidence gallery would weaken the relationship between evidence and criterion scoring.

If a criterion has many files, the inline list should collapse after a small number of visible items and expose a `View all evidence` action for that criterion.

## Zoom / lightbox / modal recommendation and rationale

### Recommendation

Use a **hybrid model**:

1. **Inline preview list below the active upload control** for immediate confirmation.
2. **Modal/lightbox for image inspection only** when the user opens an image thumbnail.

### Rationale

- The questionnaire is dense. Large inline images would expand criterion cards excessively and degrade scan efficiency.
- Reviewers still need to inspect screenshots at full size for provenance, wording, tooltips, and disclosure details.
- A modal supports detailed inspection without permanently inflating the form layout.
- Non-image files do not benefit from a lightbox. They should open in the browser, in a dedicated file viewer, or via download.

### Modal behavior

The image modal should support:

- zoom in;
- zoom out;
- reset to fit;
- previous/next image within the current criterion or current section;
- visible filename and evidence note;
- close action.

The modal should not be the only place where the user can see that a file was uploaded. The inline list remains the primary confirmation mechanism.

## Per-file notes / comment model

Per-file notes should be mandatory. A file without an explanatory note is weak evidence in an audit context.

The note should answer two questions:

1. what the reviewer captured;
2. why it is relevant to the evaluation.

### Recommended data model

The evidence model should distinguish the physical file from the criterion-specific interpretation of that file.

#### 1. `EvidenceAsset`

One record per uploaded binary.

Recommended fields:

- `EvidenceAssetID`
- `EvaluationID`
- `OriginalFilename`
- `StoredFilename`
- `MimeType`
- `FileExtension`
- `FileSizeBytes`
- `HashSHA256`
- `PreviewKind` (`image`, `none`)
- `UploadedBy`
- `UploadedAt`
- `StorageUrl`
- `IsDeleted` / `DeletedAt`

#### 2. `EvidenceAssociation`

One record per usage of an asset inside the questionnaire.

Recommended fields:

- `EvidenceAssociationID`
- `EvaluationID`
- `EvidenceAssetID`
- `WorkflowStage`
- `SectionCode`
- `CriterionCode` (nullable for evaluation-level items)
- `EvidenceType`
- `CommentNote`
- `AddedBy`
- `AddedAt`
- `SortOrder`
- `IsPrimary`
- `AssociationStatus` (`active`, `removed`, `replaced`)

This separation is important because the same screenshot or PDF may support multiple criteria. The file is the same, but the note and relevance can differ by criterion.

### Note requirements

Recommended note rule:

- required for every uploaded file association;
- minimum 15 characters;
- maximum 1000 characters;
- plain text only.

For screenshots, the note is especially important because the visual content is not intrinsically accessible or self-explanatory.

## Remove / replace behavior

### Remove

Removal should be selective and explicit.

Recommended behavior:

- `Remove` from a criterion card removes the **association** from that criterion;
- if the file is not linked anywhere else in the same evaluation, the system may then offer deletion of the underlying asset;
- if the file is linked to multiple criteria, the default action must be `unlink from current criterion`, not `delete everywhere`.

This prevents accidental loss of shared evidence.

### Replace

`Replace` should:

- upload a new asset;
- preserve the current criterion mapping;
- preserve the evidence type;
- carry the existing note forward for editing;
- mark the old association as `replaced` rather than silently overwriting history.

An auditable questionnaire should not erase the fact that evidence was changed during the review cycle.

### Global deletion rule

Global deletion should require an explicit confirmation only when one of the following is true:

- the file is linked to multiple criteria;
- the file is the last evidence item attached to a scored criterion;
- the file is referenced by a critical-fail note.

## Validation rules

### Type validation

- accept only whitelisted extensions and MIME types;
- require extension and MIME type consistency where possible;
- reject files with unknown or missing MIME type when the platform cannot inspect them safely;
- reject active content and archives by default.

### Size validation

Recommended defaults:

- images: maximum `10 MB` per file;
- PDFs, structured exports, office documents: maximum `25 MB` per file;
- aggregate evaluation warning at `250 MB` total uploaded size.

These values are operational defaults, not platform guarantees. If the hosting platform imposes lower limits, the lower limit must win.

### Count validation

Recommended defaults:

- maximum `10` files per single upload action;
- maximum `12` linked files per criterion;
- soft warning at `40` files per evaluation;
- hard limit at `75` files per evaluation.

The criterion cap matters because evidence volume can become unreviewable long before storage limits are reached.

### Duplicate validation

Duplicate detection should be based on file hash, not filename.

Rules:

- exact same hash within the same evaluation: do not store a second binary; offer `link existing file to this criterion` instead;
- same filename but different hash: allow, but show a warning because the duplication may be accidental;
- duplicate uploads across different evaluation cycles: allow, because re-evaluations must maintain their own evidence history.

### Submission-level validation

- a primary evaluation cannot be finalized unless the evaluation has at least one evidence asset or a documented explanation for why all evidence is URL-only;
- if a critical-fail flag is checked, at least one supporting evidence association or explicit URL reference must be present;
- required evidence notes must be complete before the questionnaire can advance to the second-review state;
- Section 8 completion status should be computed from actual evidence records, not solely from a manual checkbox.

## Accessibility and keyboard interaction requirements

The upload workflow must satisfy the same keyboard-first and explicit-state principles as the rest of the questionnaire.

### Core requirements

- use a native file input with a visible trigger button; drag-and-drop may be added, but it cannot be the only upload mechanism;
- all upload, open, replace, remove, zoom, previous, next, and close actions must be keyboard reachable;
- every actionable control must have a specific accessible name that includes the filename where relevant;
- upload success, validation failures, and removal events must be announced through an `aria-live` region;
- visible focus indicators must be present on file rows, thumbnails, and modal controls;
- touch targets should respect the existing `44x44px` minimum.

### File list semantics

- the inline evidence list should be exposed as a list;
- each file row should expose filename, type, size, and note state in accessible text;
- non-image files should not rely on icon-only distinction.

### Modal semantics

- opening an image preview moves focus into the modal;
- the modal traps focus until closed;
- `Esc` closes the modal;
- `Enter` or `Space` activates buttons;
- left/right arrow keys may navigate between images when multiple images are present;
- zoom controls must not rely on pointer gestures alone.

### Screenshot accessibility requirement

Because uploaded screenshots are not inherently understandable to screen-reader users, the per-file note is not only a traceability feature; it is also the minimum textual explanation of the captured visual evidence.

## Explicit proposed solution summary

1. Keep the existing questionnaire structure.
2. Convert `2.10 Evidence folder link` from a manually entered URL into an evaluation evidence workspace reference, ideally auto-generated and auto-populated.
3. Add evaluation-level multi-file upload in Section 2 for global evidence.
4. Add per-criterion `Add evidence` controls in Sections 3-7 so evidence is attached at the point of scoring.
5. Keep `Evidence summary` and `Evidence links`; uploads complement these text fields rather than replacing them.
6. Show uploaded evidence inline below the relevant upload control.
7. Render image files as thumbnails; render non-image files as filename rows only.
8. Open image thumbnails in a modal/lightbox with zoom controls.
9. Store binaries as `EvidenceAsset` records in the SharePoint evidence library and link them to sections/criteria through `EvidenceAssociation` metadata.
10. Deduplicate binaries by hash and reuse associations instead of re-uploading identical files.
11. Treat removal as unlink-by-default and global delete only when explicitly requested.
12. Require a short note for every uploaded evidence association.

## Primary implementation risk

The main implementation risk is platform mismatch.

The requested behavior—inline previews, image zoom modal, per-file notes, selective unlink vs delete behavior, and file re-use across multiple criteria—is significantly richer than a standard Microsoft Forms file-upload question. If the actual questionnaire remains a stock Microsoft Forms implementation, these requirements will not be met cleanly. The likely technical resolution is to keep the questionnaire record in Forms/MS Lists/SharePoint, but move evidence handling into a companion SharePoint or Power Apps evidence component keyed by `EvaluationID`.
