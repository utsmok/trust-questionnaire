# Simplified backend essentials

Date: 2026-04-06
Status: planning only

## Why this document exists

This is the shortest useful backend plan that still supports the original product goal: a real multi-user TRUST review system, not just a browser-only questionnaire.

The current app is still a static browser app:

- the questionnaire state lives in the browser in the app store
- evidence files are turned into in-browser `dataUrl` values
- evidence can be exported as a JSON manifest
- there is no login, no saved server-side review record, and no shared collaboration model
- the only browser persistence in the current code is small UI state such as sidebar width

That means the first real version needs a backend, but it does **not** need a large or complicated one.

## What the product actually needs

The product needs four durable backend pieces:

1. **Login and session handling**
   - people must be able to sign in and sign out
   - the app must know who is editing a review
   - permissions must be based on real users, not just frontend workflow state

2. **A database for reviews and workflow**
   - store reviews in a database
   - store assignments, handovers, review status, comments, and final decisions in the same database
   - store the questionnaire state as one saved review document at first, not one database column per field

3. **Private file storage for evidence**
   - store uploaded evidence files outside the browser
   - keep file metadata and review links in the database
   - do not keep real evidence files only in browser memory

4. **Export and import support**
   - export a review and its evidence in a usable package
   - import older browser-only work so existing test data is not stranded

That is enough for launch.

The product does **not** need these things to work in the first real version:

- microservices
- live multi-user co-editing
- a separate real-time collaboration engine
- one database table or column for every questionnaire field
- browser extension support on day one
- a full standalone tooling workspace on day one

## What data needs to be saved

The minimum saved data is below.

| Data | What to save | Why it matters |
|---|---|---|
| Users | name, email, role, active status | Needed for login, permissions, and traceability |
| User profile details | affiliation, department, job title, default signature or reviewer text if used | Needed for reviewer identity and prefill |
| User settings | preferred density, timezone, sidebar/help preferences, other small UI defaults | Makes the app feel continuous when users come back |
| Review record | review ID, tool name/title, created by, created date, updated date, current stage, assigned people | Needed to find and manage reviews |
| Review state | the full questionnaire state as saved JSON | This is the actual work product |
| Review revisions | a saved copy of the review at important moments | Needed for audit trail, rollback, handover, and trust |
| Assignments | primary reviewer, second reviewer, decision owner or decision group | Needed for collaboration and permissions |
| Comments and activity | handover notes, reviewer comments, decision notes, who did what and when | Needed for collaboration and traceability |
| Evidence files | file location, filename, type, size, uploaded by, upload time | Needed so evidence survives beyond the browser |
| Evidence links | which review or criterion the file supports, evidence type, note | Needed because one file may support more than one criterion |
| Export records | what was exported, when, by whom, and in what format | Helps with traceability and support |
| Import records | what was imported, when, by whom, and from which source | Helps with migration and troubleshooting |

## Minimum backend for launch

This is the smallest backend that makes the product real.

### 1. Login/logout

The app needs institutional sign-in and a normal logout.

At minimum:

- users sign in with the university or organization account system
- the backend creates a normal web session
- the frontend can ask “who am I?” and get back the current user
- logout ends the local session cleanly

What is not needed at launch:

- a custom password system
- local avatar upload
- public self-registration

### 2. User settings and profile details

Store a small user record and a small settings record.

Minimum profile details:

- display name
- email
- role
- affiliation
- department or team if needed
- job title if it is shown in review output

Minimum settings:

- default reviewer signature or name block
- default affiliation text
- preferred timezone
- preferred density or compactness setting
- small UI preferences such as default sidebar/help tab if useful

This should stay small. The product is a review system, not a social profile system.

### 3. Save/continue

This is the most important missing feature.

At minimum:

- when a user opens a review, load the last saved review from the database
- when a user changes the questionnaire, save the current review state to the database
- users must be able to close the app and continue later from the same saved state
- the server copy is the real source of truth

The simplest useful way to do this first:

- save the whole review state as one document
- autosave on a timer and on major actions
- also save immediately on handover, second review submit, and final decision submit

A small browser crash-recovery cache is optional, but it should only be a backup. It should not be the main save system.

### 4. Evidence file storage

Evidence must move out of browser memory.

At minimum:

- upload files to private server-side storage
- save file metadata in the database
- save links from each file to the review or criterion it supports
- allow one file to be linked more than once when needed
- keep the reviewer note on the link, not only on the file itself

This matches the current app better than a simple “one file per criterion” model.

For launch, the app should support:

- review-level evidence
- criterion-level evidence
- reuse of the same file across multiple criteria
- secure download only for authorized users

