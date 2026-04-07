import { listReviewTestRuns, saveReviewTestRun } from '../api/test-runs.js';

const REVIEW_WORKSPACE_PATH_PATTERN = /^\/reviews\/([^/]+)\/workspace(?:\/|$)/;
const TEST_RUN_SYNC_EVENT = 'trust:test-runs-sync';
const PANEL_SELECTOR = '[data-test-run-panel]';

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

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const resolveReviewId = (documentRef) => {
  const pathname = documentRef?.defaultView?.location?.pathname ?? '';
  const match = pathname.match(REVIEW_WORKSPACE_PATH_PATTERN);

  return match?.[1] ? decodeURIComponent(match[1]) : null;
};

const getAllEvidenceItems = (state) => {
  const evaluationItems = Array.isArray(state?.evaluation?.evidence?.evaluation)
    ? state.evaluation.evidence.evaluation
    : [];
  const criterionItems = Object.values(state?.evaluation?.evidence?.criteria ?? {}).flatMap(
    (items) => (Array.isArray(items) ? items : []),
  );

  return [...evaluationItems, ...criterionItems].filter(Boolean);
};

const getEvidenceOptionsForCase = (state, caseEntry) => {
  const targetCriterionCode = normalizeText(caseEntry?.criterionCode);
  const seen = new Set();

  return getAllEvidenceItems(state)
    .filter((item) => {
      if (!item?.id || seen.has(item.id)) {
        return false;
      }

      if (!targetCriterionCode) {
        return true;
      }

      return !item.criterionCode || item.criterionCode === targetCriterionCode;
    })
    .filter((item) => {
      seen.add(item.id);
      return true;
    })
    .map((item) => ({
      id: item.id,
      label: `${item.name ?? 'Evidence'} · ${item.criterionCode ?? 'Review'} · ${formatLabel(
        item.evidenceType ?? 'other',
      )}`,
    }));
};

const buildEvidenceRunIndex = (plans = []) => {
  const byEvidenceLinkId = {};

  plans.forEach((plan) => {
    const revisionLabel = plan?.revision?.versionNumber
      ? `${plan?.testSet?.title ?? 'Test set'} v${plan.revision.versionNumber}`
      : (plan?.testSet?.title ?? 'Test set');

    (Array.isArray(plan?.cases) ? plan.cases : []).forEach((caseEntry) => {
      const run = caseEntry?.run;
      if (!run) {
        return;
      }

      const linkedEvidence = Array.isArray(run.linkedEvidence) ? run.linkedEvidence : [];
      linkedEvidence.forEach((link) => {
        if (!link?.linkId) {
          return;
        }

        if (!Array.isArray(byEvidenceLinkId[link.linkId])) {
          byEvidenceLinkId[link.linkId] = [];
        }

        byEvidenceLinkId[link.linkId].push({
          runId: run.id,
          reviewTestPlanId: plan.id,
          caseOrdinal: caseEntry.ordinal,
          caseTitle: caseEntry.title,
          criterionCode: caseEntry.criterionCode ?? run.criterionCode ?? null,
          status: run.status,
          revisionLabel,
          planRole: plan.role,
          completedAt: run.completedAt,
        });
      });
    });
  });

  return byEvidenceLinkId;
};

const dispatchTestRunSync = (documentRef, plans) => {
  documentRef.dispatchEvent(
    new CustomEvent(TEST_RUN_SYNC_EVENT, {
      detail: {
        byEvidenceLinkId: buildEvidenceRunIndex(plans),
      },
    }),
  );
};

const createSummaryMarkup = (summary = {}) => {
  const cards = [
    ['Linked plans', summary.planCount ?? 0],
    ['Test cases', summary.caseCount ?? 0],
    ['Recorded runs', summary.runCount ?? 0],
    ['Completed', summary.completedRunCount ?? 0],
  ];

  return `
    <div class="dashboard-summary-strip tooling-run-summary-strip">
      ${cards
        .map(
          ([label, value]) => `
            <div class="dashboard-summary-card">
              <div class="dashboard-summary-value">${escapeHtml(String(value))}</div>
              <div class="dashboard-summary-label">${escapeHtml(label)}</div>
            </div>
          `,
        )
        .join('')}
    </div>
  `;
};

