const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatDateTime = (value) => {
  const timestamp = Date.parse(value ?? '');

  if (!Number.isFinite(timestamp)) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
};

const formatLabel = (value) =>
  String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (part) => part.toUpperCase());

const createOptionsMarkup = (
  options,
  selectedValue,
  { includeEmpty = false, emptyLabel = 'Select' } = {},
) => {
  const optionMarkup = options.map(
    (option) => `
      <option
        value="${escapeHtml(option.value)}"
        ${String(selectedValue ?? '') === String(option.value) ? 'selected' : ''}
      >
        ${escapeHtml(option.label)}
      </option>
    `,
  );

  return [
    includeEmpty ? `<option value="">${escapeHtml(emptyLabel)}</option>` : '',
    ...optionMarkup,
  ].join('');
};

const createCaseMarkup = ({
  caseEntry,
  index,
  criterionOptions,
  scenarioOptions,
  evidenceOptions,
}) => `
  <section class="tooling-case-card" data-tooling-case-index="${index}">
    <div class="dashboard-section-heading-row tooling-case-header">
      <h3 class="dashboard-section-title">Case ${index + 1}</h3>
      <button
        type="button"
        class="nav-button"
        data-tooling-remove-case="${index}"
      >
        Remove
      </button>
    </div>
    <div class="tooling-editor-grid">
      <label class="dashboard-field">
        <span class="dashboard-field-label">Title</span>
        <input
          class="dashboard-input"
          type="text"
          value="${escapeHtml(caseEntry.title)}"
          data-tooling-case-field="title"
        />
      </label>
      <label class="dashboard-field">
        <span class="dashboard-field-label">Scenario</span>
        <select class="dashboard-select" data-tooling-case-field="scenarioType">
          ${createOptionsMarkup(scenarioOptions, caseEntry.scenarioType)}
        </select>
      </label>
      <label class="dashboard-field">
        <span class="dashboard-field-label">Criterion target</span>
        <select class="dashboard-select" data-tooling-case-field="criterionCode">
          ${createOptionsMarkup(criterionOptions, caseEntry.criterionCode, {
            includeEmpty: true,
            emptyLabel: 'No fixed criterion',
          })}
        </select>
      </label>
      <label class="dashboard-field">
        <span class="dashboard-field-label">Evidence expectation</span>
        <select class="dashboard-select" data-tooling-case-field="evidenceType">
          ${createOptionsMarkup(evidenceOptions, caseEntry.evidenceType)}
        </select>
      </label>
      <label class="dashboard-field tooling-span-2">
        <span class="dashboard-field-label">Instruction / query</span>
        <textarea
          class="dashboard-input tooling-textarea"
          data-tooling-case-field="instructionText"
        >${escapeHtml(caseEntry.instructionText)}</textarea>
      </label>
      <label class="dashboard-field">
        <span class="dashboard-field-label">Expected observation type</span>
        <input
          class="dashboard-input"
          type="text"
          value="${escapeHtml(caseEntry.expectedObservationType)}"
          data-tooling-case-field="expectedObservationType"
        />
      </label>
      <label class="dashboard-field tooling-span-2">
        <span class="dashboard-field-label">Notes</span>
        <textarea
          class="dashboard-input tooling-textarea"
          data-tooling-case-field="notes"
        >${escapeHtml(caseEntry.notes)}</textarea>
      </label>
    </div>
  </section>
`;

const createLinkedPlansMarkup = (linkedPlans = []) => {
  if (!Array.isArray(linkedPlans) || linkedPlans.length === 0) {
    return '<div class="dashboard-empty-state tooling-empty-state"><strong>No linked reviews yet.</strong><p>Publish a revision, then pin it to a saved review from the link panel below.</p></div>';
  }

  return `
    <div class="review-list-shell tooling-list-shell">
      <table class="review-list-table tooling-list-table tooling-linked-table">
        <thead>
          <tr>
            <th>Review</th>
            <th>Role</th>
            <th>Revision</th>
            <th>Linked</th>
          </tr>
        </thead>
        <tbody>
          ${linkedPlans
            .map(
              (plan) => `
                <tr>
                  <td>
                    <div class="review-list-title">${escapeHtml(
                      plan.review?.publicId || 'Review removed',
                    )}</div>
                    <div class="review-list-subtitle">${escapeHtml(
                      plan.review?.titleSnapshot || 'Unavailable review',
                    )}</div>
                  </td>
                  <td>
                    <span class="review-list-chip">${escapeHtml(formatLabel(plan.role))}</span>
                  </td>
                  <td>
                    ${
                      plan.revision
                        ? `v${escapeHtml(plan.revision.versionNumber)} · ${escapeHtml(plan.revision.titleSnapshot)}`
                        : '—'
                    }
                  </td>
                  <td>${escapeHtml(formatDateTime(plan.linkedAt))}</td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
};

