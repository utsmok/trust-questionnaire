import { createContextTrackingController } from './context-tracking.js';
import { createPagerController } from './pager.js';
import { createAboutPanelController } from '../render/about-panel.js';
import { createHelpPanelController } from '../render/help-panel.js';
import { createReferenceDrawersRenderer } from '../render/reference-drawers.js';
import { createSidebarRenderer } from '../render/sidebar.js';
import { PROGRESS_STATES } from '../state/derive.js';
import { selectShellSurfaceState } from '../state/store.js';
import { toArray, getDocumentRef } from '../utils/shared.js';
import { PRINCIPLE_SECTION_IDS } from '../config/sections.js';

const PANEL_NAMES = Object.freeze({
  CONTEXT: 'context',
  QUESTIONNAIRE: 'questionnaire',
});

const OVERLAY_SURFACE_NAMES = Object.freeze(['aboutSurface', 'helpSurface']);
const QUESTIONNAIRE_SCROLL_OFFSET = 16;
const CONTEXT_DRAWER_MEDIA_QUERY = '(max-width: 1160px)';



const getWindowRef = (root) => getDocumentRef(root).defaultView ?? window;

const toPrincipleKey = (pageId) => {
  const normalized = typeof pageId === 'string' ? pageId.toLowerCase() : '';
  return ['tr', 're', 'uc', 'se', 'tc'].includes(normalized) ? normalized : null;
};

const PROGRESS_BADGE_LABELS = Object.freeze({
  [PROGRESS_STATES.NOT_STARTED]: 'Not started',
  [PROGRESS_STATES.IN_PROGRESS]: 'In progress',
  [PROGRESS_STATES.COMPLETE]: 'Complete',
  [PROGRESS_STATES.INVALID_ATTENTION]: 'Attention',
  [PROGRESS_STATES.SKIPPED]: 'Skipped',
  [PROGRESS_STATES.BLOCKED_ESCALATED]: 'Escalated',
});

const formatProgressBadgeText = (sectionProgress) => {
  if (!sectionProgress) {
    return 'Not started';
  }

  const label = PROGRESS_BADGE_LABELS[sectionProgress.canonicalState] ?? 'Not started';

  if (sectionProgress.canonicalState === PROGRESS_STATES.SKIPPED) {
    return label;
  }

  if (sectionProgress.applicableRequiredFieldCount > 0) {
    return `${label} · ${sectionProgress.satisfiedRequiredFieldCount}/${sectionProgress.applicableRequiredFieldCount} req`;
  }

  return label;
};

