import { clearChildren } from '../utils/shared.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const EVIDENCE_TYPE_OPTIONS = Object.freeze([
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'export', label: 'Tool export' },
  { value: 'document', label: 'Document / PDF' },
  { value: 'policy', label: 'Policy / terms' },
  { value: 'benchmark', label: 'Benchmark / source' },
  { value: 'other', label: 'Other' },
]);

const renderFeedback = (feedbackState) => {
  if (!feedbackState?.message) {
    return '';
  }

  return `
    <div class="dashboard-inline-notice" data-tone="${escapeHtml(feedbackState.tone || 'info')}">
      ${escapeHtml(feedbackState.message)}
    </div>
  `;
};

const renderTargetOptions = (options, selectedValue) => `
  <option value="">Select destination</option>
  ${options
    .map(
      (option) => `
        <option value="${escapeHtml(option.value)}" ${
          option.value === selectedValue ? 'selected' : ''
        }>${escapeHtml(option.label)}</option>
      `,
    )
    .join('')}
`;

const renderEvidenceTypeOptions = (selectedValue) =>
  EVIDENCE_TYPE_OPTIONS.map(
    (option) => `
      <option value="${escapeHtml(option.value)}" ${
        option.value === selectedValue ? 'selected' : ''
      }>${escapeHtml(option.label)}</option>
    `,
  ).join('');

const renderInboxCards = (viewModel) => {
  if (!viewModel.items.length) {
    return `
      <div class="dashboard-empty-state" data-review-inbox-empty>
        No unsorted extension captures are waiting in this review inbox.
      </div>
    `;
  }

  return viewModel.items
    .map(
      (item) => `
        <article class="dashboard-review-card" data-review-inbox-item="${escapeHtml(item.linkId)}">
          <div class="dashboard-review-headline-row">
            <div>
              <h3 class="dashboard-review-title">${escapeHtml(item.name)}</h3>
              <p class="dashboard-review-meta">
                Captured ${escapeHtml(item.capturedLabel)} · Linked ${escapeHtml(item.linkedLabel)}
              </p>
            </div>
            <div class="dashboard-action-row">
              <span class="review-shell-chip">INBOX</span>
              ${
                item.downloadUrl
                  ? `<a class="nav-button" href="${escapeHtml(item.downloadUrl)}" target="_blank" rel="noreferrer noopener">Download</a>`
                  : ''
              }
            </div>
          </div>

          <dl class="review-overview-facts review-overview-inline-facts">
            <div><dt>Evidence type</dt><dd>${escapeHtml(item.evidenceType)}</dd></div>
            <div><dt>Origin title</dt><dd>${escapeHtml(item.originTitle || '—')}</dd></div>
            <div><dt>Browser</dt><dd>${escapeHtml(item.browserLabel || '—')}</dd></div>
            <div><dt>Extension</dt><dd>${escapeHtml(item.extensionVersion || '—')}</dd></div>
          </dl>

          ${
            item.originUrl
              ? `<p class="dashboard-review-meta"><a href="${escapeHtml(item.originUrl)}" target="_blank" rel="noreferrer noopener">${escapeHtml(item.originUrl)}</a></p>`
              : ''
          }
          ${
            item.selectionText
              ? `<div class="settings-inline-note"><strong>Selected text</strong><br />${escapeHtml(item.selectionText)}</div>`
              : ''
          }

          <form class="settings-form review-inbox-form" data-review-inbox-form="${escapeHtml(item.linkId)}">
            <div class="settings-grid">
              <label class="settings-field">
                <span class="settings-label">Move to</span>
                <select name="target">
                  ${renderTargetOptions(item.targetOptions, item.defaultTargetValue)}
                </select>
              </label>
              <label class="settings-field">
                <span class="settings-label">Evidence type</span>
                <select name="evidenceType">
                  ${renderEvidenceTypeOptions(item.evidenceType)}
                </select>
              </label>
              <label class="settings-field settings-field--wide">
                <span class="settings-label">Note</span>
                <textarea name="note" rows="3">${escapeHtml(item.note)}</textarea>
              </label>
            </div>
            <div class="dashboard-action-row">
              <button type="submit" class="nav-button">Move from inbox</button>
            </div>
          </form>
        </article>
      `,
    )
    .join('');
};

export const renderReviewInboxSurface = (root, viewModel) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  clearChildren(root);

  root.innerHTML = `
    <div class="app-surface review-inbox-surface" data-app-surface="review-inbox">
      <section class="dashboard-section">
        <div class="dashboard-section-heading-row">
          <div>
            <p class="dashboard-kicker">Review shell</p>
            <h1 class="dashboard-title">Review inbox</h1>
          </div>
          <p class="dashboard-section-note">
            Explicit extension captures land here when the reviewer chooses inbox routing.
            Triage reuses the same evidence link records and moves them into review-level or
            criterion-level evidence.
          </p>
        </div>
        <div class="dashboard-summary-strip">
          <div class="dashboard-summary-card">
            <div class="dashboard-summary-value">${escapeHtml(viewModel.summary.itemCount)}</div>
            <div class="dashboard-summary-label">Inbox items</div>
          </div>
          <div class="dashboard-summary-card">
            <div class="dashboard-summary-value">${escapeHtml(viewModel.summary.targetCount)}</div>
            <div class="dashboard-summary-label">Valid destinations</div>
          </div>
        </div>
        ${renderFeedback(viewModel.feedbackState)}
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-heading-row">
          <h2 class="dashboard-section-title">Inbox queue</h2>
          <p class="dashboard-section-note">
            Move each item deliberately. Invalid or read-only destinations are not offered here.
          </p>
        </div>
        <div class="dashboard-review-list" data-review-inbox-list>
          ${renderInboxCards(viewModel)}
        </div>
      </section>
    </div>
  `;
};
