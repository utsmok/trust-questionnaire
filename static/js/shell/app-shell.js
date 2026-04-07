import { getSession, login, logout, updatePreferences } from '../api/session.js';
import { createReviewComment, getReviewActivity } from '../api/comments.js';
import { listReviewInbox, updateEvidenceLink } from '../api/evidence.js';
import {
  listExtensionSessions,
  revokeExtensionSession,
  startExtensionPairing,
} from '../api/extension.js';
import {
  createReviewExport,
  importCanonicalReviewPackage,
  importLegacyEvidenceManifest,
  listReviewExports,
  listReviewImports,
} from '../api/import-export.js';
import {
  archiveTestSet,
  createTestSet,
  forkTestSet,
  getTestSet,
  linkReviewTestPlan,
  listTestSets,
  publishTestSetRevision,
  updateTestSetDraft,
} from '../api/test-sets.js';
import { createReview, getReview, listReviews, saveReviewState } from '../api/reviews.js';
import { createDashboardViewModel } from '../pages/dashboard.js';
import { createImportExportViewModel } from '../pages/import-export.js';
import { createReviewInboxViewModel, parseReviewInboxTargetValue } from '../pages/review-inbox.js';
import { createReviewActivityViewModel } from '../pages/review-activity.js';
import { createReviewOverviewViewModel } from '../pages/review-overview.js';
import { createHelpViewModel } from '../pages/help.js';
import {
  SETTINGS_SURFACE_NAMES,
  createSettingsPatchFromForm,
  createSettingsViewModel,
} from '../pages/settings.js';
import {
  appendEmptyCaseToDraft,
  createEmptyToolingDraftState,
  createToolingDraftStateFromTestSet,
  createToolingViewModel,
  removeCaseFromDraft,
} from '../pages/tooling.js';
import { FIELD_IDS } from '../config/questionnaire-schema.js';
import { createEmptyEvaluationState } from '../state/derive.js';
import {
  buildDashboardPath,
  buildHelpPath,
  buildReviewActivityPath,
  buildReviewInboxPath,
  buildReviewImportExportPath,
  buildToolingPath,
  buildToolingTestSetPath,
  buildReviewOverviewPath,
  buildReviewWorkspacePath,
  createAppRouter,
  isDashboardRoute,
  isHelpRoute,
  isToolingRoute,
  isSettingsRoute,
  isReviewShellRoute,
  isWorkspaceRoute,
  parseAppRoute,
  resolveDefaultWorkspacePageId,
} from './routes.js';
import {
  renderAppHeader,
  renderAuthSurface,
  renderHelpSurface,
  renderLoadFailureSurface,
  renderWorkspaceHeaderMeta,
} from '../render/app-shell.js';
import { renderDashboardSurface } from '../render/dashboard.js';
import { renderActivityLogSurface } from '../render/activity-log.js';
import { renderImportExportSurface } from '../render/import-export.js';
import { renderReviewInboxSurface } from '../render/review-inbox.js';
import { renderReviewShellChrome } from '../render/review-shell.js';
import { renderReviewOverviewSurface } from '../render/review-overview.js';
import { renderSettingsSurface } from '../render/settings-form.js';
import { createTestSetEditorMarkup } from '../render/test-set-editor.js';
import { createTestSetListMarkup } from '../render/test-set-list.js';
import { areEvaluationStatesEqual, cloneEvaluationState } from '../state/store.js';
import { createReviewSaveQueue } from '../utils/save-queue.js';
import { clearChildren, getDocumentRef } from '../utils/shared.js';

const toNumericId = (value) => Number.parseInt(String(value ?? ''), 10);

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const getDom = (root) => {
  const documentRef = getDocumentRef(root);

  return {
    documentRef,
    windowRef: documentRef.defaultView ?? window,
    body: documentRef.body,
    appHeaderNavMount: documentRef.getElementById('appHeaderNavMount'),
    appSessionMount: documentRef.getElementById('appSessionMount'),
    workspaceStatusMount: documentRef.getElementById('workspaceStatusMount'),
    appViewMount: documentRef.getElementById('appViewMount'),
    reviewShellMount: documentRef.getElementById('reviewShellMount'),
    reviewShellStatusLiveRegion: documentRef.getElementById('reviewShellStatusLiveRegion'),
    trustShell: documentRef.getElementById('trustShell'),
  };
};

const REVIEW_SAVE_STATE_ANNOUNCEMENTS = Object.freeze({
  clean: 'All review changes are saved.',
  dirty: 'Review has unsaved local edits.',
  saving: 'Saving review changes to the server.',
  saved: 'Review changes saved to the server.',
  save_failed: 'Review save failed. Local edits remain in memory.',
  conflict:
    'Review save conflict detected. Reload the authoritative server version before saving again.',
  offline_unsaved: 'Review is offline. Local edits are not durably saved.',
});

const resolveSaveQueueTimings = (windowRef) => {
  const configured = windowRef.__TRUST_SAVE_QUEUE_TEST_CONFIG__;

  if (!configured || typeof configured !== 'object') {
    return undefined;
  }

  return configured;
};

const createWorkspaceRouteContext = ({ router, reviewId }) => ({
  getCurrentPageId({ windowRef }) {
    const route = parseAppRoute({
      pathname: windowRef.location.pathname,
      hash: windowRef.location.hash,
    });

    return route.reviewId === String(reviewId) ? route.pageId : null;
  },
  replaceLocationForPage({ pageId }) {
    router.replace(buildReviewWorkspacePath(reviewId, pageId));
  },
});

const readToolingDraftFromForm = (form, fallback = null) => {
  const draft = createEmptyToolingDraftState(fallback ?? {});

  if (!(form instanceof HTMLFormElement)) {
    return draft;
  }

  form.querySelectorAll('[data-tooling-field]').forEach((element) => {
    const field = element.dataset.toolingField;

    if (field) {
      draft[field] = element.value ?? '';
    }
  });

  draft.cases = [...form.querySelectorAll('[data-tooling-case-index]')].map((section, index) => {
    const caseEntry = {
      ordinal: index + 1,
      title: '',
      scenarioType: 'exploratory',
      instructionText: '',
      criterionCode: '',
      evidenceType: 'screenshot',
      expectedObservationType: '',
      notes: '',
    };

    section.querySelectorAll('[data-tooling-case-field]').forEach((element) => {
      const field = element.dataset.toolingCaseField;

      if (field) {
        caseEntry[field] = element.value ?? '';
      }
    });

    return caseEntry;
  });

  return draft;
};

const readToolingLinkFromForm = (form) => {
  const payload = {
    evaluationId: '',
    testSetRevisionId: '',
    role: 'baseline',
  };

  if (!(form instanceof HTMLFormElement)) {
    return payload;
  }

  form.querySelectorAll('[data-tooling-link-field]').forEach((element) => {
    const field = element.dataset.toolingLinkField;

    if (field) {
      payload[field] = element.value ?? '';
    }
  });

  return payload;
};