### 5. Review workflow and permissions

The backend needs a simple workflow model so the collaboration rules are real.

At minimum, store:

- draft / in progress
- handed over to second reviewer
- second review in progress
- ready for team decision
- finalized
- reopened

The backend must check who is allowed to edit at each stage. The frontend alone is not enough for this.

### 6. Export/import

Launch needs both export and import, but they can stay simple.

**Export for launch:**

- export one review as JSON
- export evidence links in a clear manifest
- optionally bundle files and manifest in a ZIP
- include review metadata, assignments, major timestamps, and final decision text

**Import for launch:**

- support importing old browser-only review data
- support importing the current evidence manifest format
- admin-only import is acceptable for the first version if that is enough to migrate existing work

The goal is continuity, not a fancy migration wizard.

## Good enough first collaboration model

The first real version should support structured review work, not free-for-all editing.

### Collaboration roles

A review should have these people or roles:

- **primary reviewer**
- **second reviewer**
- **decision owner** or **decision group**
- optional **observer/read-only** access

### Editing model

Keep the rules simple:

- one person is the main editor for a review stage
- other people can read and comment
- do not build real-time multi-user typing for launch
- if two people edit at once, the server should warn or reject the later save instead of trying to merge silently

That is much simpler and fits the current questionnaire better.

### Handover

The app needs a real handover step.

At minimum:

- primary reviewer marks the review ready for handover
- backend saves a revision at that point
- primary reviewer can add a handover note
- second reviewer assignment is recorded
- the review becomes read-only or limited for the primary reviewer until reopened

### Second reviewer

The second reviewer should not silently overwrite the whole review.

Good enough first version:

- second reviewer can complete the second-review section
- second reviewer can add comments and disagreement notes
- second reviewer can link more evidence if needed
- direct changes to the primary reviewer’s main scoring work should require a reopen step or explicit override

This keeps responsibility clear.

### Team decision

The team decision step should be simple and explicit.

Good enough first version:

- one designated decision editor records the final outcome after the team discussion
- store the final recommendation, rationale, participants, and date
- keep the final decision section separate from the main review editing stage
- save a revision when the decision is recorded

The discussion itself can happen in a meeting. The app only needs to store the outcome clearly.

### Comments and activity

The first version should support comments and a basic activity log.

At minimum:

- comments at review, section, or criterion level
- handover note
- second reviewer note
- final decision note
- activity log showing save, handover, assignment change, decision, reopen, export, and evidence upload actions

This is enough collaboration for launch.

## What can be postponed

The following work is useful, but it should not block launch.

## Do later

- live presence indicators
- simultaneous co-editing
- automatic merge tools for conflicts
- guest reviewer access outside the normal institution login
- advanced notifications and reminder rules
- full reporting dashboards
- public publication workflows
- deeper analytics on review history
- rich per-field discussion threads everywhere
- flexible team administration features
- a full standalone tooling workspace for reusable test sets and runs
- browser extension capture
- browser-side capture inbox syncing
- direct integrations with external document platforms if they add complexity

## What later tooling and extension work depends on

The later tooling and extension work should only start after the core backend above exists.

It depends on these things being real first:

1. **Stable login and permissions**
   - the system must know who the user is
   - the system must know which reviews the user may access

2. **Stable saved review records**
   - every review needs a real server-side ID
   - the app must be able to load a review, save it, and reopen it later

3. **Durable evidence APIs**
   - the server must accept evidence uploads
   - the server must return a stored file ID
   - the server must let the app link that file to a review or criterion

4. **Valid target lookup**
   - tooling or an extension must be able to ask: which review is active, which criteria are valid targets, and is this review editable right now?

5. **Basic audit trail**
   - later tooling needs to know who captured or linked evidence and when

6. **Exportable review packages**
   - later tooling and extension work is easier if reviews already have a stable export format

If those pieces do not exist first, later extension work will end up inventing temporary IDs, temporary storage, and temporary auth. That would create rework.

## Recommended launch order

1. Add login/logout and user records.
2. Add saved reviews and save/continue.
3. Add private evidence file storage and evidence links.
4. Add assignments, handover, second review, comments, and team decision.
5. Add export/import for migration and backup.
6. Only then start the separate tooling and extension work.

## Bottom line

The minimum real product is:

- users can log in and out
- reviews are saved in a database and can be continued later
- evidence files are stored privately on the server
- one file can be linked to one or more review targets
- primary review, handover, second review, and team decision are supported
- review history, comments, and exports exist

Everything else can wait until after that works reliably.
