import { clearChildren, getDocumentRef } from '../utils/shared.js';
import { getSectionDefinition } from '../config/sections.js';
import { buildTopicArticle } from './content-topic-blocks.js';

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const formatRoleLabel = (role) =>
  String(role ?? 'member')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (value) => value.toUpperCase());

const formatActorSummary = (review) => {
  const currentUser = review?.workflowAuthority?.currentUser ?? null;

  if (!currentUser) {
    return '—';
  }

  const assignmentRoles = Array.isArray(currentUser.assignmentRoles)
    ? currentUser.assignmentRoles.map((role) => formatRoleLabel(role))
    : [];

  return [formatRoleLabel(currentUser.globalRole), ...assignmentRoles].join(' · ') || '—';
};

const formatEditableScope = (review) => {
  const editableSectionIds = review?.workflowAuthority?.editableSectionIds ?? [];

  return editableSectionIds.length > 0 ? editableSectionIds.join(', ') : 'Read-only';
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

const getReviewSaveStateLabel = (value) => REVIEW_SAVE_STATE_LABELS[value] ?? 'Clean';

export const renderAppHeader = ({ headerNavMount, sessionMount, session, route }) => {
  const isAuthenticated = Boolean(session?.authenticated);
  const currentPath = route?.canonicalPath ?? route?.pathname ?? '/dashboard';
  const dashboardActive = currentPath === '/dashboard';
  const reviewsActive = currentPath === '/reviews' || currentPath.startsWith('/reviews/');
  const toolingActive = currentPath === '/tooling' || currentPath.startsWith('/tooling/');
  const settingsActive = currentPath.startsWith('/settings');
  const helpActive = currentPath === '/help';

  if (headerNavMount instanceof HTMLElement) {
    clearChildren(headerNavMount);
    headerNavMount.innerHTML = `
      <div class="app-header-nav" role="navigation" aria-label="Application routes">
        <a href="/dashboard" class="app-header-link ${dashboardActive ? 'is-active' : ''}" data-route-link>Dashboard</a>
        <a href="/reviews" class="app-header-link ${reviewsActive ? 'is-active' : ''}" data-route-link>Reviews</a>
        <a href="/tooling" class="app-header-link ${toolingActive ? 'is-active' : ''}" data-route-link>Tooling</a>
        <a href="/settings/profile" class="app-header-link ${settingsActive ? 'is-active' : ''}" data-route-link>Settings</a>
        <a href="/help" class="app-header-link ${helpActive ? 'is-active' : ''}" data-route-link>Help</a>
      </div>
    `;
  }

  if (sessionMount instanceof HTMLElement) {
    clearChildren(sessionMount);

    if (!isAuthenticated) {
      sessionMount.innerHTML = `
        <div class="app-session-panel is-anonymous">
          <span class="app-session-label">Auth</span>
          <span class="app-session-value">Sign-in required</span>
        </div>
      `;
      return;
    }

    const role = session.user?.roles?.[0] ?? 'member';
    sessionMount.innerHTML = `
      <div class="app-session-panel">
        <div class="app-session-meta">
          <span class="app-session-label">Session</span>
          <span class="app-session-value">${escapeHtml(session.user?.displayName ?? 'Authenticated user')}</span>
        </div>
        <span class="app-session-role">${escapeHtml(formatRoleLabel(role))}</span>
        <button type="button" class="nav-button" data-auth-logout>Logout</button>
      </div>
    `;
  }
};

export const renderAuthSurface = (
  root,
  { session, errorMessage = '', pendingUsername = '' } = {},
) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const documentRef = getDocumentRef(root);
  clearChildren(root);

  const login = session?.login ?? {
    mode: 'dev',
    method: 'POST',
    path: '/auth/login',
    allowedUsers: [],
  };
  const isDevMode = login.mode === 'dev' && Array.isArray(login.allowedUsers);

  root.innerHTML = `
    <div class="app-surface auth-surface" data-app-surface="auth">
      <section class="dashboard-section auth-panel">
        <p class="dashboard-kicker">Authenticated entry</p>
        <h1 class="dashboard-title">Sign in to the review application</h1>
        <p class="dashboard-description">The routed app shell owns dashboard and review-shell entry. The questionnaire remains available on the compatibility path, but saved-review work begins here.</p>
        ${errorMessage ? `<div class="dashboard-inline-notice">${escapeHtml(errorMessage)}</div>` : ''}
        ${
          isDevMode
            ? `
              <div class="auth-user-grid">
                ${login.allowedUsers
                  .map(
                    (user) => `
                      <div class="auth-user-row">
                        <div class="auth-user-meta">
                          <div class="auth-user-name">${escapeHtml(user.displayName)}</div>
                          <div class="auth-user-detail">${escapeHtml(user.email)} · ${escapeHtml(user.role)}</div>
                          <div class="auth-user-detail">login key: ${escapeHtml(user.username)}</div>
                        </div>
                        <button
                          type="button"
                          class="nav-button"
                          data-auth-login-username="${escapeHtml(user.username)}"
                          ${pendingUsername === user.username ? 'disabled' : ''}
                        >${pendingUsername === user.username ? 'Signing in' : 'Use account'}</button>
                      </div>
                    `,
                  )
                  .join('')}
              </div>
            `
            : `
              <div class="auth-oidc-panel">
                <p class="dashboard-section-note">OIDC mode is configured through the backend descriptor. Continue through the institutional sign-in endpoint.</p>
                <a class="nav-button auth-oidc-link" href="${escapeHtml(login.path ?? '/auth/login')}">Open sign-in</a>
              </div>
            `
        }
      </section>
    </div>
  `;

  documentRef.body.dataset.appSurface = 'auth';
};