const createEvidenceChecklistMarkup = ({ options = [], selectedIds = [] } = {}) => {
  if (!options.length) {
    return '<p class="dashboard-section-note">No compatible review evidence is currently available. Attach evidence first, then link it to this run.</p>';
  }

  const selectedSet = new Set(selectedIds.map((value) => String(value)));

  return `
    <div class="tooling-run-evidence-list">
      ${options
        .map(
          (option) => `
            <label class="checkbox-item tooling-run-evidence-item">
              <input
                type="checkbox"
                value="${escapeHtml(option.id)}"
                data-test-run-field="linkedEvidenceLinkIds"
                ${selectedSet.has(String(option.id)) ? 'checked' : ''}
              />
              <span>${escapeHtml(option.label)}</span>
            </label>
          `,
        )
        .join('')}
    </div>
  `;
};

const createCaseDraft = (caseEntry) => ({
  status: caseEntry?.run?.status ?? 'not_started',
  resultSummary: caseEntry?.run?.resultSummary ?? '',
  resultNotes: caseEntry?.run?.resultNotes ?? '',
  linkedEvidenceLinkIds: Array.isArray(caseEntry?.run?.linkedEvidenceLinkIds)
    ? caseEntry.run.linkedEvidenceLinkIds
    : [],
});

const createCaseMarkup = ({
  plan,
  caseEntry,
  state,
  savingKey = '',
  messageByCaseKey = {},
  draftsByCaseKey = {},
}) => {
  const caseKey = `${plan.id}:${caseEntry.ordinal}`;
  const run = caseEntry.run ?? null;
  const draft = draftsByCaseKey[caseKey] ?? createCaseDraft(caseEntry);
  const evidenceOptions = getEvidenceOptionsForCase(state, caseEntry);
  const feedback = messageByCaseKey[caseKey] ?? '';

  return `
    <article class="review-overview-card tooling-run-case-card" data-test-run-case-key="${escapeHtml(
      caseKey,
    )}" data-test-run-plan-id="${escapeHtml(plan.id)}" data-test-run-case-ordinal="${escapeHtml(
      caseEntry.ordinal,
    )}">
      <div class="dashboard-section-heading-row tooling-run-case-header">
        <div>
          <h4 class="dashboard-section-title">Case ${escapeHtml(String(caseEntry.ordinal))} · ${escapeHtml(
            caseEntry.title || 'Untitled case',
          )}</h4>
          <p class="dashboard-section-note">
            ${escapeHtml(caseEntry.criterionCode || 'No fixed criterion')} · ${escapeHtml(
              formatLabel(caseEntry.scenarioType || 'exploratory'),
            )} · ${escapeHtml(plan.role)}
          </p>
        </div>
        <div class="review-list-actions">
          <span class="review-list-chip">${escapeHtml(formatLabel(run?.status || 'not_started'))}</span>
          <span class="review-list-subtitle">${escapeHtml(
            run?.completedAt ? `Completed ${formatDateTime(run.completedAt)}` : 'Not completed',
          )}</span>
        </div>
      </div>
      <div class="tooling-editor-grid tooling-run-grid">
        <label class="dashboard-field">
          <span class="dashboard-field-label">Run status</span>
          <select class="dashboard-select" data-test-run-field="status">
            ${['not_started', 'in_progress', 'completed', 'skipped', 'blocked']
              .map(
                (status) => `
                  <option value="${escapeHtml(status)}" ${
                    String(draft.status || 'not_started') === status ? 'selected' : ''
                  }>
                    ${escapeHtml(formatLabel(status))}
                  </option>
                `,
              )
              .join('')}
          </select>
        </label>
        <label class="dashboard-field tooling-span-2">
          <span class="dashboard-field-label">Short outcome</span>
          <input
            class="dashboard-input"
            type="text"
            value="${escapeHtml(draft.resultSummary || '')}"
            data-test-run-field="resultSummary"
            placeholder="Observed result, pass/fail nuance, or blocker summary"
          />
        </label>
        <label class="dashboard-field tooling-span-3">
          <span class="dashboard-field-label">Run notes</span>
          <textarea
            class="dashboard-input tooling-textarea"
            rows="3"
            data-test-run-field="resultNotes"
            placeholder="Record execution detail, comparison notes, and interpretation."
          >${escapeHtml(draft.resultNotes || '')}</textarea>
        </label>
        <div class="dashboard-field tooling-span-3">
          <span class="dashboard-field-label">Linked evidence</span>
          ${createEvidenceChecklistMarkup({
            options: evidenceOptions,
            selectedIds: draft.linkedEvidenceLinkIds ?? [],
          })}
        </div>
      </div>
      ${
        feedback
          ? `<div class="dashboard-inline-notice tooling-feedback">${escapeHtml(feedback)}</div>`
          : ''
      }
      <div class="dashboard-action-row">
        <button
          type="button"
          class="nav-button"
          data-test-run-save="${escapeHtml(caseKey)}"
          ${savingKey === caseKey ? 'disabled' : ''}
        >
          ${savingKey === caseKey ? 'Saving…' : 'Save run'}
        </button>
        <span class="dashboard-section-note">
          ${escapeHtml(run?.executedByDisplayName ? `Last updated by ${run.executedByDisplayName}` : 'No saved run yet.')}
        </span>
      </div>
    </article>
  `;
};

