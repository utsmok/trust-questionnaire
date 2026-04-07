import { clearChildren, getDocumentRef } from '../utils/shared.js';
import { createReviewListMarkup } from './review-list.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

export const renderDashboardSurface = (root, viewModel) => {
  const documentRef = getDocumentRef(root);

  if (!(root instanceof HTMLElement)) {
    return;
  }

  clearChildren(root);

  root.dataset.appSurface = viewModel.surface;
  root.innerHTML = `
    <div class="app-surface dashboard-surface" data-app-surface="${escapeHtml(viewModel.surface)}">
      <section class="dashboard-section dashboard-lead">
        <div>
          <p class="dashboard-kicker">Saved review application</p>
          <h1 class="dashboard-title">${escapeHtml(viewModel.title)}</h1>
          <p class="dashboard-description">${escapeHtml(viewModel.description)}</p>
        </div>
        <div class="dashboard-summary-strip">
          ${viewModel.summary
            .map(
              (item) => `
                <div class="dashboard-summary-card">
                  <div class="dashboard-summary-value">${escapeHtml(item.value)}</div>
                  <div class="dashboard-summary-label">${escapeHtml(item.label)}</div>
                </div>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="dashboard-section dashboard-create-panel">
        <div class="dashboard-section-heading-row">
          <h2 class="dashboard-section-title">Create review</h2>
          <p class="dashboard-section-note">Default creation keeps the questionnaire in nomination mode until later workflow steps change it.</p>
        </div>
        <div class="dashboard-create-grid">
          <label class="dashboard-field">
            <span class="dashboard-field-label">Title snapshot</span>
            <input
              class="dashboard-input"
              type="text"
              name="dashboardCreateTitle"
              value="${escapeHtml(viewModel.createDraftTitle)}"
              placeholder="Tool short name or working label"
              data-dashboard-create-title
            />
          </label>
          <div class="dashboard-create-actions">
            <button type="button" class="nav-button" data-dashboard-create-review>Create review</button>
          </div>
        </div>
      </section>

      <section class="dashboard-section dashboard-review-list-panel">
        <div class="dashboard-section-heading-row">
          <h2 class="dashboard-section-title">Review queue</h2>
          <p class="dashboard-section-note">Search and filter operate on explicit workflow and lifecycle labels; nothing is hidden behind summary icons.</p>
        </div>

        <div class="dashboard-filter-grid">
          <label class="dashboard-field">
            <span class="dashboard-field-label">Search</span>
            <input
              class="dashboard-input"
              type="search"
              name="dashboardSearch"
              value="${escapeHtml(viewModel.filters.search)}"
              placeholder="Public id, title, workflow, lifecycle"
              data-dashboard-search
            />
          </label>

          <label class="dashboard-field">
            <span class="dashboard-field-label">Workflow</span>
            <select class="dashboard-select" name="workflowFilter" data-dashboard-workflow-filter>
              ${viewModel.workflowOptions
                .map(
                  (value) => `
                    <option value="${escapeHtml(value)}" ${
                      viewModel.filters.workflowFilter === value ? 'selected' : ''
                    }>${escapeHtml(value === 'all' ? 'All workflows' : value)}</option>
                  `,
                )
                .join('')}
            </select>
          </label>

          <label class="dashboard-field">
            <span class="dashboard-field-label">Lifecycle</span>
            <select class="dashboard-select" name="lifecycleFilter" data-dashboard-lifecycle-filter>
              ${viewModel.lifecycleOptions
                .map(
                  (value) => `
                    <option value="${escapeHtml(value)}" ${
                      viewModel.filters.lifecycleFilter === value ? 'selected' : ''
                    }>${escapeHtml(value === 'all' ? 'All lifecycle states' : value)}</option>
                  `,
                )
                .join('')}
            </select>
          </label>
        </div>

        ${
          viewModel.errorMessage
            ? `<div class="dashboard-inline-notice">${escapeHtml(viewModel.errorMessage)}</div>`
            : ''
        }
        ${createReviewListMarkup({ reviews: viewModel.filteredReviews })}
      </section>
    </div>
  `;

  documentRef.body.dataset.appSurface = viewModel.surface;
};
