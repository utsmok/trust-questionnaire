import { clearChildren } from '../utils/shared.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderExportRows = (exports) =>
  exports
    .map(
      (entry) => `
        <tr>
          <td class="review-list-code">${escapeHtml(entry.format.toUpperCase())}</td>
          <td>${escapeHtml(entry.status)}</td>
          <td>${escapeHtml(entry.createdLabel)}</td>
          <td>${escapeHtml(entry.byteSize)}</td>
          <td>
            <a href="${escapeHtml(entry.downloadUrl)}" class="nav-button" data-export-download="${escapeHtml(
              entry.jobId,
            )}">Download</a>
          </td>
        </tr>
      `,
    )
    .join('');

const renderImportRows = (imports) =>
  imports
    .map(
      (entry) => `
        <tr>
          <td class="review-list-code">${escapeHtml(entry.importClass)}</td>
          <td>${escapeHtml(entry.sourceFormat)}</td>
          <td>${escapeHtml(entry.createdLabel)}</td>
          <td>${escapeHtml(JSON.stringify(entry.summary ?? {}))}</td>
        </tr>
      `,
    )
    .join('');

export const renderImportExportSurface = (root, viewModel) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  clearChildren(root);

  root.innerHTML = `
    <div class="app-surface review-import-export-surface" data-app-surface="review-import-export">
      <section class="dashboard-section">
        <div class="dashboard-section-heading-row">
          <div>
            <p class="dashboard-kicker">Review shell</p>
            <h1 class="dashboard-title">Import and export</h1>
          </div>
          <p class="dashboard-section-note">Canonical review export is authoritative. Legacy browser-only continuity is limited to documented evidence-manifest import, exactly as frozen in the contract.</p>
        </div>
        <div class="review-overview-grid review-overview-summary-grid">
          <form data-export-form class="settings-form review-export-form">
            <h3>Export this review</h3>
            <div class="settings-grid">
              <label class="settings-field">
                <span class="settings-label">Format</span>
                <select name="format">
                  <option value="json">JSON</option>
                  <option value="zip">ZIP</option>
                </select>
              </label>
              <label class="settings-field">
                <span class="settings-label">Include evidence files</span>
                <select name="includeEvidenceFiles">
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>
              <label class="settings-field">
                <span class="settings-label">Include reporting CSV</span>
                <select name="includeReportingCsv">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
            </div>
            <div class="dashboard-action-row">
              <button type="submit" class="nav-button" data-export-submit>Create export</button>
              ${
                viewModel.exportState?.message
                  ? `<p class="dashboard-section-note" data-export-feedback>${escapeHtml(viewModel.exportState.message)}</p>`
                  : ''
              }
            </div>
          </form>

          <form data-legacy-import-form class="settings-form review-import-form">
            <h3>Import legacy evidence manifest</h3>
            <div class="settings-grid">
              <label class="settings-field settings-field--wide">
                <span class="settings-label">Manifest JSON</span>
                <textarea name="manifest" rows="7" data-legacy-import-manifest></textarea>
              </label>
            </div>
            <div class="dashboard-action-row">
              <button type="submit" class="nav-button" data-legacy-import-submit>Import legacy manifest</button>
              ${
                viewModel.importState?.legacyMessage
                  ? `<p class="dashboard-section-note" data-import-feedback>${escapeHtml(viewModel.importState.legacyMessage)}</p>`
                  : ''
              }
            </div>
          </form>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-heading-row">
          <h2 class="dashboard-section-title">Canonical package import</h2>
          <p class="dashboard-section-note">This creates a new review from a canonical exported package. Identifiers may be remapped on import; that is policy-compliant.</p>
        </div>
        <form data-canonical-import-form class="settings-form review-import-form">
          <div class="settings-grid">
            <label class="settings-field settings-field--wide">
              <span class="settings-label">Review export JSON</span>
              <textarea name="reviewExport" rows="7" data-canonical-import-json></textarea>
            </label>
          </div>
          <div class="dashboard-action-row">
            <button type="submit" class="nav-button" data-canonical-import-submit>Import canonical package</button>
            ${
              viewModel.importState?.canonicalMessage
                ? `<p class="dashboard-section-note" data-canonical-import-feedback>${escapeHtml(viewModel.importState.canonicalMessage)}</p>`
                : ''
            }
            ${
              viewModel.importState?.importedReviewPath
                ? `<a href="${escapeHtml(viewModel.importState.importedReviewPath)}" class="nav-button" data-route-link>Open imported review</a>`
                : ''
            }
          </div>
        </form>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-heading-row">
          <h2 class="dashboard-section-title">Export jobs</h2>
          <p class="dashboard-section-note">Jobs are completed immediately in this wave, but they are still recorded explicitly for traceability.</p>
        </div>
        <div class="review-list-shell">
          <table class="review-list-table">
            <thead>
              <tr><th>Fmt.</th><th>Status</th><th>Created</th><th>Bytes</th><th>Download</th></tr>
            </thead>
            <tbody data-export-list>
              ${renderExportRows(viewModel.exports)}
            </tbody>
          </table>
        </div>
      </section>

      <section class="dashboard-section">
        <div class="dashboard-section-heading-row">
          <h2 class="dashboard-section-title">Import history</h2>
          <p class="dashboard-section-note">Both review-scoped legacy imports and canonical package imports are recorded.</p>
        </div>
        <div class="review-list-shell">
          <table class="review-list-table">
            <thead>
              <tr><th>Class</th><th>Source</th><th>Imported</th><th>Summary</th></tr>
            </thead>
            <tbody data-import-list>
              ${renderImportRows(viewModel.imports)}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
};
