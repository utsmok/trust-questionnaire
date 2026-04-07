import { clearChildren } from '../utils/shared.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderOptions = (options, selectedValue = '') =>
  options
    .map(
      (option) => `
        <option value="${escapeHtml(option.value)}" ${
          String(option.value) === String(selectedValue) ? 'selected' : ''
        }>${escapeHtml(option.label)}</option>
      `,
    )
    .join('');

const renderTimelineRows = (timeline) =>
  timeline
    .map((entry) => {
      if (entry.kind === 'comment') {
        return `
          <article class="dashboard-review-card" data-activity-entry="comment">
            <div class="dashboard-review-headline-row">
              <div>
                <h3 class="dashboard-review-title">Comment · ${escapeHtml(entry.scopeLabel)}</h3>
                <p class="dashboard-review-meta">${escapeHtml(entry.dateLabel)} · user ${escapeHtml(entry.createdByUserId)}</p>
              </div>
              <span class="review-shell-chip">comment</span>
            </div>
            <p class="dashboard-review-meta">${escapeHtml(entry.body)}</p>
          </article>
        `;
      }

      return `
        <article class="dashboard-review-card" data-activity-entry="audit_event">
          <div class="dashboard-review-headline-row">
            <div>
              <h3 class="dashboard-review-title">${escapeHtml(entry.eventType)}</h3>
              <p class="dashboard-review-meta">${escapeHtml(entry.dateLabel)} · ${escapeHtml(entry.scopeLabel)}</p>
            </div>
            <span class="review-shell-chip">audit</span>
          </div>
          <p class="dashboard-review-meta">${escapeHtml(entry.summary)}</p>
        </article>
      `;
    })
    .join('');

export const renderActivityLogSurface = (root, viewModel) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  clearChildren(root);

  root.innerHTML = `
    <div class="app-surface review-activity-surface" data-app-surface="review-activity">
      <section class="dashboard-section">
        <div class="dashboard-section-heading-row">
          <div>
            <p class="dashboard-kicker">Review shell</p>
            <h1 class="dashboard-title">Activity and comments</h1>
          </div>
          <p class="dashboard-section-note">Persisted comments plus auditable operational events for traceability. Comment scope is intentionally bounded to review, section, and criterion.</p>
        </div>
        <form data-comment-form class="settings-form review-activity-form">
          <div class="settings-grid">
            <label class="settings-field">
              <span class="settings-label">Scope</span>
              <select name="scopeType" data-comment-scope>
                ${renderOptions(viewModel.scopeOptions, viewModel.formState?.scopeType ?? 'review')}
              </select>
            </label>
            <label class="settings-field">
              <span class="settings-label">Section</span>
              <select name="sectionId" data-comment-section>
                <option value="">Select section</option>
                ${renderOptions(viewModel.sectionOptions, viewModel.formState?.sectionId ?? '')}
              </select>
            </label>
            <label class="settings-field">
              <span class="settings-label">Criterion</span>
              <select name="criterionCode" data-comment-criterion>
                <option value="">Select criterion</option>
                ${renderOptions(viewModel.criterionOptions, viewModel.formState?.criterionCode ?? '')}
              </select>
            </label>
            <label class="settings-field settings-field--wide">
              <span class="settings-label">Comment</span>
              <textarea name="body" rows="4" data-comment-body>${escapeHtml(
                viewModel.formState?.body ?? '',
              )}</textarea>
            </label>
          </div>
          <div class="dashboard-action-row">
            <button type="submit" class="nav-button" data-comment-submit>Add comment</button>
            ${
              viewModel.formState?.message
                ? `<p class="dashboard-section-note" data-comment-feedback>${escapeHtml(viewModel.formState.message)}</p>`
                : ''
            }
          </div>
        </form>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-heading-row">
          <h2 class="dashboard-section-title">Traceability feed</h2>
          <p class="dashboard-section-note">Newest first. Comments and operational events are shown together to keep the machine visible.</p>
        </div>
        <div class="dashboard-review-list" data-activity-timeline>
          ${renderTimelineRows(viewModel.timeline)}
        </div>
      </section>
    </div>
  `;
};
