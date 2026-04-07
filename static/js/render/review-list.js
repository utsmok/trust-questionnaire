const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatTimestamp = (value) => {
  const timestamp = Date.parse(value ?? '');

  if (!Number.isFinite(timestamp)) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp);
};

export const createReviewListMarkup = ({ reviews = [] } = {}) => {
  if (!reviews.length) {
    return `
      <div class="dashboard-empty-state" data-dashboard-empty-state>
        <h3>No matching reviews</h3>
        <p>Adjust the filter set or create a new review record.</p>
      </div>
    `;
  }

  const rows = reviews
    .map(
      (review) => `
        <tr>
          <td class="review-list-code">${escapeHtml(review.publicId || review.id)}</td>
          <td>
            <div class="review-list-title">${escapeHtml(review.titleSnapshot || 'Untitled review')}</div>
            <div class="review-list-subtitle">Owner ${escapeHtml(
              review.createdByUserId,
            )} · schema ${escapeHtml(review.stateSchemaVersion)}</div>
          </td>
          <td><span class="review-list-chip">${escapeHtml(review.workflowMode)}</span></td>
          <td><span class="review-list-chip">${escapeHtml(review.lifecycleState)}</span></td>
          <td class="review-list-code">r${escapeHtml(review.currentRevisionNumber)}</td>
          <td>${escapeHtml(formatTimestamp(review.updatedAt || review.createdAt))}</td>
          <td>
            <div class="review-list-actions">
              <button type="button" class="nav-button" data-review-open-overview="${escapeHtml(
                review.id,
              )}">Open</button>
              <button type="button" class="nav-button" data-review-continue="${escapeHtml(
                review.id,
              )}">Continue</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join('');

  return `
    <div class="review-list-shell">
      <table class="review-list-table">
        <thead>
          <tr>
            <th scope="col">Public id</th>
            <th scope="col">Review</th>
            <th scope="col">Workflow</th>
            <th scope="col">Lifecycle</th>
            <th scope="col">Rev</th>
            <th scope="col">Updated</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
};