const createPublishedRevisionMarkup = (publishedRevisions = []) => {
  if (!Array.isArray(publishedRevisions) || publishedRevisions.length === 0) {
    return '<div class="dashboard-empty-state tooling-empty-state"><strong>No published revision.</strong><p>Drafts stay mutable until you publish an immutable version.</p></div>';
  }

  return `
    <div class="tooling-published-stack">
      ${publishedRevisions
        .map(
          (revision) => `
            <div class="review-overview-card tooling-published-card">
              <div class="review-list-actions">
                <span class="review-list-chip">v${escapeHtml(revision.versionNumber)}</span>
                <span class="review-list-subtitle">${escapeHtml(
                  formatDateTime(revision.publishedAt),
                )}</span>
              </div>
              <h3>${escapeHtml(revision.titleSnapshot)}</h3>
              <p class="dashboard-section-note">${escapeHtml(
                revision.changeSummary || 'No change summary recorded.',
              )}</p>
              <p class="dashboard-section-note">${escapeHtml(
                String(revision.caseCount ?? 0),
              )} case(s)</p>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
};

const createCasesMarkup = (viewModel, draft) => {
  if (!draft.cases.length) {
    return '<div class="dashboard-empty-state tooling-empty-state"><strong>No cases in this draft.</strong><p>Add one or more reusable scenarios before publishing.</p></div>';
  }

  return draft.cases
    .map((caseEntry, index) =>
      createCaseMarkup({
        caseEntry,
        index,
        criterionOptions: viewModel.criterionOptions,
        scenarioOptions: viewModel.scenarioOptions,
        evidenceOptions: viewModel.evidenceOptions,
      }),
    )
    .join('');
};

