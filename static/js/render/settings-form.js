import { clearChildren, getDocumentRef } from '../utils/shared.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const renderSaveBanner = (saveState) => {
  if (!saveState?.status || saveState.status === 'idle') {
    return '';
  }

  const isError = saveState.status === 'error';
  const message =
    saveState.message ||
    (saveState.status === 'saving'
      ? 'Saving preferences…'
      : saveState.status === 'saved'
        ? 'Preferences saved.'
        : 'Preference update failed.');

  return `
    <div class="${isError ? 'dashboard-inline-notice' : 'settings-inline-notice'}" data-settings-save-state="${escapeHtml(saveState.status)}">
      ${escapeHtml(message)}
    </div>
  `;
};

const renderUserFacts = (viewModel) => {
  const user = viewModel.user;

  if (!user) {
    return '';
  }

  return `
    <div class="settings-account-card">
      <h3>Current account</h3>
      <dl class="review-overview-facts">
        <div><dt>Name</dt><dd>${escapeHtml(user.displayName)}</dd></div>
        <div><dt>Email</dt><dd>${escapeHtml(user.email)}</dd></div>
        <div><dt>Affiliation</dt><dd>${escapeHtml(user.affiliation || '—')}</dd></div>
        <div><dt>Roles</dt><dd>${escapeHtml((user.roles ?? []).join(', ') || '—')}</dd></div>
      </dl>
    </div>
  `;
};

const renderProfileForm = (viewModel) => `
  <form class="settings-form" data-settings-form="settings-profile">
    <div class="settings-form-grid settings-form-grid--wide">
      <label class="dashboard-field">
        <span class="dashboard-field-label">Default reviewer affiliation</span>
        <input
          class="dashboard-input"
          type="text"
          name="defaultAffiliationText"
          value="${escapeHtml(viewModel.preferences.defaultAffiliationText)}"
          placeholder="University of Twente / department / unit"
        />
      </label>
      <label class="dashboard-field settings-field-span-full">
        <span class="dashboard-field-label">Default reviewer signature</span>
        <textarea
          class="dashboard-input settings-textarea"
          name="defaultReviewerSignature"
          rows="5"
          placeholder="Reserved for later export/workflow templates; stored now through the existing profile preferences API."
        >${escapeHtml(viewModel.preferences.defaultReviewerSignature)}</textarea>
      </label>
    </div>
    <div class="settings-inline-note">
      New reviews seed reviewer name and email from the active session. Reviewer affiliation is seeded from this stored default when present, otherwise from the account affiliation. Existing saved reviews are never overwritten silently.
    </div>
    <div class="dashboard-action-row">
      <button type="submit" class="nav-button" data-settings-submit="profile">Save profile defaults</button>
    </div>
  </form>
`;

const renderApplicationForm = (viewModel) => `
  <form class="settings-form" data-settings-form="settings-application">
    <div class="settings-form-grid">
      <label class="dashboard-field">
        <span class="dashboard-field-label">Preferred density</span>
        <select class="dashboard-select" name="preferredDensity">
          ${viewModel.options.density
            .map(
              (option) => `
                <option value="${escapeHtml(option.value)}" ${
                  viewModel.preferences.preferredDensity === option.value ? 'selected' : ''
                }>${escapeHtml(option.label)}</option>
              `,
            )
            .join('')}
        </select>
      </label>
      <label class="dashboard-field">
        <span class="dashboard-field-label">Preferred time zone</span>
        <select class="dashboard-select" name="preferredTimeZone">
          ${viewModel.options.timeZones
            .map(
              (option) => `
                <option value="${escapeHtml(option.value)}" ${
                  viewModel.preferences.preferredTimeZone === option.value ? 'selected' : ''
                }>${escapeHtml(option.label)}</option>
              `,
            )
            .join('')}
        </select>
      </label>
      <label class="dashboard-field">
        <span class="dashboard-field-label">Default sidebar tab</span>
        <select class="dashboard-select" name="defaultSidebarTab">
          ${viewModel.options.sidebarTabs
            .map(
              (option) => `
                <option value="${escapeHtml(option.value)}" ${
                  viewModel.preferences.defaultSidebarTab === option.value ? 'selected' : ''
                }>${escapeHtml(option.label)}</option>
              `,
            )
            .join('')}
        </select>
      </label>
      <label class="settings-checkbox-field">
        <input
          type="checkbox"
          name="keyboardShortcutsCollapsed"
          value="true"
          ${viewModel.preferences.keyboardShortcutsCollapsed ? 'checked' : ''}
        />
        <span>Collapse the keyboard shortcut legend by default when the workspace loads.</span>
      </label>
    </div>
    <div class="settings-inline-note">
      Application settings stay outside review content. Density and sidebar defaults apply when the routed workspace loads; they do not change saved questionnaire answers.
    </div>
    <div class="dashboard-action-row">
      <button type="submit" class="nav-button" data-settings-submit="application">Save application settings</button>
    </div>
  </form>
`;