export const renderLoadFailureSurface = (root, { title, message }) => {
  if (!(root instanceof HTMLElement)) {
    return;
  }

  const documentRef = getDocumentRef(root);
  clearChildren(root);

  root.innerHTML = `
    <div class="app-surface auth-surface" data-app-surface="failure">
      <section class="dashboard-section auth-panel">
        <p class="dashboard-kicker">Route status</p>
        <h1 class="dashboard-title">${escapeHtml(title)}</h1>
        <div class="dashboard-inline-notice">${escapeHtml(message)}</div>
        <div class="dashboard-action-row">
          <a href="/dashboard" class="nav-button" data-route-link>Return to dashboard</a>
        </div>
      </section>
    </div>
  `;

  documentRef.body.dataset.appSurface = 'failure';
};

export const renderWorkspaceHeaderMeta = (
  mount,
  { review = null, persistence = null, currentPageId = null } = {},
) => {
  if (!(mount instanceof HTMLElement)) {
    return;
  }

  clearChildren(mount);

  if (!review) {
    return;
  }

  const sectionDefinition = getSectionDefinition(currentPageId);
  const sectionLabel = sectionDefinition
    ? `${sectionDefinition.pageCode} · ${sectionDefinition.title}`
    : '—';
  const saveState = persistence?.status
    ? getReviewSaveStateLabel(persistence.status)
    : 'Saved copy';

  mount.innerHTML = `
    <div class="workspace-status-item">
      <span class="workspace-status-label">Review</span>
      <span class="workspace-status-value">${escapeHtml(review.publicId || `R${review.id}`)}</span>
    </div>
    <div class="workspace-status-item">
      <span class="workspace-status-label">Lifecycle</span>
      <span class="workspace-status-value">${escapeHtml(review.lifecycleState)}</span>
    </div>
    <div class="workspace-status-item">
      <span class="workspace-status-label">Section</span>
      <span class="workspace-status-value">${escapeHtml(sectionLabel)}</span>
    </div>
    <div class="workspace-status-item">
      <span class="workspace-status-label">Actor</span>
      <span class="workspace-status-value">${escapeHtml(formatActorSummary(review))}</span>
    </div>
    <div class="workspace-status-item">
      <span class="workspace-status-label">Edit scope</span>
      <span class="workspace-status-value">${escapeHtml(formatEditableScope(review))}</span>
    </div>
    <div class="workspace-status-item">
      <span class="workspace-status-label">Save</span>
      <span class="workspace-status-value">
        <span class="review-shell-chip review-shell-save-chip" ${
          persistence?.status ? `data-workspace-save-state="${escapeHtml(persistence.status)}"` : ''
        }>${escapeHtml(saveState)}</span>
      </span>
    </div>
  `;
};

const appendLinkedPages = (documentRef, topicSection, relatedPages = []) => {
  if (!Array.isArray(relatedPages) || relatedPages.length === 0) {
    return;
  }

  const label = documentRef.createElement('p');
  const list = documentRef.createElement('div');

  label.className = 'context-block-label';
  label.textContent = 'Linked pages';
  list.className = 'about-topic-pages';

  relatedPages.forEach((page) => {
    const item = documentRef.createElement('span');
    item.className = 'about-topic-page';
    item.dataset.accentKey = page.accentKey ?? 'control';
    item.textContent = `${page.pageCode} ${page.title}`;
    list.appendChild(item);
  });

  topicSection.append(label, list);
};

