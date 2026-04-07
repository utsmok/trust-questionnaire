const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatStatusLabel = (value) =>
  String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (part) => part.toUpperCase());

export const createTestSetListMarkup = ({ items = [] } = {}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return `
      <div class="dashboard-empty-state tooling-empty-state">
        <strong>No test sets yet.</strong>
        <p>Create the first reusable set to establish a stable published revision and review-link target.</p>
      </div>
    `;
  }

  return `
    <div class="review-list-shell tooling-list-shell">
      <table class="review-list-table tooling-list-table">
        <thead>
          <tr>
            <th>Set</th>
            <th>Status</th>
            <th>Draft</th>
            <th>Published</th>
            <th>Links</th>
            <th>Open</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
                <tr class="${item.active ? 'is-active' : ''}">
                  <td>
                    <div class="review-list-title">${escapeHtml(item.title)}</div>
                    <div class="review-list-subtitle">${escapeHtml(
                      item.ownerDisplayName || '—',
                    )} · ${escapeHtml(item.visibility)}</div>
                    <div class="review-list-subtitle">${escapeHtml(
                      item.description || 'No description recorded.',
                    )}</div>
                  </td>
                  <td>
                    <span class="review-list-chip">${escapeHtml(
                      formatStatusLabel(item.status),
                    )}</span>
                  </td>
                  <td>${
                    item.currentDraftRevision
                      ? `v${escapeHtml(item.currentDraftRevision.versionNumber)}`
                      : '—'
                  }</td>
                  <td>${
                    item.latestPublishedRevision
                      ? `v${escapeHtml(item.latestPublishedRevision.versionNumber)}`
                      : '—'
                  }</td>
                  <td>${escapeHtml(String(item.linkCount ?? 0))}</td>
                  <td>
                    <div class="review-list-actions">
                      <a
                        href="${escapeHtml(item.href)}"
                        class="nav-button ${item.active ? 'is-active' : ''}"
                        data-route-link
                      >
                        ${item.active ? 'Selected' : 'Open'}
                      </a>
                    </div>
                  </td>
                </tr>
              `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
};