const renderCapturePairing = (viewModel) => {
  const pairing = viewModel.extension?.pairing ?? null;

  if (!pairing) {
    return `
      <div class="settings-inline-note">
        Generate a one-time pairing code from this page, then exchange it from the browser capture client. The pairing code is explicit and short-lived; it is never reused as a permanent credential.
      </div>
    `;
  }

  return `
    <section class="settings-pairing-card" data-extension-pairing-card>
      <h3>Pending pairing artifact</h3>
      <div class="settings-code-block" data-extension-pairing-code>${escapeHtml(pairing.pairingCode)}</div>
      <dl class="review-overview-facts">
        <div><dt>Created</dt><dd>${escapeHtml(pairing.createdAt)}</dd></div>
        <div><dt>Expires</dt><dd>${escapeHtml(pairing.expiresAt)}</dd></div>
        <div><dt>Scopes</dt><dd>${escapeHtml((pairing.scopes ?? []).join(', ') || '—')}</dd></div>
      </dl>
      <div class="settings-inline-note">
        This artifact pairs one extension session only. If you refresh the session list after exchange, this pending code is cleared from the settings surface.
      </div>
    </section>
  `;
};

const renderExtensionSessions = (viewModel) => {
  const sessions = viewModel.extension?.sessions ?? [];

  if (!sessions.length) {
    return `
      <div class="settings-inline-note" data-extension-empty-state>
        No active browser capture sessions are paired for this account.
      </div>
    `;
  }

  return `
    <div class="settings-session-list">
      ${sessions
        .map(
          (session) => `
            <section class="settings-session-row" data-extension-session-row="${escapeHtml(session.sessionId)}">
              <div class="settings-session-meta">
                <div class="settings-session-title">${escapeHtml(session.clientName || 'Browser capture client')}</div>
                <dl class="review-overview-facts review-overview-inline-facts">
                  <div><dt>Browser</dt><dd>${escapeHtml([session.browserName, session.browserVersion].filter(Boolean).join(' ') || '—')}</dd></div>
                  <div><dt>Extension</dt><dd>${escapeHtml(session.extensionVersion || '—')}</dd></div>
                  <div><dt>Paired</dt><dd>${escapeHtml(session.pairedAt || '—')}</dd></div>
                  <div><dt>Last seen</dt><dd>${escapeHtml(session.lastSeenAt || '—')}</dd></div>
                  <div><dt>Refresh expiry</dt><dd>${escapeHtml(session.refreshExpiresAt || '—')}</dd></div>
                  <div><dt>Scopes</dt><dd>${escapeHtml((session.scopes ?? []).join(', ') || '—')}</dd></div>
                </dl>
              </div>
              <div class="dashboard-action-row settings-session-actions">
                <button type="button" class="nav-button" data-extension-session-revoke="${escapeHtml(session.sessionId)}">Revoke session</button>
              </div>
            </section>
          `,
        )
        .join('')}
    </div>
  `;
};

const renderCaptureControls = (viewModel) => {
  const isLoading = Boolean(viewModel.extension?.loading);

  return `
    <section class="settings-capture-panel">
      <div class="settings-inline-note">
        Capture remains explicit and same-system aligned: the paired client can only attach evidence to an existing review target that is writable under the current workflow authority. No review creation, cookie reuse, or long-lived API keys are part of this flow.
      </div>
      <div class="settings-inline-note">
        Chromium pilot install path: load the unpacked extension from the repository <code>extension/</code> directory, then pair it here with the current app origin and a one-time code.
      </div>
      <div class="dashboard-action-row settings-actions-inline">
        <button type="button" class="nav-button" data-extension-pair-start ${isLoading ? 'disabled' : ''}>${
          isLoading ? 'Working…' : 'Generate pairing code'
        }</button>
        <button type="button" class="nav-button" data-extension-sessions-refresh ${
          isLoading ? 'disabled' : ''
        }>Refresh paired sessions</button>
      </div>
      ${renderCapturePairing(viewModel)}
      <section class="settings-pairing-card">
        <h3>Active paired sessions</h3>
        ${renderExtensionSessions(viewModel)}
      </section>
    </section>
  `;
};

export const renderSettingsSurface = (root, viewModel) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const documentRef = getDocumentRef(root);
  clearChildren(root);

  root.innerHTML = `
    <div class="app-surface settings-surface" data-app-surface="${escapeHtml(viewModel.routeName)}">
      <section class="dashboard-section">
        <div class="dashboard-section-heading-row">
          <div>
            <p class="dashboard-kicker">Application shell</p>
            <h1 class="dashboard-title">${escapeHtml(viewModel.title)}</h1>
          </div>
          <p class="dashboard-section-note">${escapeHtml(viewModel.description)}</p>
        </div>
        <nav class="settings-tab-nav" aria-label="Settings routes">
          ${viewModel.tabs
            .map(
              (tab) => `
                <a href="${escapeHtml(tab.href)}" class="review-shell-link ${
                  tab.active ? 'is-active' : ''
                }" data-route-link>${escapeHtml(tab.label)}</a>
              `,
            )
            .join('')}
        </nav>
        ${renderSaveBanner(viewModel.saveState)}
      </section>

      <section class="dashboard-section settings-layout">
        ${renderUserFacts(viewModel)}
        <div class="settings-form-card">
          ${
            viewModel.routeName === 'settings-profile'
              ? renderProfileForm(viewModel)
              : viewModel.routeName === 'settings-capture'
                ? renderCaptureControls(viewModel)
                : renderApplicationForm(viewModel)
          }
        </div>
      </section>
    </div>
  `;

  documentRef.body.dataset.appSurface = viewModel.routeName;
};