const createShortcutTable = (documentRef, shortcuts = []) => {
  const table = documentRef.createElement('table');
  const tbody = documentRef.createElement('tbody');

  table.className = 'score-table';

  shortcuts.forEach((shortcut) => {
    const row = documentRef.createElement('tr');
    const comboCell = documentRef.createElement('td');
    const descriptionCell = documentRef.createElement('td');

    comboCell.textContent = shortcut.combos.join(' / ');
    descriptionCell.textContent = shortcut.description;
    row.append(comboCell, descriptionCell);
    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  return table;
};

export const renderHelpSurface = (root, viewModel) => {
  const documentRef = getDocumentRef(root);

  if (!(root instanceof HTMLElement)) {
    return;
  }

  clearChildren(root);
  root.dataset.appSurface = 'help';

  const surface = documentRef.createElement('div');
  const lead = documentRef.createElement('section');
  const overview = documentRef.createElement('section');
  const guidance = documentRef.createElement('section');
  const reference = documentRef.createElement('section');
  const about = documentRef.createElement('section');

  surface.className = 'app-surface dashboard-surface';
  surface.dataset.appSurface = 'help';

  lead.className = 'dashboard-section dashboard-lead';
  lead.innerHTML = `
    <div>
      <p class="dashboard-kicker">Shared content architecture</p>
      <h1 class="dashboard-title">${escapeHtml(viewModel.title)}</h1>
      <p class="dashboard-description">${escapeHtml(viewModel.description)}</p>
    </div>
  `;

  overview.className = 'dashboard-section';
  const overviewTitle = documentRef.createElement('h2');
  const overviewGrid = documentRef.createElement('div');
  const shortcutsCard = documentRef.createElement('section');

  overviewTitle.className = 'dashboard-section-title';
  overviewTitle.textContent = 'How the shared content is organized';
  overviewGrid.className = 'reference-cards';

  viewModel.overviewSections.forEach((topic) => {
    overviewGrid.appendChild(
      buildTopicArticle(documentRef, topic, {
        className: 'mini-card',
        headingLevel: 'h3',
        showSourceList: false,
      }),
    );
  });

  viewModel.legendCards.forEach((card) => {
    const cardSection = documentRef.createElement('section');
    const title = documentRef.createElement('h3');
    const body = documentRef.createElement('p');
    const chipRow = documentRef.createElement('div');

    cardSection.className = 'mini-card';
    title.textContent = card.title;
    body.textContent = card.body;
    chipRow.className = 'chips';

    card.chips.forEach((chipDefinition) => {
      const chip = documentRef.createElement('span');
      chip.className = 'chip';
      chip.textContent = chipDefinition.label;
      Object.entries(chipDefinition.dataset ?? {}).forEach(([key, value]) => {
        chip.dataset[key] = value;
      });
      chipRow.appendChild(chip);
    });

    cardSection.append(title, body, chipRow);
    overviewGrid.appendChild(cardSection);
  });

  shortcutsCard.className = 'mini-card';
  const shortcutsTitle = documentRef.createElement('h3');
  const shortcutsBody = documentRef.createElement('p');
  shortcutsTitle.textContent = 'Global keyboard shortcuts';
  shortcutsBody.textContent =
    'Shortcut descriptions are generated from the active registry introduced in Wave 4, so the help route and workspace legend stay aligned.';
  shortcutsCard.append(
    shortcutsTitle,
    shortcutsBody,
    createShortcutTable(documentRef, viewModel.shortcuts),
  );
  overviewGrid.appendChild(shortcutsCard);
  overview.append(overviewTitle, overviewGrid);

  guidance.className = 'dashboard-section';
  guidance.innerHTML = '<h2 class="dashboard-section-title">Page guidance topics</h2>';
  viewModel.guidanceTopics.forEach((topic) => {
    const topicSection = buildTopicArticle(documentRef, topic, {
      className: 'mini-card',
      headingLevel: 'h3',
      introKicker: topic.kicker,
    });
    appendLinkedPages(documentRef, topicSection, topic.relatedPages);
    guidance.appendChild(topicSection);
  });

  reference.className = 'dashboard-section';
  reference.innerHTML = '<h2 class="dashboard-section-title">Reference topics</h2>';
  viewModel.referenceTopics.forEach((topic) => {
    reference.appendChild(
      buildTopicArticle(documentRef, topic, {
        className: 'mini-card',
        headingLevel: 'h3',
        introKicker: topic.code,
      }),
    );
  });

  about.className = 'dashboard-section';
  about.innerHTML = '<h2 class="dashboard-section-title">About TRUST</h2>';
  viewModel.aboutTopics.forEach((topic) => {
    about.appendChild(
      buildTopicArticle(documentRef, topic, {
        className: 'mini-card',
        headingLevel: 'h3',
      }),
    );
  });

  surface.append(lead, overview, guidance, reference, about);
  root.appendChild(surface);
  documentRef.body.dataset.appSurface = 'help';
};