export const createAppShellController = async ({ root = document, mountWorkspace } = {}) => {
  const dom = getDom(root);
  const cleanup = [];
  const reviewCache = new Map();

  let session = null;
  let router = null;
  let workspaceHost = null;
  let dashboardFilters = {
    search: '',
    workflowFilter: 'all',
    lifecycleFilter: 'all',
  };
  let dashboardCreateTitle = '';
  let dashboardReviews = [];
  let dashboardErrorMessage = '';
  let activityFormState = null;
  let exportFeedbackState = null;
  let importFeedbackState = null;
  let reviewInboxFeedbackState = null;
  let settingsSaveState = {
    surface: SETTINGS_SURFACE_NAMES.PROFILE,
    status: 'idle',
    message: '',
  };
  let extensionCaptureState = {
    sessions: [],
    pairing: null,
    loading: false,
    loaded: false,
  };
  let isSigningInAs = '';
  let toolingTestSets = [];
  let toolingTestSetCache = new Map();
  let toolingReviews = [];
  let toolingCreateState = {
    title: '',
    description: '',
    purpose: '',
    visibility: 'team',
  };
  let toolingDraftState = null;
  let toolingDraftTestSetId = null;
  let toolingFeedbackState = null;

  const announceReviewSaveState = (persistenceState = null) => {
    if (!dom.reviewShellStatusLiveRegion) {
      return;
    }

    dom.reviewShellStatusLiveRegion.textContent = persistenceState
      ? (REVIEW_SAVE_STATE_ANNOUNCEMENTS[persistenceState.status] ?? '')
      : '';
  };

  const setSurfaceState = ({
    appSurface,
    reviewShellVisible = false,
    workspaceVisible = false,
  }) => {
    dom.body.dataset.appMode = 'shell';
    dom.body.dataset.appSurface = appSurface;
    dom.body.dataset.reviewShell = reviewShellVisible ? 'visible' : 'hidden';

    if (dom.reviewShellMount) {
      dom.reviewShellMount.hidden = !reviewShellVisible;
    }

    if (dom.appViewMount) {
      dom.appViewMount.hidden = appSurface === 'workspace';
    }

    if (dom.trustShell) {
      dom.trustShell.hidden = !workspaceVisible;
    }
  };

  const clearWorkspaceHeaderMeta = () => {
    renderWorkspaceHeaderMeta(dom.workspaceStatusMount);
  };

  const applySessionPreferences = (nextSession) => {
    const preferences = nextSession?.preferences ?? null;

    dom.body.dataset.preferredDensity = preferences?.preferredDensity ?? 'compact';
    dom.body.dataset.preferredTimeZone = preferences?.preferredTimeZone ?? 'UTC';
    dom.body.dataset.defaultSidebarTab = preferences?.defaultSidebarTab ?? 'guidance';
    dom.body.dataset.keyboardShortcutsCollapsed = preferences?.keyboardShortcutsCollapsed
      ? 'true'
      : 'false';
  };

  const createInitialReviewStateFromSession = () => {
    const evaluation = createEmptyEvaluationState();
    const fields = { ...(evaluation.fields ?? {}) };
    const reviewerAffiliation =
      session?.preferences?.defaultAffiliationText?.trim() || session?.user?.affiliation || '';

    if (session?.user?.displayName) {
      fields[FIELD_IDS.S0.REVIEWER_NAME] = session.user.displayName;
    }

    if (session?.user?.email) {
      fields[FIELD_IDS.S0.REVIEWER_EMAIL] = session.user.email;
    }

    if (reviewerAffiliation) {
      fields[FIELD_IDS.S0.REVIEWER_AFFILIATION] = reviewerAffiliation;
    }

    return {
      ...evaluation,
      fields,
    };
  };

  const destroyWorkspace = () => {
    if (workspaceHost) {
      workspaceHost.unsubscribe?.();
      workspaceHost.persistence?.destroy?.();
      workspaceHost.instance.destroy();
      workspaceHost = null;
    }

    announceReviewSaveState(null);
    clearWorkspaceHeaderMeta();
  };

  const updateCachedReview = (review) => {
    if (!review?.id) {
      return;
    }

    reviewCache.set(review.id, review);
    dashboardReviews = dashboardReviews.map((entry) =>
      entry.id === review.id
        ? {
            ...entry,
            ...review,
            currentState: undefined,
          }
        : entry,
    );
  };

  const clearToolingDraftState = () => {
    toolingDraftState = null;
    toolingDraftTestSetId = null;
  };

  const setToolingDraftFromTestSet = (testSet) => {
    toolingDraftState = createToolingDraftStateFromTestSet(testSet);
    toolingDraftTestSetId = testSet?.id ?? null;
  };

  const renderWorkspaceShell = (review, persistenceState = null) => {
    const currentRoute = router?.getCurrentRoute() ?? null;
    const currentPageId =
      currentRoute?.pageId ?? resolveDefaultWorkspacePageId(review.workflowMode);

    renderReviewShellChrome(dom.reviewShellMount, {
      review,
      isWorkspace: true,
      overviewPath: buildReviewOverviewPath(review.id),
      workspacePath: buildReviewWorkspacePath(review.id, currentPageId),
      activityPath: buildReviewActivityPath(review.id),
      inboxPath: buildReviewInboxPath(review.id),
      importExportPath: buildReviewImportExportPath(review.id),
      persistence: persistenceState,
      activeSubview: 'workspace',
    });

    renderWorkspaceHeaderMeta(dom.workspaceStatusMount, {
      review,
      persistence: persistenceState,
      currentPageId,
    });

    announceReviewSaveState(persistenceState);
  };

  const renderHeader = () => {
    renderAppHeader({
      headerNavMount: dom.appHeaderNavMount,
      sessionMount: dom.appSessionMount,
      session,
      route: router?.getCurrentRoute() ?? null,
    });
  };

  const ensureToolingTestSets = async ({ force = false } = {}) => {
    if (toolingTestSets.length && !force) {
      return toolingTestSets;
    }

    const payload = await listTestSets();
    toolingTestSets = payload.testSets ?? [];
    return toolingTestSets;
  };

  const ensureToolingReviews = async ({ force = false } = {}) => {
    if (toolingReviews.length && !force) {
      return toolingReviews;
    }

    const payload = await listReviews();
    toolingReviews = payload.reviews ?? [];
    return toolingReviews;
  };

  const ensureExtensionCaptureState = async ({ force = false } = {}) => {
    if (extensionCaptureState.loaded && !force) {
      return extensionCaptureState;
    }

    const payload = await listExtensionSessions();
    extensionCaptureState = {
      ...extensionCaptureState,
      sessions: payload.sessions ?? [],
      loaded: true,
      loading: false,
    };
    return extensionCaptureState;
  };

  const loadToolingTestSet = async (testSetId, { force = false } = {}) => {
    const numericId = toNumericId(testSetId);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      return null;
    }

    if (!force && toolingTestSetCache.has(numericId)) {
      return toolingTestSetCache.get(numericId);
    }

    const payload = await getTestSet(numericId);
    toolingTestSetCache.set(numericId, payload.testSet);
    return payload.testSet;
  };

  const renderToolingSurface = (viewModel) => {
    destroyWorkspace();
    clearChildren(dom.reviewShellMount);
    setSurfaceState({
      appSurface: 'tooling',
      reviewShellVisible: false,
      workspaceVisible: false,
    });
    clearWorkspaceHeaderMeta();

    const createFeedback =
      viewModel.feedback?.scope === 'create'
        ? `<div class="dashboard-inline-notice tooling-feedback" data-tone="${escapeHtml(
            viewModel.feedback.tone || 'info',
          )}">${escapeHtml(viewModel.feedback.message)}</div>`
        : '';

    dom.appViewMount.innerHTML = `
      <div class="app-surface dashboard-surface tooling-surface" data-app-surface="tooling">
        <section class="dashboard-section dashboard-lead">
          <div>
            <p class="dashboard-kicker">Reusable testing workspace</p>
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

        <section class="dashboard-section tooling-create-panel">
          <div class="dashboard-section-heading-row">
            <h2 class="dashboard-section-title">Create test set</h2>
            <p class="dashboard-section-note">Tooling stays app-shell owned, versioned, and separate from questionnaire state.</p>
          </div>
          ${createFeedback}
          <form class="tooling-create-form" data-tooling-create-form>
            <div class="tooling-editor-grid tooling-create-grid">
              <label class="dashboard-field tooling-span-2">
                <span class="dashboard-field-label">Title</span>
                <input class="dashboard-input" type="text" name="title" value="${escapeHtml(toolingCreateState.title)}" data-tooling-create-title />
              </label>
              <label class="dashboard-field">
                <span class="dashboard-field-label">Visibility</span>
                <select class="dashboard-select" name="visibility" data-tooling-create-visibility>
                  <option value="team" ${toolingCreateState.visibility === 'team' ? 'selected' : ''}>Team</option>
                  <option value="private" ${toolingCreateState.visibility === 'private' ? 'selected' : ''}>Private</option>
                </select>
              </label>
              <label class="dashboard-field tooling-span-3">
                <span class="dashboard-field-label">Description</span>
                <textarea class="dashboard-input tooling-textarea" name="description" data-tooling-create-description>${escapeHtml(toolingCreateState.description)}</textarea>
              </label>
              <label class="dashboard-field tooling-span-3">
                <span class="dashboard-field-label">Purpose</span>
                <input class="dashboard-input" type="text" name="purpose" value="${escapeHtml(toolingCreateState.purpose)}" data-tooling-create-purpose />
              </label>
            </div>
            <div class="dashboard-action-row">
              <button type="submit" class="nav-button">Create test set</button>
            </div>
          </form>
        </section>

        <div class="tooling-layout">
          <section class="dashboard-section tooling-list-panel">
            <div class="dashboard-section-heading-row">
              <h2 class="dashboard-section-title">Test-set queue</h2>
              <p class="dashboard-section-note">Published revisions are immutable; linked reviews pin a specific revision only.</p>
            </div>
            ${createTestSetListMarkup({ items: viewModel.listItems })}
          </section>

          <section class="dashboard-section tooling-editor-panel">
            ${createTestSetEditorMarkup(viewModel)}
          </section>
        </div>
      </div>
    `;

    dom.documentRef.body.dataset.appSurface = 'tooling';
  };

  const renderToolingRoute = async (route) => {
    await Promise.all([ensureToolingTestSets(), ensureToolingReviews()]);

    let selectedTestSet = null;

    if (route.testSetId) {
      try {
        selectedTestSet = await loadToolingTestSet(route.testSetId);
      } catch (error) {
        toolingFeedbackState = {
          scope: 'editor',
          tone: 'error',
          message: error.message,
        };
        clearToolingDraftState();
        router.replace(buildToolingPath());
        return;
      }
    }

    if (selectedTestSet) {
      if (toolingDraftTestSetId !== selectedTestSet.id) {
        setToolingDraftFromTestSet(selectedTestSet);
      }
    } else {
      clearToolingDraftState();
    }

    renderToolingSurface(
      createToolingViewModel({
        route,
        testSets: toolingTestSets,
        selectedTestSet,
        draftState: toolingDraftState,
        reviews: toolingReviews,
        feedback: toolingFeedbackState,
      }),
    );
  };

  const renderDashboard = (surface) => {
    setSurfaceState({
      appSurface: surface,
      reviewShellVisible: false,
      workspaceVisible: false,
    });
    clearChildren(dom.reviewShellMount);
    destroyWorkspace();
    clearWorkspaceHeaderMeta();

    renderDashboardSurface(
      dom.appViewMount,
      createDashboardViewModel({
        surface,
        reviews: dashboardReviews,
        filters: dashboardFilters,
        createDraftTitle: dashboardCreateTitle,
        errorMessage: dashboardErrorMessage,
      }),
    );
  };

  const ensureDashboardReviews = async ({ force = false } = {}) => {
    if (dashboardReviews.length && !force) {
      return dashboardReviews;
    }

    const payload = await listReviews();
    dashboardReviews = payload.reviews ?? [];
    dashboardErrorMessage = '';
    return dashboardReviews;
  };

  const getCachedDashboardReview = (reviewId) => {
    const numericId = toNumericId(reviewId);
    return dashboardReviews.find((review) => review.id === numericId) ?? null;
  };

  const loadReview = async (reviewId, { force = false } = {}) => {
    const numericId = toNumericId(reviewId);

    if (!Number.isInteger(numericId) || numericId <= 0) {
      return null;
    }

    if (!force && reviewCache.has(numericId)) {
      return reviewCache.get(numericId);
    }

    const payload = await getReview(numericId);
    reviewCache.set(numericId, payload.review);
    return payload.review;
  };

  const mountWorkspaceForRoute = async (route, review) => {
    const currentPageId = route.pageId ?? resolveDefaultWorkspacePageId(review.workflowMode);
    const workspacePath = buildReviewWorkspacePath(review.id, currentPageId);

    if (!route.pageId) {
      router.replace(workspacePath);
      return;
    }

    setSurfaceState({
      appSurface: 'workspace',
      reviewShellVisible: true,
      workspaceVisible: true,
    });
    clearChildren(dom.appViewMount);

    if (!workspaceHost || workspaceHost.reviewId !== review.id) {
      destroyWorkspace();

      const instance = mountWorkspace({
        initialEvaluation: review.currentState,
        workflowAuthority: review.workflowAuthority,
        routeContext: createWorkspaceRouteContext({ router, reviewId: review.id }),
        workspacePreferences: session?.preferences ?? null,
      });

      const persistence = createReviewSaveQueue({
        review,
        cloneSnapshot: cloneEvaluationState,
        areSnapshotsEqual: areEvaluationStatesEqual,
        saveSnapshot: (currentState, { etag, saveReason }) =>
          saveReviewState(review.id, currentState, { etag, saveReason }),
        onStateChange(nextState) {
          if (!workspaceHost || workspaceHost.reviewId !== review.id) {
            return;
          }

          workspaceHost.persistenceState = nextState;

          if (
            isWorkspaceRoute(router.getCurrentRoute()) &&
            String(router.getCurrentRoute().reviewId) === String(review.id)
          ) {
            renderWorkspaceShell(workspaceHost.review, nextState);
          }
        },
        onReviewAccepted(nextReview) {
          if (!workspaceHost || workspaceHost.reviewId !== nextReview.id) {
            return;
          }

          workspaceHost.review = nextReview;
          workspaceHost.revisionNumber = nextReview.currentRevisionNumber;
          workspaceHost.instance.setWorkflowAuthority(nextReview.workflowAuthority);
          updateCachedReview(nextReview);

          if (
            isWorkspaceRoute(router.getCurrentRoute()) &&
            String(router.getCurrentRoute().reviewId) === String(nextReview.id)
          ) {
            renderWorkspaceShell(nextReview, workspaceHost.persistenceState);
          }
        },
        timings: resolveSaveQueueTimings(dom.windowRef),
        windowRef: dom.windowRef,
        documentRef: dom.documentRef,
      });

      const unsubscribe = instance.store.subscribe((state, previousState) => {
        if (state.evaluation === previousState.evaluation) {
          return;
        }

        persistence.observeSnapshot(cloneEvaluationState(state.evaluation));
      });

      workspaceHost = {
        reviewId: review.id,
        review,
        revisionNumber: review.currentRevisionNumber,
        instance,
        unsubscribe,
        persistence,
        persistenceState: persistence.getState(),
      };

      renderWorkspaceShell(review, workspaceHost.persistenceState);
      return;
    }

    if (
      workspaceHost.revisionNumber !== review.currentRevisionNumber &&
      !workspaceHost.persistence.hasUnsavedChanges()
    ) {
      workspaceHost.persistence.resetToReview(review);
      workspaceHost.review = review;
      workspaceHost.revisionNumber = review.currentRevisionNumber;
      workspaceHost.instance.setWorkflowAuthority(review.workflowAuthority);
      workspaceHost.instance.replaceEvaluation(review.currentState);
      updateCachedReview(review);
    }

    workspaceHost.instance.setWorkflowAuthority(review.workflowAuthority);

    if (workspaceHost.instance.store.getState().ui.activePageId !== currentPageId) {
      workspaceHost.instance.navigateToPage(currentPageId, {
        focusTarget: false,
        resetSubAnchor: true,
      });
    }

    renderWorkspaceShell(workspaceHost.review, workspaceHost.persistenceState);
  };

  const renderReviewOverview = (review) => {
    destroyWorkspace();
    setSurfaceState({
      appSurface: 'review-overview',
      reviewShellVisible: true,
      workspaceVisible: false,
    });

    clearWorkspaceHeaderMeta();

    const viewModel = createReviewOverviewViewModel({
      review,
      preferredTimeZone: session?.preferences?.preferredTimeZone ?? 'UTC',
    });

    renderReviewShellChrome(dom.reviewShellMount, {
      review,
      isWorkspace: false,
      overviewPath: buildReviewOverviewPath(review.id),
      workspacePath: viewModel.resumeJump.path,
      activityPath: buildReviewActivityPath(review.id),
      inboxPath: buildReviewInboxPath(review.id),
      importExportPath: buildReviewImportExportPath(review.id),
      activeSubview: 'overview',
    });
    announceReviewSaveState(null);
    renderReviewOverviewSurface(dom.appViewMount, viewModel);
  };

  const renderReviewActivity = async (review) => {
    destroyWorkspace();
    setSurfaceState({
      appSurface: 'review-activity',
      reviewShellVisible: true,
      workspaceVisible: false,
    });
    clearWorkspaceHeaderMeta();

    const payload = await getReviewActivity(review.id);
    renderReviewShellChrome(dom.reviewShellMount, {
      review,
      isWorkspace: false,
      overviewPath: buildReviewOverviewPath(review.id),
      workspacePath: buildReviewWorkspacePath(
        review.id,
        resolveDefaultWorkspacePageId(review.workflowMode),
      ),
      activityPath: buildReviewActivityPath(review.id),
      inboxPath: buildReviewInboxPath(review.id),
      importExportPath: buildReviewImportExportPath(review.id),
      activeSubview: 'activity',
    });
    announceReviewSaveState(null);
    renderActivityLogSurface(
      dom.appViewMount,
      createReviewActivityViewModel({
        review,
        comments: payload.comments ?? [],
        auditEvents: payload.auditEvents ?? [],
        preferredTimeZone: session?.preferences?.preferredTimeZone ?? 'UTC',
        formState: activityFormState,
      }),
    );
  };

  const renderReviewImportExport = async (review) => {
    destroyWorkspace();
    setSurfaceState({
      appSurface: 'review-import-export',
      reviewShellVisible: true,
      workspaceVisible: false,
    });
    clearWorkspaceHeaderMeta();

    const [exportsPayload, importsPayload] = await Promise.all([
      listReviewExports(review.id),
      listReviewImports(review.id),
    ]);

    renderReviewShellChrome(dom.reviewShellMount, {
      review,
      isWorkspace: false,
      overviewPath: buildReviewOverviewPath(review.id),
      workspacePath: buildReviewWorkspacePath(
        review.id,
        resolveDefaultWorkspacePageId(review.workflowMode),
      ),
      activityPath: buildReviewActivityPath(review.id),
      inboxPath: buildReviewInboxPath(review.id),
      importExportPath: buildReviewImportExportPath(review.id),
      activeSubview: 'import-export',
    });
    announceReviewSaveState(null);
    renderImportExportSurface(
      dom.appViewMount,
      createImportExportViewModel({
        review,
        exports: exportsPayload.exports ?? [],
        imports: importsPayload.imports ?? [],
        preferredTimeZone: session?.preferences?.preferredTimeZone ?? 'UTC',
        exportState: exportFeedbackState,
        importState: importFeedbackState,
      }),
    );
  };

  const renderReviewInbox = async (review) => {
    destroyWorkspace();
    setSurfaceState({
      appSurface: 'review-inbox',
      reviewShellVisible: true,
      workspaceVisible: false,
    });
    clearWorkspaceHeaderMeta();

    const inboxPayload = await listReviewInbox(review.id);

    renderReviewShellChrome(dom.reviewShellMount, {
      review,
      isWorkspace: false,
      overviewPath: buildReviewOverviewPath(review.id),
      workspacePath: buildReviewWorkspacePath(
        review.id,
        resolveDefaultWorkspacePageId(review.workflowMode),
      ),
      activityPath: buildReviewActivityPath(review.id),
      inboxPath: buildReviewInboxPath(review.id),
      importExportPath: buildReviewImportExportPath(review.id),
      activeSubview: 'review-inbox',
    });
    announceReviewSaveState(null);
    renderReviewInboxSurface(
      dom.appViewMount,
      createReviewInboxViewModel({
        review,
        inbox: inboxPayload.inbox,
        preferredTimeZone: session?.preferences?.preferredTimeZone ?? 'UTC',
        feedbackState: reviewInboxFeedbackState,
      }),
    );
  };

  const renderSettingsRoute = (route) => {
    destroyWorkspace();
    clearChildren(dom.reviewShellMount);
    setSurfaceState({
      appSurface: route.name,
      reviewShellVisible: false,
      workspaceVisible: false,
    });
    clearWorkspaceHeaderMeta();

    renderSettingsSurface(
      dom.appViewMount,
      createSettingsViewModel({
        session,
        route,
        saveState: settingsSaveState.surface === route.name ? settingsSaveState : null,
        extensionState:
          route.name === SETTINGS_SURFACE_NAMES.CAPTURE ? extensionCaptureState : null,
      }),
    );
  };

  const renderHelpRoute = (route) => {
    destroyWorkspace();
    clearChildren(dom.reviewShellMount);
    setSurfaceState({
      appSurface: 'help',
      reviewShellVisible: false,
      workspaceVisible: false,
    });
    clearWorkspaceHeaderMeta();
    renderHelpSurface(dom.appViewMount, createHelpViewModel({ route }));
  };

  const handleAuthenticatedRoute = async (route) => {
    renderHeader();

    if (isDashboardRoute(route)) {
      await ensureDashboardReviews({ force: false });
      renderDashboard(route.name === 'review-list' ? 'review-list' : 'dashboard');
      return;
    }

    if (isToolingRoute(route)) {
      await renderToolingRoute(route);
      return;
    }

    if (isHelpRoute(route)) {
      renderHelpRoute(route);
      return;
    }

    if (isSettingsRoute(route)) {
      if (route.name === SETTINGS_SURFACE_NAMES.CAPTURE && !extensionCaptureState.loaded) {
        try {
          extensionCaptureState = {
            ...extensionCaptureState,
            loading: true,
          };
          await ensureExtensionCaptureState();
        } catch (error) {
          extensionCaptureState = {
            ...extensionCaptureState,
            loading: false,
          };
          settingsSaveState = {
            surface: SETTINGS_SURFACE_NAMES.CAPTURE,
            status: 'error',
            message: error.message,
          };
        }
      }

      renderSettingsRoute(route);
      return;
    }

    if (!isReviewShellRoute(route)) {
      router.replace(buildDashboardPath());
      return;
    }

    try {
      const review = await loadReview(route.reviewId);

      if (!review) {
        setSurfaceState({
          appSurface: 'failure',
          reviewShellVisible: false,
          workspaceVisible: false,
        });
        clearChildren(dom.reviewShellMount);
        destroyWorkspace();
        renderLoadFailureSurface(dom.appViewMount, {
          title: 'Review not found',
          message: 'The requested review id is invalid or not visible to the current user.',
        });
        return;
      }

      if (isWorkspaceRoute(route)) {
        await mountWorkspaceForRoute(route, review);
        return;
      }

      if (route.name === 'review-activity') {
        await renderReviewActivity(review);
        return;
      }

      if (route.name === 'review-inbox') {
        await renderReviewInbox(review);
        return;
      }

      if (route.name === 'review-import-export') {
        await renderReviewImportExport(review);
        return;
      }

      renderReviewOverview(review);
    } catch (error) {
      setSurfaceState({
        appSurface: 'failure',
        reviewShellVisible: false,
        workspaceVisible: false,
      });
      clearChildren(dom.reviewShellMount);
      destroyWorkspace();
      renderLoadFailureSurface(dom.appViewMount, {
        title: 'Route load failed',
        message: error.message,
      });
    }
  };

  const renderAnonymousRoute = () => {
    destroyWorkspace();
    clearChildren(dom.reviewShellMount);
    clearWorkspaceHeaderMeta();
    setSurfaceState({
      appSurface: 'auth',
      reviewShellVisible: false,
      workspaceVisible: false,
    });
    renderHeader();
    renderAuthSurface(dom.appViewMount, {
      session,
      errorMessage: dashboardErrorMessage,
      pendingUsername: isSigningInAs,
    });
  };

  const handleRouteChange = async (route, previousRoute = null) => {
    if (
      previousRoute &&
      isWorkspaceRoute(previousRoute) &&
      (!isWorkspaceRoute(route) || String(route.reviewId) !== String(previousRoute.reviewId))
    ) {
      await workspaceHost?.persistence?.flush({ saveReason: 'route_leave_flush' });
    }

    if (!session?.authenticated) {
      renderAnonymousRoute();
      return;
    }

    await handleAuthenticatedRoute(route);
  };

  const syncSession = async () => {
    session = await getSession();
    applySessionPreferences(session);
    return session;
  };

  const updateDashboardFiltersFromInput = (target) => {
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) {
      return false;
    }

    if (target.hasAttribute('data-dashboard-search')) {
      dashboardFilters = { ...dashboardFilters, search: target.value };
      return true;
    }

    if (target.hasAttribute('data-dashboard-workflow-filter')) {
      dashboardFilters = { ...dashboardFilters, workflowFilter: target.value };
      return true;
    }

    if (target.hasAttribute('data-dashboard-lifecycle-filter')) {
      dashboardFilters = { ...dashboardFilters, lifecycleFilter: target.value };
      return true;
    }

    if (target.hasAttribute('data-dashboard-create-title')) {
      dashboardCreateTitle = target.value;
      return false;
    }

    return false;
  };

  const handleDocumentClick = async (event) => {
    const routeLink = event.target.closest?.('[data-route-link]');
    if (routeLink instanceof HTMLAnchorElement) {
      event.preventDefault();
      router.navigate(routeLink.getAttribute('href') || buildDashboardPath());
      return;
    }

    const loginButton = event.target.closest?.('[data-auth-login-username]');
    if (loginButton instanceof HTMLButtonElement) {
      const username = loginButton.dataset.authLoginUsername ?? '';
      if (!username) {
        return;
      }

      try {
        isSigningInAs = username;
        renderAnonymousRoute();
        await login(username);
        await syncSession();
        dashboardErrorMessage = '';
        dashboardReviews = [];
        router.replace(buildDashboardPath());
      } catch (error) {
        dashboardErrorMessage = error.message;
        await syncSession();
        renderAnonymousRoute();
      } finally {
        isSigningInAs = '';
        renderHeader();
      }
      return;
    }

    const logoutButton = event.target.closest?.('[data-auth-logout]');
    if (logoutButton instanceof HTMLButtonElement) {
      await logout();
      dashboardReviews = [];
      reviewCache.clear();
      dashboardErrorMessage = '';
      extensionCaptureState = {
        sessions: [],
        pairing: null,
        loading: false,
        loaded: false,
      };
      await syncSession();
      router.replace(buildDashboardPath());
      return;
    }

    const pairButton = event.target.closest?.('[data-extension-pair-start]');
    if (pairButton instanceof HTMLButtonElement) {
      const route = router.getCurrentRoute();

      settingsSaveState = {
        surface: SETTINGS_SURFACE_NAMES.CAPTURE,
        status: 'saving',
        message: 'Creating pairing code…',
      };
      extensionCaptureState = {
        ...extensionCaptureState,
        loading: true,
      };
      renderSettingsRoute(route);

      try {
        const payload = await startExtensionPairing();
        extensionCaptureState = {
          ...extensionCaptureState,
          pairing: payload.pairing ?? null,
          loading: false,
          loaded: true,
        };
        settingsSaveState = {
          surface: SETTINGS_SURFACE_NAMES.CAPTURE,
          status: 'saved',
          message: 'Pairing code ready.',
        };
      } catch (error) {
        extensionCaptureState = {
          ...extensionCaptureState,
          loading: false,
        };
        settingsSaveState = {
          surface: SETTINGS_SURFACE_NAMES.CAPTURE,
          status: 'error',
          message: error.message,
        };
      }

      renderSettingsRoute(route);
      return;
    }

    const refreshExtensionSessionsButton = event.target.closest?.(
      '[data-extension-sessions-refresh]',
    );
    if (refreshExtensionSessionsButton instanceof HTMLButtonElement) {
      const route = router.getCurrentRoute();

      settingsSaveState = {
        surface: SETTINGS_SURFACE_NAMES.CAPTURE,
        status: 'saving',
        message: 'Refreshing paired sessions…',
      };
      extensionCaptureState = {
        ...extensionCaptureState,
        pairing: null,
        loading: true,
      };
      renderSettingsRoute(route);

      try {
        await ensureExtensionCaptureState({ force: true });
        settingsSaveState = {
          surface: SETTINGS_SURFACE_NAMES.CAPTURE,
          status: 'saved',
          message: 'Paired sessions refreshed.',
        };
      } catch (error) {
        extensionCaptureState = {
          ...extensionCaptureState,
          loading: false,
        };
        settingsSaveState = {
          surface: SETTINGS_SURFACE_NAMES.CAPTURE,
          status: 'error',
          message: error.message,
        };
      }

      renderSettingsRoute(route);
      return;
    }

    const revokeExtensionSessionButton = event.target.closest?.('[data-extension-session-revoke]');
    if (revokeExtensionSessionButton instanceof HTMLButtonElement) {
      const route = router.getCurrentRoute();
      const sessionId = revokeExtensionSessionButton.dataset.extensionSessionRevoke;

      if (!sessionId) {
        return;
      }

      settingsSaveState = {
        surface: SETTINGS_SURFACE_NAMES.CAPTURE,
        status: 'saving',
        message: 'Revoking paired session…',
      };
      extensionCaptureState = {
        ...extensionCaptureState,
        loading: true,
      };
      renderSettingsRoute(route);

      try {
        await revokeExtensionSession(sessionId);
        await ensureExtensionCaptureState({ force: true });
        settingsSaveState = {
          surface: SETTINGS_SURFACE_NAMES.CAPTURE,
          status: 'saved',
          message: 'Paired session revoked.',
        };
      } catch (error) {
        extensionCaptureState = {
          ...extensionCaptureState,
          loading: false,
        };
        settingsSaveState = {
          surface: SETTINGS_SURFACE_NAMES.CAPTURE,
          status: 'error',
          message: error.message,
        };
      }

      renderSettingsRoute(route);
      return;
    }

    const createButton = event.target.closest?.('[data-dashboard-create-review]');
    if (createButton instanceof HTMLButtonElement) {
      const title = dashboardCreateTitle.trim();
      const payload = await createReview({
        titleSnapshot: title,
        currentState: createInitialReviewStateFromSession(),
      });
      reviewCache.set(payload.review.id, payload.review);
      dashboardReviews = [];
      dashboardCreateTitle = '';
      await ensureDashboardReviews({ force: true });
      router.navigate(buildReviewOverviewPath(payload.review.id));
      return;
    }

    const addCaseButton = event.target.closest?.('[data-tooling-add-case]');
    if (addCaseButton instanceof HTMLButtonElement) {
      const form = event.target.closest?.('[data-tooling-editor-form]');
      toolingDraftState = appendEmptyCaseToDraft(readToolingDraftFromForm(form, toolingDraftState));
      toolingDraftTestSetId = toNumericId(router.getCurrentRoute().testSetId);
      toolingFeedbackState = null;
      await renderToolingRoute(router.getCurrentRoute());
      return;
    }

    const removeCaseButton = event.target.closest?.('[data-tooling-remove-case]');
    if (removeCaseButton instanceof HTMLButtonElement) {
      const caseIndex = Number.parseInt(removeCaseButton.dataset.toolingRemoveCase ?? '', 10);
      const form = event.target.closest?.('[data-tooling-editor-form]');
      toolingDraftState = removeCaseFromDraft(
        readToolingDraftFromForm(form, toolingDraftState),
        caseIndex,
      );
      toolingDraftTestSetId = toNumericId(router.getCurrentRoute().testSetId);
      toolingFeedbackState = null;
      await renderToolingRoute(router.getCurrentRoute());
      return;
    }

    const publishButton = event.target.closest?.('[data-tooling-publish]');
    if (publishButton instanceof HTMLButtonElement) {
      try {
        const payload = await publishTestSetRevision(publishButton.dataset.toolingPublish);
        await ensureToolingTestSets({ force: true });
        toolingTestSetCache.set(payload.testSet.id, payload.testSet);
        setToolingDraftFromTestSet(payload.testSet);
        toolingFeedbackState = {
          scope: 'editor',
          tone: 'success',
          message: `Published immutable revision v${payload.testSet.latestPublishedRevision?.versionNumber ?? payload.publishedRevisionId}.`,
        };
        router.replace(buildToolingTestSetPath(payload.testSet.id));
      } catch (error) {
        toolingFeedbackState = {
          scope: 'editor',
          tone: 'error',
          message: error.message,
        };
        await renderToolingRoute(router.getCurrentRoute());
      }
      return;
    }

    const forkButton = event.target.closest?.('[data-tooling-fork]');
    if (forkButton instanceof HTMLButtonElement) {
      const form = event.target.closest?.('[data-tooling-editor-form]');
      const draft = readToolingDraftFromForm(form, toolingDraftState);

      try {
        const payload = await forkTestSet(forkButton.dataset.toolingFork, {
          title: draft.title ? `${draft.title} copy` : '',
          changeSummary: draft.changeSummary,
        });
        await ensureToolingTestSets({ force: true });
        toolingTestSetCache.set(payload.testSet.id, payload.testSet);
        setToolingDraftFromTestSet(payload.testSet);
        toolingFeedbackState = {
          scope: 'editor',
          tone: 'success',
          message: 'Forked into a new draft test set.',
        };
        router.navigate(buildToolingTestSetPath(payload.testSet.id));
      } catch (error) {
        toolingFeedbackState = {
          scope: 'editor',
          tone: 'error',
          message: error.message,
        };
        await renderToolingRoute(router.getCurrentRoute());
      }
      return;
    }

    const archiveButton = event.target.closest?.('[data-tooling-archive]');
    if (archiveButton instanceof HTMLButtonElement) {
      try {
        const payload = await archiveTestSet(archiveButton.dataset.toolingArchive);
        await ensureToolingTestSets({ force: true });
        toolingTestSetCache.set(payload.testSet.id, payload.testSet);
        setToolingDraftFromTestSet(payload.testSet);
        toolingFeedbackState = {
          scope: 'editor',
          tone: 'success',
          message: 'Test set archived.',
        };
        router.replace(buildToolingTestSetPath(payload.testSet.id));
      } catch (error) {
        toolingFeedbackState = {
          scope: 'editor',
          tone: 'error',
          message: error.message,
        };
        await renderToolingRoute(router.getCurrentRoute());
      }
      return;
    }

    const openOverviewButton = event.target.closest?.('[data-review-open-overview]');
    if (openOverviewButton instanceof HTMLButtonElement) {
      const reviewId = openOverviewButton.dataset.reviewOpenOverview;
      if (reviewId) {
        router.navigate(buildReviewOverviewPath(reviewId));
      }
      return;
    }

    const continueButton = event.target.closest?.('[data-review-continue]');
    if (continueButton instanceof HTMLButtonElement) {
      const reviewId = continueButton.dataset.reviewContinue;
      if (!reviewId) {
        return;
      }

      const review = getCachedDashboardReview(reviewId) ?? (await loadReview(reviewId));
      const pageId = resolveDefaultWorkspacePageId(review?.workflowMode);
      router.navigate(buildReviewWorkspacePath(reviewId, pageId));
      return;
    }

    const retrySaveButton = event.target.closest?.('[data-review-save-retry]');
    if (retrySaveButton instanceof HTMLButtonElement) {
      await workspaceHost?.persistence?.flush({ saveReason: 'manual_save' });
      return;
    }

    const reloadServerButton = event.target.closest?.('[data-review-reload-server]');
    if (reloadServerButton instanceof HTMLButtonElement) {
      const confirmed = dom.windowRef.confirm(
        'Reload the latest server copy? Unsaved local edits in this tab will be discarded.',
      );

      if (!confirmed) {
        return;
      }

      const nextReview = workspaceHost?.persistence?.reloadFromConflict();

      if (nextReview && workspaceHost) {
        workspaceHost.review = nextReview;
        workspaceHost.revisionNumber = nextReview.currentRevisionNumber;
        updateCachedReview(nextReview);
        workspaceHost.instance.replaceEvaluation(nextReview.currentState);
        renderWorkspaceShell(nextReview, workspaceHost.persistenceState);
      }
    }
  };

  const handleDocumentInput = (event) => {
    if (!updateDashboardFiltersFromInput(event.target)) {
      return;
    }

    const route = router.getCurrentRoute();
    if (isDashboardRoute(route) && session?.authenticated) {
      renderDashboard(route.name === 'review-list' ? 'review-list' : 'dashboard');
    } else if (isHelpRoute(route) && session?.authenticated) {
      renderHelpRoute(route);
    }
  };

  const handleDocumentSubmit = async (event) => {
    const toolingCreateForm = event.target.closest?.('[data-tooling-create-form]');

    if (toolingCreateForm instanceof HTMLFormElement) {
      event.preventDefault();
      const formData = new FormData(toolingCreateForm);
      toolingCreateState = {
        title: String(formData.get('title') ?? ''),
        description: String(formData.get('description') ?? ''),
        purpose: String(formData.get('purpose') ?? ''),
        visibility: String(formData.get('visibility') ?? 'team'),
      };

      try {
        const payload = await createTestSet(toolingCreateState);
        await ensureToolingTestSets({ force: true });
        toolingTestSetCache.set(payload.testSet.id, payload.testSet);
        toolingCreateState = {
          title: '',
          description: '',
          purpose: '',
          visibility: 'team',
        };
        toolingFeedbackState = {
          scope: 'create',
          tone: 'success',
          message: 'Test set created.',
        };
        setToolingDraftFromTestSet(payload.testSet);
        router.navigate(buildToolingTestSetPath(payload.testSet.id));
      } catch (error) {
        toolingFeedbackState = {
          scope: 'create',
          tone: 'error',
          message: error.message,
        };
        await renderToolingRoute(router.getCurrentRoute());
      }
      return;
    }

    const toolingEditorForm = event.target.closest?.('[data-tooling-editor-form]');

    if (toolingEditorForm instanceof HTMLFormElement) {
      event.preventDefault();
      const route = router.getCurrentRoute();
      const draft = readToolingDraftFromForm(toolingEditorForm, toolingDraftState);

      try {
        const payload = await updateTestSetDraft(route.testSetId, draft);
        await ensureToolingTestSets({ force: true });
        toolingTestSetCache.set(payload.testSet.id, payload.testSet);
        setToolingDraftFromTestSet(payload.testSet);
        toolingFeedbackState = {
          scope: 'editor',
          tone: 'success',
          message: 'Draft saved.',
        };
        router.replace(buildToolingTestSetPath(payload.testSet.id));
      } catch (error) {
        toolingDraftState = draft;
        toolingDraftTestSetId = toNumericId(route.testSetId);
        toolingFeedbackState = {
          scope: 'editor',
          tone: 'error',
          message: error.message,
        };
        await renderToolingRoute(route);
      }
      return;
    }

    const toolingLinkForm = event.target.closest?.('[data-tooling-link-form]');

    if (toolingLinkForm instanceof HTMLFormElement) {
      event.preventDefault();
      const route = router.getCurrentRoute();
      const linkPayload = readToolingLinkFromForm(toolingLinkForm);

      try {
        await linkReviewTestPlan(linkPayload.evaluationId, {
          testSetRevisionId: linkPayload.testSetRevisionId,
          role: linkPayload.role,
        });
        const refreshed = await loadToolingTestSet(route.testSetId, { force: true });
        await ensureToolingTestSets({ force: true });
        setToolingDraftFromTestSet(refreshed);
        toolingFeedbackState = {
          scope: 'link',
          tone: 'success',
          message: 'Published revision linked to review.',
        };
        await renderToolingRoute(route);
      } catch (error) {
        toolingFeedbackState = {
          scope: 'link',
          tone: 'error',
          message: error.message,
        };
        await renderToolingRoute(route);
      }
      return;
    }

    const commentForm = event.target.closest?.('[data-comment-form]');

    if (commentForm instanceof HTMLFormElement) {
      event.preventDefault();
      const route = router.getCurrentRoute();

      activityFormState = {
        scopeType: new FormData(commentForm).get('scopeType') ?? 'review',
        sectionId: new FormData(commentForm).get('sectionId') ?? '',
        criterionCode: new FormData(commentForm).get('criterionCode') ?? '',
        body: new FormData(commentForm).get('body') ?? '',
        message: 'Saving comment…',
      };

      try {
        await createReviewComment(route.reviewId, {
          scopeType: activityFormState.scopeType,
          sectionId: activityFormState.sectionId,
          criterionCode: activityFormState.criterionCode,
          body: activityFormState.body,
        });
        activityFormState = {
          scopeType: 'review',
          sectionId: '',
          criterionCode: '',
          body: '',
          message: 'Comment saved.',
        };
      } catch (error) {
        activityFormState = {
          ...activityFormState,
          message: error.message,
        };
      }

      await handleAuthenticatedRoute(route);
      return;
    }

    const exportForm = event.target.closest?.('[data-export-form]');

    if (exportForm instanceof HTMLFormElement) {
      event.preventDefault();
      const route = router.getCurrentRoute();
      const formData = new FormData(exportForm);

      try {
        const payload = await createReviewExport(route.reviewId, {
          format: formData.get('format') ?? 'json',
          includeEvidenceFiles: String(formData.get('includeEvidenceFiles')) === 'true',
          includeReportingCsv: String(formData.get('includeReportingCsv')) !== 'false',
        });
        exportFeedbackState = {
          message: `Export created (${payload.export.format.toUpperCase()}).`,
        };
      } catch (error) {
        exportFeedbackState = { message: error.message };
      }

      await handleAuthenticatedRoute(route);
      return;
    }

    const legacyImportForm = event.target.closest?.('[data-legacy-import-form]');

    if (legacyImportForm instanceof HTMLFormElement) {
      event.preventDefault();
      const route = router.getCurrentRoute();
      const formData = new FormData(legacyImportForm);

      try {
        const imported = await importLegacyEvidenceManifest(route.reviewId, {
          sourceFormat: 'json',
          manifest: formData.get('manifest') ?? '',
        });
        importFeedbackState = {
          ...(importFeedbackState ?? {}),
          legacyMessage: `Imported ${imported.importedLinkCount} legacy item(s).`,
        };
      } catch (error) {
        importFeedbackState = {
          ...(importFeedbackState ?? {}),
          legacyMessage: error.message,
        };
      }

      await handleAuthenticatedRoute(route);
      return;
    }

    const canonicalImportForm = event.target.closest?.('[data-canonical-import-form]');

    if (canonicalImportForm instanceof HTMLFormElement) {
      event.preventDefault();
      const route = router.getCurrentRoute();
      const formData = new FormData(canonicalImportForm);

      try {
        const imported = await importCanonicalReviewPackage({
          sourceFormat: 'json',
          reviewExport: formData.get('reviewExport') ?? '',
        });
        importFeedbackState = {
          ...(importFeedbackState ?? {}),
          canonicalMessage: `Imported review ${imported.review.publicId}.`,
          importedReviewPath: buildReviewOverviewPath(imported.review.id),
        };
      } catch (error) {
        importFeedbackState = {
          ...(importFeedbackState ?? {}),
          canonicalMessage: error.message,
          importedReviewPath: null,
        };
      }

      await handleAuthenticatedRoute(route);
      return;
    }

    const reviewInboxForm = event.target.closest?.('[data-review-inbox-form]');

    if (reviewInboxForm instanceof HTMLFormElement) {
      event.preventDefault();
      const route = router.getCurrentRoute();
      const linkId = reviewInboxForm.dataset.reviewInboxForm;
      const formData = new FormData(reviewInboxForm);
      const target = parseReviewInboxTargetValue(String(formData.get('target') ?? ''));

      if (!linkId || !target) {
        reviewInboxFeedbackState = {
          tone: 'error',
          message: 'Choose a valid destination before moving an inbox item.',
        };
        await handleAuthenticatedRoute(route);
        return;
      }

      try {
        await updateEvidenceLink(route.reviewId, linkId, {
          scopeType: target.scopeType,
          criterionCode: target.criterionCode,
          evidenceType: String(formData.get('evidenceType') ?? 'other'),
          note: String(formData.get('note') ?? ''),
        });
        reviewInboxFeedbackState = {
          tone: 'success',
          message: 'Inbox item moved into the review evidence flow.',
        };
      } catch (error) {
        reviewInboxFeedbackState = {
          tone: 'error',
          message: error.message,
        };
      }

      await handleAuthenticatedRoute(route);
      return;
    }

    const form = event.target.closest?.('[data-settings-form]');

    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    event.preventDefault();

    const route = router.getCurrentRoute();
    const formSurface = form.dataset.settingsForm;
    const surfaceName =
      formSurface === SETTINGS_SURFACE_NAMES.APPLICATION
        ? SETTINGS_SURFACE_NAMES.APPLICATION
        : SETTINGS_SURFACE_NAMES.PROFILE;

    settingsSaveState = {
      surface: surfaceName,
      status: 'saving',
      message: 'Saving preferences…',
    };
    renderSettingsRoute(route);

    try {
      session = await updatePreferences(
        createSettingsPatchFromForm({
          formData: new FormData(form),
          surface: surfaceName,
        }),
      );
      applySessionPreferences(session);
      settingsSaveState = {
        surface: surfaceName,
        status: 'saved',
        message:
          surfaceName === SETTINGS_SURFACE_NAMES.PROFILE
            ? 'Profile defaults saved.'
            : 'Application settings saved.',
      };
      renderHeader();
      renderSettingsRoute(route);
    } catch (error) {
      settingsSaveState = {
        surface: surfaceName,
        status: 'error',
        message: error.message,
      };
      renderSettingsRoute(route);
    }
  };

  session = await syncSession();
  renderHeader();

  router = createAppRouter({
    windowRef: dom.windowRef,
    onChange(route, previousRoute) {
      void handleRouteChange(route, previousRoute);
    },
  });

  void handleRouteChange(router.getCurrentRoute());

  dom.documentRef.addEventListener('click', handleDocumentClick);
  dom.documentRef.addEventListener('input', handleDocumentInput);
  dom.documentRef.addEventListener('change', handleDocumentInput);
  dom.documentRef.addEventListener('submit', handleDocumentSubmit);

  cleanup.push(() => dom.documentRef.removeEventListener('click', handleDocumentClick));
  cleanup.push(() => dom.documentRef.removeEventListener('input', handleDocumentInput));
  cleanup.push(() => dom.documentRef.removeEventListener('change', handleDocumentInput));
  cleanup.push(() => dom.documentRef.removeEventListener('submit', handleDocumentSubmit));
  cleanup.push(() => router.destroy());

  return {
    destroy() {
      destroyWorkspace();
      cleanup.splice(0).forEach((dispose) => dispose());
    },
  };
};