export const createTestSetEditorMarkup = (viewModel) => {
  if (!viewModel?.selectedTestSet) {
    return `
      <div class="dashboard-empty-state tooling-empty-state">
        <strong>Select a test set.</strong>
        <p>The tooling workspace stays separate from the questionnaire. Pick a set from the queue or create a new one to start drafting cases.</p>
      </div>
    `;
  }

  const selected = viewModel.selectedTestSet;
  const draft = viewModel.editorDraft;
  const canPublish = Boolean(selected.currentDraftRevision?.id);
  const hasPublishedRevision = Boolean(selected.latestPublishedRevision?.id);
  const feedback =
    viewModel.feedback?.scope && viewModel.feedback.scope !== 'create'
      ? `<div class="dashboard-inline-notice tooling-feedback" data-tone="${escapeHtml(
          viewModel.feedback.tone || 'info',
        )}">${escapeHtml(viewModel.feedback.message)}</div>`
      : '';

  return `
    <div class="tooling-editor-shell" data-tooling-editor-root>
      <div class="dashboard-section-heading-row">
        <div>
          <h2 class="dashboard-section-title">${escapeHtml(selected.title)}</h2>
          <p class="dashboard-section-note">${escapeHtml(
            selected.description || 'No description recorded.',
          )}</p>
        </div>
        <div class="review-list-actions">
          <span class="review-list-chip">${escapeHtml(formatLabel(selected.status))}</span>
          <span class="review-list-chip">${escapeHtml(selected.visibility)}</span>
          <span class="review-list-chip">Owner: ${escapeHtml(
            selected.ownerDisplayName || '—',
          )}</span>
        </div>
      </div>
      ${feedback}
      <div class="tooling-layout tooling-editor-layout">
        <form class="tooling-editor-main" data-tooling-editor-form>
          <div class="tooling-editor-grid">
            <label class="dashboard-field">
              <span class="dashboard-field-label">Title</span>
              <input
                class="dashboard-input"
                type="text"
                value="${escapeHtml(draft.title)}"
                data-tooling-field="title"
              />
            </label>
            <label class="dashboard-field">
              <span class="dashboard-field-label">Visibility</span>
              <select class="dashboard-select" data-tooling-field="visibility">
                ${createOptionsMarkup(viewModel.visibilityOptions, draft.visibility)}
              </select>
            </label>
            <label class="dashboard-field tooling-span-2">
              <span class="dashboard-field-label">Purpose</span>
              <input
                class="dashboard-input"
                type="text"
                value="${escapeHtml(draft.purpose)}"
                data-tooling-field="purpose"
              />
            </label>
            <label class="dashboard-field tooling-span-3">
              <span class="dashboard-field-label">Description</span>
              <textarea
                class="dashboard-input tooling-textarea"
                data-tooling-field="description"
              >${escapeHtml(draft.description)}</textarea>
            </label>
            <label class="dashboard-field tooling-span-3">
              <span class="dashboard-field-label">Draft change summary</span>
              <textarea
                class="dashboard-input tooling-textarea"
                data-tooling-field="changeSummary"
              >${escapeHtml(draft.changeSummary)}</textarea>
            </label>
          </div>

          <div class="dashboard-section-heading-row">
            <h3 class="dashboard-section-title">Cases</h3>
            <button type="button" class="nav-button" data-tooling-add-case>
              Add case
            </button>
          </div>
          <div class="tooling-case-stack">${createCasesMarkup(viewModel, draft)}</div>

          <div class="dashboard-action-row">
            <button type="submit" class="nav-button">Save draft</button>
            <button
              type="button"
              class="nav-button"
              data-tooling-fork="${escapeHtml(selected.id)}"
            >
              Fork
            </button>
            <button
              type="button"
              class="nav-button"
              data-tooling-archive="${escapeHtml(selected.id)}"
            >
              Archive
            </button>
            ${
              canPublish
                ? `<button type="button" class="nav-button" data-tooling-publish="${escapeHtml(selected.currentDraftRevision.id)}">Publish draft</button>`
                : '<span class="dashboard-section-note">No editable draft revision is active.</span>'
            }
          </div>
        </form>

        <aside class="tooling-editor-sidebar">
          <section class="review-overview-card tooling-side-card">
            <h3>Revision status</h3>
            <p class="dashboard-section-note">Current draft: ${
              selected.currentDraftRevision
                ? `v${escapeHtml(selected.currentDraftRevision.versionNumber)} · ${escapeHtml(String(selected.currentDraftRevision.caseCount ?? 0))} case(s)`
                : '—'
            }</p>
            <p class="dashboard-section-note">Latest published: ${
              selected.latestPublishedRevision
                ? `v${escapeHtml(selected.latestPublishedRevision.versionNumber)} · ${escapeHtml(formatDateTime(selected.latestPublishedRevision.publishedAt))}`
                : '—'
            }</p>
          </section>

          <section class="review-overview-card tooling-side-card">
            <h3>Published revisions</h3>
            ${createPublishedRevisionMarkup(viewModel.publishedRevisions)}
          </section>

          <section class="review-overview-card tooling-side-card">
            <h3>Link published revision to review</h3>
            ${
              hasPublishedRevision
                ? `
                  <form data-tooling-link-form>
                    <input
                      type="hidden"
                      value="${escapeHtml(selected.latestPublishedRevision.id)}"
                      data-tooling-link-field="testSetRevisionId"
                    />
                    <div class="tooling-editor-grid tooling-link-grid">
                      <label class="dashboard-field tooling-span-2">
                        <span class="dashboard-field-label">Review</span>
                        <select
                          class="dashboard-select"
                          data-tooling-link-field="evaluationId"
                        >
                          ${createOptionsMarkup(
                            viewModel.reviewOptions,
                            viewModel.reviewOptions[0]?.value ?? '',
                            {
                              includeEmpty: true,
                              emptyLabel: 'Select review',
                            },
                          )}
                        </select>
                      </label>
                      <label class="dashboard-field">
                        <span class="dashboard-field-label">Role</span>
                        <select class="dashboard-select" data-tooling-link-field="role">
                          ${createOptionsMarkup(viewModel.reviewPlanRoleOptions, 'baseline')}
                        </select>
                      </label>
                    </div>
                    <div class="dashboard-action-row">
                      <button type="submit" class="nav-button">Link revision</button>
                    </div>
                  </form>
                `
                : '<p class="dashboard-section-note">Publish a revision before it can be pinned to a review.</p>'
            }
          </section>

          <section class="review-overview-card tooling-side-card">
            <h3>Linked reviews</h3>
            ${createLinkedPlansMarkup(selected.linkedPlans)}
          </section>
        </aside>
      </div>
    </div>
  `;
};
