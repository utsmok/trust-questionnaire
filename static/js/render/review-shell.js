import { clearChildren, getDocumentRef } from '../utils/shared.js';

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

const REVIEW_SAVE_STATE_LABELS = Object.freeze({
  clean: 'Clean',
  dirty: 'Unsaved edits',
  saving: 'Saving',
  saved: 'Saved',
  save_failed: 'Save failed',
  conflict: 'Conflict',
  offline_unsaved: 'Offline unsaved',
});

const getReviewSaveStateLabel = (saveState) =>
  REVIEW_SAVE_STATE_LABELS[saveState] ?? REVIEW_SAVE_STATE_LABELS.clean;

const formatAssignmentLabel = (label, user) => `${label}: ${user?.displayName ?? '—'}`;

const formatAssignmentSummary = (review) =>
  [
    formatAssignmentLabel('P', review.assignmentUsers?.primaryEvaluator),
    formatAssignmentLabel('2R', review.assignmentUsers?.secondReviewer),
    formatAssignmentLabel('D', review.assignmentUsers?.decisionParticipant),
  ].join(' · ');

const formatEditableScope = (review) => {
  const editableSectionIds = review?.workflowAuthority?.editableSectionIds ?? [];

  return editableSectionIds.length > 0 ? editableSectionIds.join(', ') : 'Read-only';
};

const formatActorSummary = (review) => {
  const currentUser = review?.workflowAuthority?.currentUser ?? null;

  if (!currentUser) {
    return '—';
  }

  const assignmentRoles = Array.isArray(currentUser.assignmentRoles)
    ? currentUser.assignmentRoles.join(', ')
    : [];

  return [currentUser.globalRole, ...assignmentRoles].filter(Boolean).join(' · ') || '—';
};

const renderReviewShellNotice = (persistence = null) => {
  if (!persistence) {
    return '';
  }

  if (persistence.status === 'conflict') {
    return `
      <div class="dashboard-inline-notice review-shell-notice is-conflict" data-review-save-banner="conflict" role="alert">
        <p class="review-shell-notice-text">
          <strong>Conflict detected.</strong>
          The server now has a newer saved review${
            persistence.conflictReview?.currentRevisionNumber
              ? ` (rev ${escapeHtml(persistence.conflictReview.currentRevisionNumber)})`
              : ''
          }. Your local unsaved edits remain in memory in this tab only. Copy any needed text before reloading the authoritative server version.
        </p>
        <div class="dashboard-action-row">
          <button type="button" class="nav-button" data-review-reload-server>Reload server version</button>
        </div>
      </div>
    `;
  }

  if (persistence.status === 'save_failed' || persistence.status === 'offline_unsaved') {
    return `
      <div class="dashboard-inline-notice review-shell-notice" data-review-save-banner="${escapeHtml(
        persistence.status,
      )}" role="status">
        <p class="review-shell-notice-text">
          <strong>${escapeHtml(getReviewSaveStateLabel(persistence.status))}.</strong>
          ${escapeHtml(
            persistence.errorMessage ||
              'The latest save attempt was not accepted by the server. Local edits remain in memory until a retry succeeds.',
          )}
        </p>
        <div class="dashboard-action-row">
          <button type="button" class="nav-button" data-review-save-retry>Retry save</button>
        </div>
      </div>
    `;
  }

  return '';
};