const createPlanMarkup = ({ plan, state, savingKey, messageByCaseKey, draftsByCaseKey }) => `
  <section class="review-overview-card tooling-run-plan-card" data-test-run-plan="${escapeHtml(plan.id)}">
    <div class="dashboard-section-heading-row">
      <div>
        <h3 class="dashboard-section-title">${escapeHtml(
          plan?.testSet?.title || plan?.revision?.titleSnapshot || 'Linked test plan',
        )}</h3>
        <p class="dashboard-section-note">
          ${escapeHtml(plan.role)} · revision ${escapeHtml(
            plan?.revision?.versionNumber ? `v${plan.revision.versionNumber}` : '—',
          )} · linked ${escapeHtml(formatDateTime(plan.linkedAt))}
        </p>
      </div>
      <div class="review-list-actions">
        <span class="review-list-chip">${escapeHtml(
          `${Array.isArray(plan.cases) ? plan.cases.length : 0} case(s)`,
        )}</span>
        <span class="review-list-chip">${escapeHtml(plan.linkedByDisplayName || 'Unknown user')}</span>
      </div>
    </div>
    <div class="tooling-run-case-stack">
      ${(Array.isArray(plan.cases) ? plan.cases : [])
        .map((caseEntry) =>
          createCaseMarkup({
            plan,
            caseEntry,
            state,
            savingKey,
            messageByCaseKey,
            draftsByCaseKey,
          }),
        )
        .join('')}
    </div>
  </section>
`;

const createEmptyMarkup = () => `
  <div class="dashboard-empty-state tooling-empty-state">
    <strong>No linked test plans.</strong>
    <p>Link a published test-set revision to this review in the tooling workspace before recording run outcomes here.</p>
  </div>
`;

const createMainPanelMarkup = ({ panelState, state }) => {
  if (panelState.loading) {
    return '<div class="dashboard-inline-notice">Loading linked test plans and test runs…</div>';
  }

  if (panelState.errorMessage) {
    return `<div class="dashboard-inline-notice">${escapeHtml(panelState.errorMessage)}</div>`;
  }

  if (!panelState.plans.length) {
    return createEmptyMarkup();
  }

  return `
    <section class="field-group" data-test-run-workspace="true">
      <div class="dashboard-section-heading-row">
        <div>
          <h3 class="dashboard-section-title">Review-linked test runs</h3>
          <p class="dashboard-section-note">Pinned test-set revisions execute inside the review workspace. Evidence links remain canonical and reusable across the review.</p>
        </div>
      </div>
      ${createSummaryMarkup(panelState.summary)}
      <div class="tooling-run-plan-stack">
        ${panelState.plans
          .map((plan) =>
            createPlanMarkup({
              plan,
              state,
              savingKey: panelState.savingKey,
              messageByCaseKey: panelState.messageByCaseKey,
              draftsByCaseKey: panelState.draftsByCaseKey,
            }),
          )
          .join('')}
      </div>
    </section>
  `;
};