const getHeadingText = (section) => {
  const heading = section?.querySelector('h2');

  if (!heading) {
    return '';
  }

  return toArray(heading.childNodes)
    .filter((node) => {
      return !(
        node instanceof HTMLElement
        && node.classList.contains('completion-badge')
      );
    })
    .map((node) => node.textContent ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const ensurePanelTitleSuffix = (panel, pageId, label, documentRef, accentKey = null) => {
  const title = panel?.querySelector('.panel-title');

  if (!title) {
    return;
  }

  let suffix = title.querySelector('.panel-title-section');

  if (!suffix) {
    suffix = documentRef.createElement('span');
    suffix.className = 'panel-title-section';
    title.appendChild(suffix);
  }

  suffix.className = 'panel-title-section';

  const principleKey = toPrincipleKey(pageId);
  if (principleKey) {
    suffix.classList.add(principleKey);
  }

  if (accentKey) {
    suffix.dataset.accentKey = accentKey;
  } else {
    delete suffix.dataset.accentKey;
  }

  suffix.textContent = label ? ` — ${label}` : '';
};

const measurePanel = (panel) => {
  const scrollRange = Math.max(panel.scrollHeight - panel.clientHeight, 0);
  const scrollTop = panel.scrollTop;

  return {
    progressPercent: scrollRange > 0 ? Math.min((scrollTop / scrollRange) * 100, 100) : 0,
    canScrollUp: scrollTop > 10,
    canScrollDown: scrollTop < scrollRange - 10,
  };
};

const syncPanelMetrics = (panel, progressBar, metrics) => {
  if (progressBar) {
    progressBar.style.transform = `scaleX(${metrics.progressPercent / 100})`;
  }

  if (!panel) {
    return;
  }

  panel.classList.toggle('can-scroll-up', metrics.canScrollUp);
  panel.classList.toggle('can-scroll-down', metrics.canScrollDown);
};

const syncPageControlAvailability = (section, isEditable) => {
  toArray(section?.querySelectorAll('.rating-scale')).forEach((scale) => {
    scale.setAttribute('aria-disabled', String(!isEditable));
  });

  toArray(section?.querySelectorAll('.rating-option')).forEach((option) => {
    option.setAttribute('aria-disabled', String(!isEditable));
    option.tabIndex = isEditable ? 0 : -1;
  });
};

const focusElementWithRetry = ({
  windowRef,
  documentRef,
  primaryTarget,
  fallbackTarget = null,
  remainingAttempts = 3,
}) => {
  const primary = primaryTarget instanceof HTMLElement && primaryTarget.isConnected
    ? primaryTarget
    : null;
  const fallback = fallbackTarget instanceof HTMLElement && fallbackTarget.isConnected
    ? fallbackTarget
    : null;
  const target = primary ?? fallback;

  if (!(target instanceof HTMLElement) || typeof target.focus !== 'function') {
    return;
  }

  target.focus({ preventScroll: true });

  if (documentRef.activeElement === target) {
    return;
  }

  if (remainingAttempts <= 1) {
    if (primary && fallback && primary !== fallback && typeof fallback.focus === 'function') {
      fallback.focus({ preventScroll: true });
    }
    return;
  }

  windowRef.requestAnimationFrame(() => {
    focusElementWithRetry({
      windowRef,
      documentRef,
      primaryTarget,
      fallbackTarget,
      remainingAttempts: remainingAttempts - 1,
    });
  });
};

const getRenderedPageSections = (root) =>
  toArray(root?.children).filter(
    (element) => element instanceof HTMLElement && element.matches('[data-page-id]'),
  );

const resolveShellDom = (root) => {
  const documentRef = getDocumentRef(root);

  return {
    documentRef,
    shellRoot: documentRef.getElementById('trustShell'),
    completionStrip: documentRef.querySelector('.completion-strip'),
    contextBackdrop: documentRef.getElementById('contextDrawerBackdrop'),
    contextPanel: documentRef.getElementById('frameworkPanel'),
    contextFocusReturn: documentRef.getElementById('contextSidebarFocusReturn'),
    questionnairePanel: documentRef.getElementById('questionnairePanel'),
    questionnaireRenderRoot: documentRef.getElementById('questionnaireRenderRoot'),
    pagerMount: documentRef.getElementById('pagerMount'),
    contextProgressBar: documentRef.getElementById('frameworkProgress'),
    questionnaireProgressBar: documentRef.getElementById('questionnaireProgress'),
    aboutSurface: documentRef.getElementById('aboutSurfaceMount'),
    helpSurface: documentRef.getElementById('helpSurfaceMount'),
    aboutFocusReturn: documentRef.getElementById('aboutSurfaceFocusReturn'),
    helpFocusReturn: documentRef.getElementById('helpSurfaceFocusReturn'),
  };
};

export const initializeNavigation = ({ root = document, store }) => {
  const dom = resolveShellDom(root);
  const documentRef = dom.documentRef;
  const windowRef = getWindowRef(root);
  const cleanup = [];
  const lastSurfaceTriggers = new Map();
  const activeTimers = new Set();
  if (!dom.questionnairePanel || !dom.questionnaireRenderRoot) {
    return {
      navigateToPage() {
        return false;
      },
      destroy() {},
    };
  }

  let pageSections = [];
  let pageSectionsById = new Map();
  let lastSyncedState = store.getState();
  let questionnaireMutationObserver = null;
  let sidebar = null;
  let pager = null;
  let contextTracking = null;
  let progressDecorationFrame = 0;
  const contextDrawerMediaQuery = typeof windowRef.matchMedia === 'function'
    ? windowRef.matchMedia(CONTEXT_DRAWER_MEDIA_QUERY)
    : null;
  let isContextDrawerMode = Boolean(contextDrawerMediaQuery?.matches);

  if (isContextDrawerMode && selectShellSurfaceState(store.getState(), 'contextSidebar')) {
    store.actions.setSurfaceOpen('contextSidebar', false);
  }

  const aboutPanel = createAboutPanelController({ root });
  const helpPanel = createHelpPanelController({ root });
  const referenceDrawers = createReferenceDrawersRenderer({ root, store });

  const getContextDrawerDismissTarget = () =>
    dom.contextPanel?.querySelector('[data-surface-dismiss="contextSidebar"]') ?? dom.contextPanel;

  const setContextSidebarOpen = (
    isOpen,
    {
      trigger = null,
      focusAfterClose = true,
    } = {},
  ) => {
    const currentlyOpen = selectShellSurfaceState(store.getState(), 'contextSidebar');

    if (currentlyOpen === isOpen) {
      if (isOpen && trigger instanceof HTMLElement) {
        lastSurfaceTriggers.set('contextSidebar', trigger.id || null);
      }
      return;
    }

    if (isOpen && trigger instanceof HTMLElement) {
      lastSurfaceTriggers.set('contextSidebar', trigger.id || null);
    }

    if (isOpen && isContextDrawerMode) {
      OVERLAY_SURFACE_NAMES.forEach((surfaceName) => {
        if (selectShellSurfaceState(store.getState(), surfaceName)) {
          store.actions.setSurfaceOpen(surfaceName, false);
        }
      });
    }

    const lastTriggerId = lastSurfaceTriggers.get('contextSidebar');
    const lastTrigger = lastTriggerId ? documentRef.getElementById(lastTriggerId) : null;
    const stableContextToggle = documentRef.getElementById('toolbarContextToggle')
      ?? documentRef.getElementById('quickJumpContextToggle');

    if (!isOpen && focusAfterClose) {
      const precloseTarget = lastTrigger instanceof HTMLElement && lastTrigger.isConnected
        ? lastTrigger
        : dom.contextFocusReturn;

      if (precloseTarget instanceof HTMLElement && typeof precloseTarget.focus === 'function') {
        precloseTarget.focus({ preventScroll: true });
      }
    }

    store.actions.setSurfaceOpen('contextSidebar', isOpen);

    if (!isContextDrawerMode) {
      return;
    }

    if (isOpen) {
      windowRef.requestAnimationFrame(() => {
        focusElementWithRetry({
          windowRef,
          documentRef,
          primaryTarget: getContextDrawerDismissTarget(),
          fallbackTarget: dom.contextPanel,
        });
      });
      return;
    }

    if (!focusAfterClose) {
      return;
    }

    const drawerPanel = dom.contextPanel;
    if (drawerPanel instanceof HTMLElement) {
      const handleTransitionEnd = (event) => {
        if (event.target !== drawerPanel) {
          return;
        }
        drawerPanel.removeEventListener('transitionend', handleTransitionEnd);
        clearTimeout(fallbackTimer);
        focusElementWithRetry({
          windowRef,
          documentRef,
          primaryTarget: stableContextToggle ?? lastTrigger,
          fallbackTarget: lastTrigger ?? dom.contextFocusReturn,
        });
      };
      drawerPanel.addEventListener('transitionend', handleTransitionEnd);
      const fallbackTimer = windowRef.setTimeout(() => {
        activeTimers.delete(fallbackTimer);
        drawerPanel.removeEventListener('transitionend', handleTransitionEnd);
        focusElementWithRetry({
          windowRef,
          documentRef,
          primaryTarget: stableContextToggle ?? lastTrigger,
          fallbackTarget: lastTrigger ?? dom.contextFocusReturn,
        });
      }, 320);
      activeTimers.add(fallbackTimer);
    } else {
      focusElementWithRetry({
        windowRef,
        documentRef,
        primaryTarget: stableContextToggle ?? lastTrigger,
        fallbackTarget: lastTrigger ?? dom.contextFocusReturn,
      });
    }
  };

  const ensureContextDrawerClosedForFormFocus = () => {
    if (!isContextDrawerMode || !selectShellSurfaceState(store.getState(), 'contextSidebar')) {
      return;
    }

    setContextSidebarOpen(false, { focusAfterClose: false });
  };

  const focusPageSection = (pageId) => {
    const section = pageSectionsById.get(pageId);

    if (!(section instanceof HTMLElement)) {
      return;
    }

    windowRef.requestAnimationFrame(() => {
      section.focus();
    });
  };

  const updatePanelMetricsFromDom = (panelName, panel) => {
    if (!panel) {
      return;
    }

    store.actions.setPanelMetrics(panelName, measurePanel(panel));
  };

  const syncShellProgressState = (state) => {
    const overallProgress = state.derived.completionProgress?.overall ?? null;

    [dom.shellRoot, dom.questionnairePanel, dom.contextPanel].forEach((element) => {
      if (!(element instanceof HTMLElement)) {
        return;
      }

      element.dataset.progressState = overallProgress?.canonicalState ?? '';
      element.dataset.progressPercent = String(overallProgress?.completionPercent ?? 0);
    });
  };

  const syncCanonicalProgressDecorations = (state) => {
    PRINCIPLE_SECTION_IDS.forEach((pageId) => {
      const section = pageSectionsById.get(pageId);
      const heading = section?.querySelector('h2');
      const sectionProgress = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;
      const principleKey = toPrincipleKey(pageId);
      const stripCell = dom.completionStrip?.querySelector(`.strip-cell[data-page-id="${pageId}"]`);

      if (heading instanceof HTMLElement) {
        let badge = heading.querySelector('.completion-badge');

        if (!(badge instanceof HTMLElement)) {
          badge = documentRef.createElement('span');
          badge.className = `completion-badge ${principleKey}`;
          heading.appendChild(badge);
        }

        badge.dataset.progressState = sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
        badge.classList.toggle(
          'complete',
          sectionProgress?.canonicalState === PROGRESS_STATES.COMPLETE,
        );
        badge.textContent = formatProgressBadgeText(sectionProgress);
        badge.removeAttribute('title');
      }

      if (stripCell instanceof HTMLElement) {
        stripCell.dataset.progressState = sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
        stripCell.classList.toggle(
          'filled',
          sectionProgress?.canonicalState === PROGRESS_STATES.COMPLETE,
        );
      }
    });
  };

  const scheduleCanonicalProgressDecorations = (state) => {
    windowRef.cancelAnimationFrame(progressDecorationFrame);
    progressDecorationFrame = windowRef.requestAnimationFrame(() => {
      syncCanonicalProgressDecorations(state);
    });
  };

  let previousActivePageId = null;

  const syncPageVisibility = (state) => {
    const outgoingId = previousActivePageId;
    const incomingId = state.ui.activePageId;
    const isPageChange = outgoingId !== null && outgoingId !== incomingId;

    if (isPageChange) {
      const outgoing = outgoingId ? pageSectionsById.get(outgoingId) : null;
      const incoming = incomingId ? pageSectionsById.get(incomingId) : null;
      const prefersReducedMotion = windowRef.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (prefersReducedMotion) {
        // Skip transition classes entirely when reduced motion is preferred
        if (outgoing) {
          outgoing.classList.add('is-page-hidden');
        }
        if (incoming) {
          incoming.classList.remove('is-page-hidden');
        }
      } else {
        if (outgoing) {
          outgoing.classList.add('is-page-transitioning-out');
        }

        const transitionTimer = windowRef.setTimeout(() => {
          activeTimers.delete(transitionTimer);
          if (outgoing) {
            outgoing.classList.add('is-page-hidden');
            outgoing.classList.remove('is-page-transitioning-out');
          }
          if (incoming) {
            incoming.classList.remove('is-page-hidden');
            incoming.classList.add('is-page-transitioning-in');
            windowRef.requestAnimationFrame(() => {
              windowRef.requestAnimationFrame(() => {
                incoming.classList.remove('is-page-transitioning-in');
              });
            });
          }
        }, 150);
        activeTimers.add(transitionTimer);
      }
    }

    pageSections.forEach((section) => {
      const pageId = section.dataset.pageId;
      const isActive = pageId === incomingId;
      const pageState = state.derived.pageStates.bySectionId[pageId] ?? null;
      const sectionState = state.derived.sectionStates.bySectionId[pageId] ?? null;
      const sectionProgress = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;

      section.classList.toggle('is-active', isActive);
      if (!isPageChange) {
        section.classList.toggle('is-page-hidden', !isActive);
      }
      section.classList.toggle('is-page-read-only', Boolean(pageState?.isReadOnly));
      section.classList.toggle('is-page-system-skipped', pageState?.workflowState === 'system_skipped');
      section.setAttribute('aria-hidden', String(!isActive));
      section.dataset.workflowState = pageState?.workflowState ?? '';
      section.dataset.pageEditable = String(Boolean(pageState?.isEditable));
      section.dataset.pageAccessible = String(Boolean(pageState?.isAccessible));
      section.dataset.pageStatus = sectionState?.status ?? '';
      section.dataset.pageProgressState = sectionProgress?.canonicalState ?? '';
      section.dataset.pageCompletionPercent = String(sectionProgress?.completionPercent ?? 0);
      section.dataset.pageRequiredSatisfied = String(sectionProgress?.satisfiedRequiredFieldCount ?? 0);
      section.dataset.pageRequiredTotal = String(sectionProgress?.applicableRequiredFieldCount ?? 0);

      if (isActive) {
        section.removeAttribute('inert');
      } else {
        section.setAttribute('inert', '');
      }

      syncPageControlAvailability(section, Boolean(pageState?.isEditable && isActive));
    });

    previousActivePageId = incomingId;
  };

  const syncActiveAccent = (state) => {
    const activePageSection = pageSectionsById.get(state.ui.activePageId);
    const accentKey = activePageSection?.dataset.accentKey ?? 'control';

    documentRef.body.dataset.activeAccentKey = accentKey;

    if (dom.shellRoot) {
      dom.shellRoot.dataset.activeAccentKey = accentKey;
    }
  };

  const syncPanelTitles = (state) => {
    const activePageSection = pageSectionsById.get(state.ui.activePageId) ?? null;
    const activeAccentKey = activePageSection?.dataset.accentKey ?? null;

    ensurePanelTitleSuffix(
      dom.questionnairePanel,
      state.ui.activePageId,
      getHeadingText(activePageSection),
      documentRef,
      activeAccentKey,
    );
    ensurePanelTitleSuffix(
      dom.contextPanel,
      state.ui.activePageId,
      sidebar?.getCurrentContextHeading?.() ?? '',
      documentRef,
      activeAccentKey,
    );
  };

  const syncShellSurfaces = (state) => {
    const contextSidebarOpen = selectShellSurfaceState(state, 'contextSidebar');
    const contextDrawerOpen = isContextDrawerMode && contextSidebarOpen;
    const surfaceToggles = toArray(documentRef.querySelectorAll('[data-surface-toggle]'));

    if (dom.shellRoot) {
      dom.shellRoot.classList.toggle('is-context-collapsed', !isContextDrawerMode && !contextSidebarOpen);
      dom.shellRoot.classList.toggle('is-context-drawer-mode', isContextDrawerMode);
      dom.shellRoot.classList.toggle('is-context-drawer-open', contextDrawerOpen);
      dom.shellRoot.dataset.contextPresentation = isContextDrawerMode ? 'drawer' : 'sidebar';
    }

    if (dom.contextPanel) {
      dom.contextPanel.hidden = !isContextDrawerMode && !contextSidebarOpen;
      dom.contextPanel.dataset.contextPresentation = isContextDrawerMode ? 'drawer' : 'sidebar';
      dom.contextPanel.dataset.drawerState = contextDrawerOpen ? 'open' : 'closed';

      if (isContextDrawerMode) {
        dom.contextPanel.hidden = false;
        dom.contextPanel.setAttribute('aria-hidden', String(!contextDrawerOpen));
        dom.contextPanel.toggleAttribute('inert', !contextDrawerOpen);
      } else {
        dom.contextPanel.removeAttribute('aria-hidden');
        dom.contextPanel.removeAttribute('inert');
      }
    }

    if (dom.contextBackdrop) {
      dom.contextBackdrop.hidden = !contextDrawerOpen;
      dom.contextBackdrop.dataset.drawerState = contextDrawerOpen ? 'open' : 'closed';
    }

    if (dom.questionnairePanel) {
      if (contextDrawerOpen) {
        dom.questionnairePanel.setAttribute('aria-hidden', 'true');
        dom.questionnairePanel.setAttribute('inert', '');
      } else {
        dom.questionnairePanel.removeAttribute('aria-hidden');
        dom.questionnairePanel.removeAttribute('inert');
      }
    }

    [
      ['aboutSurface', dom.aboutSurface],
      ['helpSurface', dom.helpSurface],
    ].forEach(([surfaceName, element]) => {
      if (!element) {
        return;
      }

      const isOpen = selectShellSurfaceState(state, surfaceName);
      element.hidden = !isOpen;
      element.style.display = isOpen ? 'flex' : 'none';
      element.classList.toggle('is-open', isOpen);
    });

    surfaceToggles.forEach((button) => {
      const surfaceName = button.dataset.surfaceToggle;

      if (!surfaceName) {
        return;
      }

      button.setAttribute('aria-expanded', String(selectShellSurfaceState(state, surfaceName)));
    });
  };

  const syncFromState = (state) => {
    lastSyncedState = state;

    pager?.sync(state);
    sidebar?.sync(state);
    referenceDrawers.sync(state);
    aboutPanel.sync(state);
    helpPanel.sync(state);
    syncPageVisibility(state);
    syncActiveAccent(state);
    syncShellSurfaces(state);
    syncShellProgressState(state);
    syncPanelTitles(state);
    syncPanelMetrics(
      dom.contextPanel,
      dom.contextProgressBar,
      state.ui.panelMetrics.context,
    );
    syncPanelMetrics(
      dom.questionnairePanel,
      dom.questionnaireProgressBar,
      state.ui.panelMetrics.questionnaire,
    );
    scheduleCanonicalProgressDecorations(state);
  };

  const refreshPageSections = () => {
    pageSections = getRenderedPageSections(dom.questionnaireRenderRoot);
    pageSectionsById = new Map(
      pageSections.map((section) => [section.dataset.pageId, section]),
    );

    pageSections.forEach((section) => {
      section.tabIndex = -1;
    });

    sidebar?.refreshPageAnchors?.();
    syncPageVisibility(lastSyncedState);
    syncPanelTitles(lastSyncedState);
  };

  const scrollQuestionnaireTarget = (target, { focusTarget = false } = {}) => {
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const panelRect = dom.questionnairePanel.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const nextScrollTop = dom.questionnairePanel.scrollTop
      + (targetRect.top - panelRect.top)
      - QUESTIONNAIRE_SCROLL_OFFSET;

    dom.questionnairePanel.scrollTo({
      top: Math.max(nextScrollTop, 0),
      behavior: 'auto',
    });
    updatePanelMetricsFromDom(PANEL_NAMES.QUESTIONNAIRE, dom.questionnairePanel);

    if (focusTarget) {
      windowRef.requestAnimationFrame(() => {
        target.focus();
      });
    }
  };

  function navigateToPage(pageId, { focusTarget = false, resetSubAnchor = true } = {}) {
    if (!pageSectionsById.has(pageId)) {
      refreshPageSections();
    }

    if (!pageSectionsById.has(pageId)) {
      return false;
    }

    const pageState = store.getState().derived.pageStates.bySectionId[pageId];

    if (pageState?.isAccessible === false) {
      return false;
    }

    ensureContextDrawerClosedForFormFocus();

    if (resetSubAnchor) {
      contextTracking?.clearActiveSubAnchor?.();
    }

    store.actions.setActivePage(pageId);

    dom.questionnairePanel.scrollTo({ top: 0, behavior: 'auto' });
    updatePanelMetricsFromDom(PANEL_NAMES.QUESTIONNAIRE, dom.questionnairePanel);

    if (dom.contextPanel && !sidebar?.isPinned?.()) {
      dom.contextPanel.scrollTo({ top: 0, behavior: 'auto' });
      updatePanelMetricsFromDom(PANEL_NAMES.CONTEXT, dom.contextPanel);
    }

    if (focusTarget) {
      focusPageSection(pageId);
    }

    syncPanelTitles(store.getState());
    return true;
  }

  const navigateToSubAnchor = (descriptor) => {
    if (!descriptor) {
      return false;
    }

    ensureContextDrawerClosedForFormFocus();

    if (store.getState().ui.activePageId !== descriptor.pageId) {
      navigateToPage(descriptor.pageId, { resetSubAnchor: false });
    }

    const resolvedDescriptor = sidebar?.getSubAnchorTargetById?.(descriptor.id) ?? descriptor;

    if (!(resolvedDescriptor?.element instanceof HTMLElement)) {
      return false;
    }

    contextTracking?.setActiveSubAnchorById?.(resolvedDescriptor.id);
    scrollQuestionnaireTarget(resolvedDescriptor.element, { focusTarget: true });
    syncPanelTitles(store.getState());
    return true;
  };

  const setOverlaySurfaceOpen = (surfaceName, isOpen, trigger) => {
    if (!OVERLAY_SURFACE_NAMES.includes(surfaceName)) {
      store.actions.setSurfaceOpen(surfaceName, isOpen);
      return;
    }

    if (isOpen && isContextDrawerMode && selectShellSurfaceState(store.getState(), 'contextSidebar')) {
      setContextSidebarOpen(false, { focusAfterClose: false });
    }

    if (isOpen) {
      lastSurfaceTriggers.set(surfaceName, (trigger instanceof HTMLElement ? trigger.id : null)
        ?? (documentRef.activeElement instanceof HTMLElement ? documentRef.activeElement.id : null));

      OVERLAY_SURFACE_NAMES
        .filter((candidate) => candidate !== surfaceName)
        .forEach((candidate) => {
          store.actions.setSurfaceOpen(candidate, false);
        });
    }

    store.actions.setSurfaceOpen(surfaceName, isOpen);

    if (isOpen) {
      const surface = surfaceName === 'aboutSurface' ? dom.aboutSurface : dom.helpSurface;
      const dismissButton = surface?.querySelector(`[data-surface-dismiss="${surfaceName}"]`);

      windowRef.requestAnimationFrame(() => {
        focusElementWithRetry({
          windowRef,
          documentRef,
          primaryTarget: dismissButton,
        });
      });
      return;
    }

    const focusReturnAnchor = surfaceName === 'aboutSurface'
      ? dom.aboutFocusReturn
      : dom.helpFocusReturn;
    const storedId = lastSurfaceTriggers.get(surfaceName);
    const returnTarget = storedId ? documentRef.getElementById(storedId) : null;

    windowRef.requestAnimationFrame(() => {
      focusElementWithRetry({
        windowRef,
        documentRef,
        primaryTarget: returnTarget,
        fallbackTarget: focusReturnAnchor,
      });
    });
  };

  sidebar = createSidebarRenderer({
    root,
    store,
    navigateToPage,
    navigateToSubAnchor,
    openReferenceDrawer(drawerId) {
      if (!drawerId) {
        return;
      }

      store.actions.setReferenceDrawerOpen(drawerId, true);
    },
    openAboutTopic(topicId, trigger) {
      if (!topicId) {
        return;
      }

      aboutPanel.openTopic(topicId);
      setOverlaySurfaceOpen('aboutSurface', true, trigger);
    },
  });
  pager = createPagerController({ root, store, navigateToPage });
  contextTracking = createContextTrackingController({
    root,
    store,
    navigateToPage,
  });
  refreshPageSections();

  const surfaceToggleButtons = toArray(documentRef.querySelectorAll('[data-surface-toggle]'));
  const surfaceDismissButtons = toArray(documentRef.querySelectorAll('[data-surface-dismiss]'));

  const unsubscribe = store.subscribe((state) => {
    syncFromState(state);
  }, { immediate: true });
  cleanup.push(unsubscribe);

  surfaceToggleButtons.forEach((button) => {
    const handleClick = () => {
      const surfaceName = button.dataset.surfaceToggle;

      if (!surfaceName) {
        return;
      }

      if (surfaceName === 'contextSidebar') {
        const isCurrentlyOpen = selectShellSurfaceState(store.getState(), surfaceName);
        setContextSidebarOpen(!isCurrentlyOpen, { trigger: button });
        return;
      }

      if (surfaceName === 'aboutSurface') {
        const isCurrentlyOpen = selectShellSurfaceState(store.getState(), surfaceName);

        if (!isCurrentlyOpen) {
          aboutPanel.openSuggestedTopicForPage(store.getState().ui.activePageId);
        }

        setOverlaySurfaceOpen(surfaceName, !isCurrentlyOpen, button);
        return;
      }

      if (OVERLAY_SURFACE_NAMES.includes(surfaceName)) {
        const isCurrentlyOpen = selectShellSurfaceState(store.getState(), surfaceName);
        setOverlaySurfaceOpen(surfaceName, !isCurrentlyOpen, button);
        return;
      }

      store.actions.toggleSurface(surfaceName);
    };

    button.addEventListener('click', handleClick);
    cleanup.push(() => {
      button.removeEventListener('click', handleClick);
    });
  });

  surfaceDismissButtons.forEach((button) => {
    const handleClick = () => {
      const surfaceName = button.dataset.surfaceDismiss;

      if (!surfaceName) {
        return;
      }

      if (surfaceName === 'contextSidebar') {
        setContextSidebarOpen(false);
        return;
      }

      setOverlaySurfaceOpen(surfaceName, false);
    };

    button.addEventListener('click', handleClick);
    cleanup.push(() => {
      button.removeEventListener('click', handleClick);
    });
  });

  if (dom.contextPanel) {
    const handleContextScroll = () => {
      updatePanelMetricsFromDom(PANEL_NAMES.CONTEXT, dom.contextPanel);
    };

    dom.contextPanel.addEventListener('scroll', handleContextScroll, { passive: true });
    cleanup.push(() => {
      dom.contextPanel.removeEventListener('scroll', handleContextScroll);
    });
    handleContextScroll();
  }

  const handleQuestionnaireScroll = () => {
    updatePanelMetricsFromDom(PANEL_NAMES.QUESTIONNAIRE, dom.questionnairePanel);
  };

  dom.questionnairePanel.addEventListener('scroll', handleQuestionnaireScroll, { passive: true });
  cleanup.push(() => {
    dom.questionnairePanel.removeEventListener('scroll', handleQuestionnaireScroll);
  });
  handleQuestionnaireScroll();

  const handleDocumentKeydown = (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    const state = store.getState();

    if (selectShellSurfaceState(state, 'helpSurface')) {
      event.preventDefault();
      setOverlaySurfaceOpen('helpSurface', false);
      return;
    }

    if (selectShellSurfaceState(state, 'aboutSurface')) {
      event.preventDefault();
      setOverlaySurfaceOpen('aboutSurface', false);
      return;
    }

    if (isContextDrawerMode && selectShellSurfaceState(state, 'contextSidebar')) {
      event.preventDefault();
      setContextSidebarOpen(false);
    }
  };

  documentRef.addEventListener('keydown', handleDocumentKeydown);
  cleanup.push(() => {
    documentRef.removeEventListener('keydown', handleDocumentKeydown);
  });

  if (contextDrawerMediaQuery) {
    const handleContextDrawerModeChange = (event) => {
      const nextMatches = typeof event === 'boolean' ? event : Boolean(event.matches);

      if (nextMatches === isContextDrawerMode) {
        syncShellSurfaces(store.getState());
        return;
      }

      isContextDrawerMode = nextMatches;

      if (isContextDrawerMode && selectShellSurfaceState(store.getState(), 'contextSidebar')) {
        setContextSidebarOpen(false, { focusAfterClose: false });
        return;
      }

      syncShellSurfaces(store.getState());
    };

    if (typeof contextDrawerMediaQuery.addEventListener === 'function') {
      contextDrawerMediaQuery.addEventListener('change', handleContextDrawerModeChange);
      cleanup.push(() => {
        contextDrawerMediaQuery.removeEventListener('change', handleContextDrawerModeChange);
      });
    } else if (typeof contextDrawerMediaQuery.addListener === 'function') {
      contextDrawerMediaQuery.addListener(handleContextDrawerModeChange);
      cleanup.push(() => {
        contextDrawerMediaQuery.removeListener(handleContextDrawerModeChange);
      });
    }
  }

  if ('MutationObserver' in windowRef) {
    let observerPending = false;
    questionnaireMutationObserver = new windowRef.MutationObserver(() => {
      if (observerPending) return;
      observerPending = true;
      windowRef.requestAnimationFrame(() => {
        observerPending = false;
        refreshPageSections();
        syncFromState(store.getState());
      });
    });

    questionnaireMutationObserver.observe(dom.questionnaireRenderRoot, {
      childList: true,
    });

    cleanup.push(() => {
      questionnaireMutationObserver?.disconnect();
    });
  }

  return {
    navigateToPage,
    destroy() {
      windowRef.cancelAnimationFrame(progressDecorationFrame);
      activeTimers.forEach((timer) => windowRef.clearTimeout(timer));
      activeTimers.clear();
      lastSurfaceTriggers.clear();
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
      contextTracking?.destroy?.();
      pager?.destroy?.();
      sidebar?.destroy?.();
      referenceDrawers.destroy();
      aboutPanel.destroy();
      helpPanel.destroy();
    },
  };
};