const renderReviewShellPersistenceCells = (review, persistence = null) => {
  if (!persistence) {
    return `
      <div class="review-shell-meta-cell">
        <span class="review-shell-meta-label">Updated</span>
        <span class="review-shell-meta-value">${escapeHtml(
          formatDateTime(review.updatedAt || review.createdAt),
        )}</span>
      </div>
      <div class="review-shell-meta-cell">
        <span class="review-shell-meta-label">State schema</span>
        <span class="review-shell-meta-value">${escapeHtml(review.stateSchemaVersion)}</span>
      </div>
      <div class="review-shell-meta-cell">
        <span class="review-shell-meta-label">Framework</span>
        <span class="review-shell-meta-value">${escapeHtml(review.frameworkVersion)}</span>
      </div>
    `;
  }

  return `
    <div class="review-shell-meta-cell">
      <span class="review-shell-meta-label">Save state</span>
      <span class="review-shell-meta-value">
        <span class="review-shell-chip review-shell-save-chip" data-review-save-state="${escapeHtml(
          persistence.status,
        )}">${escapeHtml(getReviewSaveStateLabel(persistence.status))}</span>
      </span>
    </div>
    <div class="review-shell-meta-cell">
      <span class="review-shell-meta-label">Saved copy</span>
      <span class="review-shell-meta-value">${escapeHtml(
        formatDateTime(persistence.lastSavedAt || review.updatedAt || review.createdAt),
      )}</span>
    </div>
    <div class="review-shell-meta-cell">
      <span class="review-shell-meta-label">Server revision</span>
      <span class="review-shell-meta-value">${escapeHtml(
        `rev ${persistence.revisionNumber ?? review.currentRevisionNumber}`,
      )}</span>
    </div>
    <div class="review-shell-meta-cell">
      <span class="review-shell-meta-label">State schema</span>
      <span class="review-shell-meta-value">${escapeHtml(review.stateSchemaVersion)}</span>
    </div>
    <div class="review-shell-meta-cell">
      <span class="review-shell-meta-label">Framework</span>
      <span class="review-shell-meta-value">${escapeHtml(review.frameworkVersion)}</span>
    </div>
    <div class="review-shell-meta-cell">
      <span class="review-shell-meta-label">Assignments</span>
      <span class="review-shell-meta-value">${escapeHtml(formatAssignmentSummary(review))}</span>
    </div>
    <div class="review-shell-meta-cell">
      <span class="review-shell-meta-label">Editable now</span>
      <span class="review-shell-meta-value">${escapeHtml(formatEditableScope(review))}</span>
    </div>
    <div class="review-shell-meta-cell">
      <span class="review-shell-meta-label">Actor</span>
      <span class="review-shell-meta-value">${escapeHtml(formatActorSummary(review))}</span>
    </div>
  `;
};

export const renderReviewShellChrome = (
  root,
  {
    review,
    isWorkspace = false,
    overviewPath,
    workspacePath,
    activityPath,
    importExportPath,
    inboxPath,
    persistence = null,
    activeSubview = 'overview',
  },
) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  clearChildren(root);
  root.dataset.reviewShellSubview = activeSubview;

  root.innerHTML = `
    <div class="review-shell-stack">
      <div class="review-shell-band">
        <div class="review-shell-ident">
          <div class="review-shell-ident-main">
            <p class="review-shell-kicker">Review shell</p>
            <h1 class="review-shell-title">${escapeHtml(review.titleSnapshot || 'Untitled review')}</h1>
          </div>
          <div class="review-shell-tags">
            <span class="review-shell-chip">${escapeHtml(review.publicId || `R${review.id}`)}</span>
            <span class="review-shell-chip">${escapeHtml(review.workflowMode)}</span>
            <span class="review-shell-chip">${escapeHtml(review.lifecycleState)}</span>
            <span class="review-shell-chip">rev ${escapeHtml(review.currentRevisionNumber)}</span>
            <a href="/help" class="review-shell-chip" data-route-link>Help</a>
          </div>
        </div>
        <div class="review-shell-meta-grid">
          ${renderReviewShellPersistenceCells(review, isWorkspace ? persistence : null)}
        </div>
        <nav class="review-shell-nav" aria-label="Review subviews">
          <a href="${escapeHtml(overviewPath)}" class="review-shell-link ${
            activeSubview === 'overview' ? 'is-active' : ''
          }" data-route-link ${activeSubview === 'overview' ? 'aria-current="page"' : ''}>Overview</a>
          <a href="${escapeHtml(workspacePath)}" class="review-shell-link ${
            activeSubview === 'workspace' ? 'is-active' : ''
          }" data-route-link ${activeSubview === 'workspace' ? 'aria-current="page"' : ''}>Workspace</a>
          <a href="${escapeHtml(activityPath)}" class="review-shell-link ${
            activeSubview === 'activity' ? 'is-active' : ''
          }" data-route-link ${activeSubview === 'activity' ? 'aria-current="page"' : ''}>Activity</a>
          <a href="${escapeHtml(inboxPath)}" class="review-shell-link ${
            activeSubview === 'review-inbox' ? 'is-active' : ''
          }" data-route-link ${activeSubview === 'review-inbox' ? 'aria-current="page"' : ''}>Review inbox</a>
          <a href="${escapeHtml(importExportPath)}" class="review-shell-link ${
            activeSubview === 'import-export' ? 'is-active' : ''
          }" data-route-link ${activeSubview === 'import-export' ? 'aria-current="page"' : ''}>Import / export</a>
        </nav>
      </div>
      ${isWorkspace ? renderReviewShellNotice(persistence) : ''}
    </div>
  `;
};