const createCriterionSummaryMarkup = ({ criterionCode, panelState }) => {
  const matchingCases = panelState.plans.flatMap((plan) =>
    (Array.isArray(plan.cases) ? plan.cases : [])
      .filter((caseEntry) => caseEntry.criterionCode === criterionCode)
      .map((caseEntry) => ({
        plan,
        caseEntry,
      })),
  );

  if (!matchingCases.length) {
    return `
      <section class="review-overview-card tooling-side-card">
        <h3>Linked test cases</h3>
        <p class="dashboard-section-note">No linked test cases currently target ${escapeHtml(
          criterionCode,
        )}.</p>
      </section>
    `;
  }

  const completedCount = matchingCases.filter(
    ({ caseEntry }) => caseEntry.run?.status === 'completed',
  ).length;

  return `
    <section class="review-overview-card tooling-side-card">
      <h3>Linked test cases</h3>
      <p class="dashboard-section-note">${escapeHtml(String(matchingCases.length))} linked case(s) · ${escapeHtml(
        String(completedCount),
      )} completed</p>
      <div class="tooling-published-stack">
        ${matchingCases
          .map(
            ({ plan, caseEntry }) => `
              <div class="tooling-published-card">
                <div class="review-list-actions">
                  <span class="review-list-chip">${escapeHtml(plan.role)}</span>
                  <span class="review-list-chip">${escapeHtml(
                    caseEntry.run ? formatLabel(caseEntry.run.status) : 'Not started',
                  )}</span>
                </div>
                <h4>${escapeHtml(caseEntry.title || `Case ${caseEntry.ordinal}`)}</h4>
                <p class="dashboard-section-note">${escapeHtml(
                  plan?.testSet?.title || plan?.revision?.titleSnapshot || 'Linked test plan',
                )} · revision ${escapeHtml(
                  plan?.revision?.versionNumber ? `v${plan.revision.versionNumber}` : '—',
                )}</p>
              </div>
            `,
          )
          .join('')}
      </div>
    </section>
  `;
};

const collectCasePayload = (caseCard) => {
  const reviewTestPlanId = Number(caseCard.dataset.testRunPlanId);
  const caseOrdinal = Number(caseCard.dataset.testRunCaseOrdinal);
  const statusControl = caseCard.querySelector('[data-test-run-field="status"]');
  const summaryControl = caseCard.querySelector('[data-test-run-field="resultSummary"]');
  const notesControl = caseCard.querySelector('[data-test-run-field="resultNotes"]');
  const evidenceControls = Array.from(
    caseCard.querySelectorAll('[data-test-run-field="linkedEvidenceLinkIds"]:checked'),
  );

  return {
    reviewTestPlanId,
    caseOrdinal,
    status: statusControl instanceof HTMLSelectElement ? statusControl.value : 'not_started',
    resultSummary: summaryControl instanceof HTMLInputElement ? summaryControl.value : '',
    resultNotes: notesControl instanceof HTMLTextAreaElement ? notesControl.value : '',
    linkedEvidenceLinkIds: evidenceControls
      .filter((control) => control instanceof HTMLInputElement)
      .map((control) => control.value),
  };
};

const captureCaseDraft = (caseCard) => {
  const payload = collectCasePayload(caseCard);

  return {
    status: payload.status,
    resultSummary: payload.resultSummary,
    resultNotes: payload.resultNotes,
    linkedEvidenceLinkIds: payload.linkedEvidenceLinkIds,
  };
};

