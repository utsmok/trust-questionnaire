import { clearChildren, getDocumentRef } from '../utils/shared.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderJumpAction = (jump, label, attribute) => {
  if (!jump) {
    return '';
  }

  return `
    <a
      href="${escapeHtml(jump.path)}"
      class="nav-button"
      data-route-link
      ${attribute ? `${attribute}="${escapeHtml(jump.pageId)}"` : ''}
    >${escapeHtml(label)}</a>
  `;
};

const renderSectionRows = (viewModel) =>
  viewModel.sectionJumps
    .map(
      (entry) => `
        <tr data-review-overview-jump-row="${escapeHtml(entry.pageId)}">
          <td class="review-list-code">${escapeHtml(entry.pageCode)}</td>
          <td>
            <div class="review-list-title">${escapeHtml(entry.title)}</div>
            <div class="review-list-subtitle">${escapeHtml(entry.progressLabel)} · ${escapeHtml(entry.requirementsLabel)}</div>
          </td>
          <td><span class="review-list-chip" data-progress-state="${escapeHtml(entry.progressState)}">${escapeHtml(entry.progressLabel)}</span></td>
          <td class="review-list-code">${escapeHtml(entry.requirementsLabel)}</td>
          <td>
            <a href="${escapeHtml(entry.path)}" class="nav-button" data-route-link data-review-overview-jump="${escapeHtml(entry.pageId)}">Open</a>
          </td>
        </tr>
      `,
    )
    .join('');

export const renderReviewOverviewSurface = (root, viewModel) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const documentRef = getDocumentRef(root);
  clearChildren(root);

  root.innerHTML = `
    <div class="app-surface review-overview-surface" data-app-surface="review-overview">
      <section class="dashboard-section review-overview-panel">
        <div class="dashboard-section-heading-row">
          <div>
            <p class="dashboard-kicker">Review shell</p>
            <h1 class="dashboard-title">Review overview</h1>
          </div>
          <p class="dashboard-section-note">Summary surface for review identity, saved-review state, progress, evidence coverage, and direct workspace entry. The questionnaire remains the primary work surface.</p>
        </div>
        <div class="review-overview-grid review-overview-summary-grid">
          <div class="review-overview-card">
            <h3>Identity and lifecycle</h3>
            <dl class="review-overview-facts">
              <div><dt>Public id</dt><dd>${escapeHtml(viewModel.review.publicId || `R${viewModel.review.id}`)}</dd></div>
              <div><dt>Title</dt><dd>${escapeHtml(viewModel.review.titleSnapshot || 'Untitled review')}</dd></div>
              <div><dt>Workflow</dt><dd>${escapeHtml(viewModel.review.workflowMode)}</dd></div>
              <div><dt>Lifecycle</dt><dd>${escapeHtml(viewModel.review.lifecycleState)}</dd></div>
              <div><dt>Created</dt><dd>${escapeHtml(viewModel.saveSummary.createdAt)}</dd></div>
              <div><dt>Updated</dt><dd>${escapeHtml(viewModel.saveSummary.updatedAt)}</dd></div>
            </dl>
          </div>
          <div class="review-overview-card">
            <h3>Saved review state</h3>
            <dl class="review-overview-facts">
              <div><dt>Server revision</dt><dd>rev ${escapeHtml(viewModel.saveSummary.revisionNumber)}</dd></div>
              <div><dt>State schema</dt><dd>${escapeHtml(viewModel.saveSummary.stateSchemaVersion)}</dd></div>
              <div><dt>Framework</dt><dd>${escapeHtml(viewModel.saveSummary.frameworkVersion)}</dd></div>
              <div><dt>Time zone</dt><dd>${escapeHtml(viewModel.saveSummary.timeZone)}</dd></div>
            </dl>
            <div class="dashboard-action-row">
              <a
                href="${escapeHtml(viewModel.resumeJump.path)}"
                class="nav-button"
                data-route-link
                data-review-overview-open-workspace
              >Open workspace</a>
            </div>
          </div>
          <div class="review-overview-card">
            <h3>Progress and evidence</h3>
            <dl class="review-overview-facts">
              <div><dt>Progress</dt><dd>${escapeHtml(viewModel.progressSummary.stateLabel)} · ${escapeHtml(viewModel.progressSummary.completionPercent)}%</dd></div>
              <div><dt>Resolved pages</dt><dd>${escapeHtml(viewModel.progressSummary.resolvedActiveSectionCount)}/${escapeHtml(viewModel.progressSummary.activeSectionCount)}</dd></div>
              <div><dt>Required fields</dt><dd>${escapeHtml(viewModel.progressSummary.satisfiedRequiredFieldCount)}/${escapeHtml(viewModel.progressSummary.applicableRequiredFieldCount)}</dd></div>
              <div><dt>Evidence items</dt><dd>${escapeHtml(viewModel.evidenceSummary.totalEvidenceItemCount)}</dd></div>
              <div><dt>Criteria with evidence</dt><dd>${escapeHtml(viewModel.evidenceSummary.criteriaWithEvidenceCount)}/${escapeHtml(viewModel.evidenceSummary.criteriaCount)}</dd></div>
              <div><dt>Evaluation folder</dt><dd>${escapeHtml(viewModel.evidenceSummary.evaluationFolderLinked ? 'Linked' : 'Missing')}</dd></div>
            </dl>
          </div>
          <div class="review-overview-card">
            <h3>Operational jump points</h3>
            <p class="review-overview-note">Use explicit route jumps when resuming. Attention and incomplete targets are derived from the current saved questionnaire state, not from ad-hoc bookmarks.</p>
            <div class="dashboard-action-row review-overview-action-row">
              ${renderJumpAction(viewModel.resumeJump, `Resume ${viewModel.resumeJump.pageCode}`, 'data-review-overview-resume')}
              ${renderJumpAction(viewModel.firstAttentionJump, `Attention ${viewModel.firstAttentionJump?.pageCode ?? ''}`, 'data-review-overview-attention')}
              ${renderJumpAction(viewModel.firstIncompleteJump, `Next incomplete ${viewModel.firstIncompleteJump?.pageCode ?? ''}`, 'data-review-overview-incomplete')}
            </div>
            <dl class="review-overview-facts review-overview-inline-facts">
              <div><dt>Recommendation</dt><dd>${escapeHtml(viewModel.recommendationSummary.selectedValue)}</dd></div>
              <div><dt>Positive recommendation lock</dt><dd>${escapeHtml(viewModel.recommendationSummary.positiveRecommendationLocked ? 'Yes' : 'No')}</dd></div>
              <div><dt>Unresolved escalations</dt><dd>${escapeHtml(viewModel.recommendationSummary.unresolvedEscalationCount)}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section class="dashboard-section review-overview-panel">
        <div class="dashboard-section-heading-row">
          <h2 class="dashboard-section-title">Workspace jump table</h2>
          <p class="dashboard-section-note">Accessible questionnaire sections only. Each row remains route-addressable under the review shell.</p>
        </div>
        <div class="review-list-shell">
          <table class="review-list-table review-overview-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">Section</th>
                <th scope="col">Progress</th>
                <th scope="col">Req.</th>
                <th scope="col">Jump</th>
              </tr>
            </thead>
            <tbody>
              ${renderSectionRows(viewModel)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;

  documentRef.body.dataset.appSurface = 'review-overview';
};