export const initializeTestPlanPanel = ({ root = document, store } = {}) => {
  const documentRef = root?.ownerDocument ?? root ?? document;
  const questionnaireRoot = documentRef.getElementById('questionnaireRenderRoot');
  const reviewId = resolveReviewId(documentRef);

  if (!(questionnaireRoot instanceof HTMLElement) || !store?.subscribe || !reviewId) {
    return {
      destroy() {},
    };
  }

  const panelState = {
    loading: true,
    errorMessage: '',
    savingKey: '',
    plans: [],
    summary: {
      planCount: 0,
      caseCount: 0,
      runCount: 0,
      completedRunCount: 0,
    },
    draftsByCaseKey: {},
    messageByCaseKey: {},
  };
  const cleanup = [];
  let destroyed = false;

  const render = () => {
    if (destroyed) {
      return;
    }

    const state = store.getState();
    const panels = Array.from(questionnaireRoot.querySelectorAll(PANEL_SELECTOR));

    panels.forEach((panel) => {
      if (!(panel instanceof HTMLElement)) {
        return;
      }

      if (panel.dataset.testRunPanel === 'main') {
        panel.innerHTML = createMainPanelMarkup({ panelState, state });
        return;
      }

      if (panel.dataset.testRunPanel === 'criterion-summary') {
        const criterionCode = panel.dataset.criterionCode;
        if (!criterionCode) {
          return;
        }

        panel.innerHTML = createCriterionSummaryMarkup({ criterionCode, panelState });
      }
    });
  };

  const load = async () => {
    panelState.loading = true;
    panelState.errorMessage = '';
    render();

    try {
      const response = await listReviewTestRuns(reviewId);
      if (destroyed) {
        return;
      }

      panelState.loading = false;
      panelState.plans = Array.isArray(response?.plans) ? response.plans : [];
      panelState.summary = response?.summary ?? panelState.summary;
      panelState.draftsByCaseKey = {};
      dispatchTestRunSync(documentRef, panelState.plans);
      render();
    } catch (error) {
      if (destroyed) {
        return;
      }

      panelState.loading = false;
      panelState.errorMessage =
        error instanceof Error ? error.message : 'Failed to load linked test runs.';
      dispatchTestRunSync(documentRef, []);
      render();
    }
  };

  const handleDraftMutation = (event) => {
    const control = event.target;

    if (
      !(control instanceof HTMLInputElement) &&
      !(control instanceof HTMLTextAreaElement) &&
      !(control instanceof HTMLSelectElement)
    ) {
      return;
    }

    if (!control.dataset.testRunField) {
      return;
    }

    const caseCard = control.closest('[data-test-run-case-key]');

    if (!(caseCard instanceof HTMLElement)) {
      return;
    }

    const caseKey = caseCard.dataset.testRunCaseKey;

    if (!caseKey) {
      return;
    }

    panelState.draftsByCaseKey = {
      ...panelState.draftsByCaseKey,
      [caseKey]: captureCaseDraft(caseCard),
    };
  };

  const handleClick = async (event) => {
    const actionTarget =
      event.target instanceof HTMLElement ? event.target.closest('[data-test-run-save]') : null;

    if (!(actionTarget instanceof HTMLButtonElement)) {
      return;
    }

    const caseKey = actionTarget.dataset.testRunSave;
    const caseCard = actionTarget.closest('[data-test-run-case-key]');

    if (!caseKey || !(caseCard instanceof HTMLElement) || panelState.savingKey) {
      return;
    }

    const payload = collectCasePayload(caseCard);

    panelState.savingKey = caseKey;
    panelState.messageByCaseKey = {
      ...panelState.messageByCaseKey,
      [caseKey]: 'Saving run…',
    };
    render();

    try {
      await saveReviewTestRun(reviewId, payload);
      panelState.messageByCaseKey = {
        ...panelState.messageByCaseKey,
        [caseKey]: 'Run saved.',
      };
      panelState.savingKey = '';
      await load();
    } catch (error) {
      panelState.savingKey = '';
      panelState.messageByCaseKey = {
        ...panelState.messageByCaseKey,
        [caseKey]: error instanceof Error ? error.message : 'Failed to save the test run.',
      };
      render();
    }
  };

  documentRef.addEventListener('input', handleDraftMutation);
  documentRef.addEventListener('change', handleDraftMutation);
  documentRef.addEventListener('click', handleClick);
  cleanup.push(() => {
    documentRef.removeEventListener('input', handleDraftMutation);
    documentRef.removeEventListener('change', handleDraftMutation);
    documentRef.removeEventListener('click', handleClick);
  });

  const unsubscribe = store.subscribe(
    () => {
      render();
    },
    { immediate: true },
  );
  cleanup.push(unsubscribe);

  queueMicrotask(() => {
    load();
  });

  return {
    destroy() {
      destroyed = true;
      dispatchTestRunSync(documentRef, []);
      cleanup.splice(0).forEach((dispose) => dispose());
    },
  };
};

export { TEST_RUN_SYNC_EVENT };
