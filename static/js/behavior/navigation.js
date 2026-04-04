import { createContextTrackingController } from './context-tracking.js';
import { createPagerController } from './pager.js';
import { createAboutPanelController } from '../render/about-panel.js';
import { createHelpPanelController } from '../render/help-panel.js';
import { createReferenceDrawersRenderer } from '../render/reference-drawers.js';
import { createSidebarRenderer } from '../render/sidebar.js';
import { PROGRESS_STATES } from '../state/derive.js';
import { selectSidebarOpen, selectSidebarActiveTab } from '../state/store.js';
import { toArray, getDocumentRef } from '../utils/shared.js';
import { PRINCIPLE_SECTION_IDS, getSectionDefinition } from '../config/sections.js';

const PANEL_NAMES = Object.freeze({
  CONTEXT: 'context',
  QUESTIONNAIRE: 'questionnaire',
});

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
      return !(node instanceof HTMLElement && node.classList.contains('completion-badge'));
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
  const primary =
    primaryTarget instanceof HTMLElement && primaryTarget.isConnected ? primaryTarget : null;
  const fallback =
    fallbackTarget instanceof HTMLElement && fallbackTarget.isConnected ? fallbackTarget : null;
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
    contextFocusReturn: documentRef.getElementById('sidebarFocusReturn'),
    questionnairePanel: documentRef.getElementById('questionnairePanel'),
    questionnaireRenderRoot: documentRef.getElementById('questionnaireRenderRoot'),
    pagerMount: documentRef.getElementById('pagerMount'),
    contextProgressBar: documentRef.getElementById('frameworkProgress'),
    questionnaireProgressBar: documentRef.getElementById('questionnaireProgress'),
    tabBar: documentRef.querySelector('.sidebar-tab-bar'),
    tabButtons: documentRef.querySelectorAll('.sidebar-tab[data-sidebar-tab]'),
    tabPanels: documentRef.querySelectorAll('.sidebar-tab-panel[data-sidebar-panel]'),
    tabIndicator: documentRef.querySelector('.sidebar-tab-indicator'),
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
    const shellDivider = documentRef.querySelector('.shell-divider');
    if (shellDivider && dom.shellRoot) {
      const SIDEBAR_WIDTH_KEY = 'trust-sidebar-width';
      let isDraggingSidebar = false;

      try {
        const saved = windowRef.localStorage.getItem(SIDEBAR_WIDTH_KEY);
        if (saved) {
          const remSize = parseFloat(getComputedStyle(documentRef.documentElement).fontSize) || 16;
          const px = parseFloat(saved);
          const minPx = 20 * remSize;
          const maxPx = Math.min(36 * remSize, windowRef.innerWidth - 600);
          const clamped = Math.max(minPx, Math.min(px, maxPx));
          dom.shellRoot.style.setProperty('--sidebar-width', `${clamped}px`);
        }
      } catch (_) {}

      const clampSidebarWidth = (px) => {
        const remSize = parseFloat(getComputedStyle(documentRef.documentElement).fontSize) || 16;
        const minPx = 20 * remSize;
        const maxPx = Math.min(36 * remSize, windowRef.innerWidth - 600);
        return Math.max(minPx, Math.min(px, maxPx));
      };

      const onDividerPointerDown = (event) => {
        if (isContextDrawerMode || event.button !== 0) return;
        isDraggingSidebar = true;
        shellDivider.setPointerCapture(event.pointerId);
        documentRef.body.style.cursor = 'col-resize';
        documentRef.body.style.userSelect = 'none';
        event.preventDefault();
      };

      const onDividerPointerMove = (event) => {
        if (!isDraggingSidebar) return;
        const shellRect = dom.shellRoot.getBoundingClientRect();
        const px = clampSidebarWidth(shellRect.right - event.clientX);
        dom.shellRoot.style.setProperty('--sidebar-width', `${px}px`);
      };

      const onDividerPointerUp = (event) => {
        if (!isDraggingSidebar) return;
        isDraggingSidebar = false;
        try {
          shellDivider.releasePointerCapture(event.pointerId);
        } catch (_) {}
        documentRef.body.style.cursor = '';
        documentRef.body.style.userSelect = '';
        const raw = dom.shellRoot.style.getPropertyValue('--sidebar-width');
        try {
          windowRef.localStorage.setItem(SIDEBAR_WIDTH_KEY, raw);
        } catch (_) {}
      };

      shellDivider.addEventListener('pointerdown', onDividerPointerDown);
      shellDivider.addEventListener('pointermove', onDividerPointerMove);
      shellDivider.addEventListener('pointerup', onDividerPointerUp);
      cleanup.push(() => {
        shellDivider.removeEventListener('pointerdown', onDividerPointerDown);
        shellDivider.removeEventListener('pointermove', onDividerPointerMove);
        shellDivider.removeEventListener('pointerup', onDividerPointerUp);
      });
    }

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
  const contextDrawerMediaQuery =
    typeof windowRef.matchMedia === 'function'
      ? windowRef.matchMedia(CONTEXT_DRAWER_MEDIA_QUERY)
      : null;
  let isContextDrawerMode = Boolean(contextDrawerMediaQuery?.matches);

  if (isContextDrawerMode) {
    const sidebarBtn = documentRef.getElementById('sidebarToggle');
    if (sidebarBtn) {
      sidebarBtn.setAttribute('aria-label', 'Open sidebar drawer');
    }
  }

  if (isContextDrawerMode && selectSidebarOpen(store.getState())) {
    store.actions.setSidebarOpen(false);
  }

  const aboutPanel = createAboutPanelController({ root });
  const helpPanel = createHelpPanelController({ root });
  const referenceDrawers = createReferenceDrawersRenderer({ root, store });

  const getContextDrawerDismissTarget = () =>
    dom.contextPanel?.querySelector('[data-sidebar-dismiss]') ?? dom.contextPanel;

  const setSidebarOpenState = (isOpen, { trigger = null, focusAfterClose = true } = {}) => {
    const currentlyOpen = selectSidebarOpen(store.getState());

    if (currentlyOpen === isOpen) {
      if (isOpen && trigger instanceof HTMLElement) {
        lastSurfaceTriggers.set('sidebar', trigger.id || null);
      }
      return;
    }

    if (isOpen && trigger instanceof HTMLElement) {
      lastSurfaceTriggers.set('sidebar', trigger.id || null);
    }

    const lastTriggerId = lastSurfaceTriggers.get('sidebar');
    const lastTrigger = lastTriggerId ? documentRef.getElementById(lastTriggerId) : null;
    const stableToggle = documentRef.getElementById('sidebarToggle');

    if (!isOpen && focusAfterClose) {
      const precloseTarget =
        lastTrigger instanceof HTMLElement && lastTrigger.isConnected
          ? lastTrigger
          : dom.contextFocusReturn;

      if (precloseTarget instanceof HTMLElement && typeof precloseTarget.focus === 'function') {
        precloseTarget.focus({ preventScroll: true });
      }
    }

    store.actions.setSidebarOpen(isOpen);

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
          primaryTarget: stableToggle ?? lastTrigger,
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
          primaryTarget: stableToggle ?? lastTrigger,
          fallbackTarget: lastTrigger ?? dom.contextFocusReturn,
        });
      }, 320);
      activeTimers.add(fallbackTimer);
    } else {
      focusElementWithRetry({
        windowRef,
        documentRef,
        primaryTarget: stableToggle ?? lastTrigger,
        fallbackTarget: lastTrigger ?? dom.contextFocusReturn,
      });
    }
  };

  const ensureContextDrawerClosedForFormFocus = () => {
    if (!isContextDrawerMode || !selectSidebarOpen(store.getState())) {
      return;
    }

    setSidebarOpenState(false, { focusAfterClose: false });
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

        badge.dataset.progressState =
          sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
        badge.classList.toggle(
          'complete',
          sectionProgress?.canonicalState === PROGRESS_STATES.COMPLETE,
        );
        badge.textContent = formatProgressBadgeText(sectionProgress);
        badge.removeAttribute('title');
      }

      if (stripCell instanceof HTMLElement) {
        stripCell.dataset.progressState =
          sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
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
      section.classList.toggle(
        'is-page-system-skipped',
        pageState?.workflowState === 'system_skipped',
      );
      section.setAttribute('aria-hidden', String(!isActive));
      section.dataset.workflowState = pageState?.workflowState ?? '';
      section.dataset.pageEditable = String(Boolean(pageState?.isEditable));
      section.dataset.pageAccessible = String(Boolean(pageState?.isAccessible));
      section.dataset.pageStatus = sectionState?.status ?? '';
      section.dataset.pageProgressState = sectionProgress?.canonicalState ?? '';
      section.dataset.pageCompletionPercent = String(sectionProgress?.completionPercent ?? 0);
      section.dataset.pageRequiredSatisfied = String(
        sectionProgress?.satisfiedRequiredFieldCount ?? 0,
      );
      section.dataset.pageRequiredTotal = String(
        sectionProgress?.applicableRequiredFieldCount ?? 0,
      );

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

    let headingText = getHeadingText(activePageSection);
    if (!headingText) {
      const sectionDef = getSectionDefinition(state.ui.activePageId);
      headingText = sectionDef?.title ?? '';
    }

    ensurePanelTitleSuffix(
      dom.questionnairePanel,
      state.ui.activePageId,
      headingText,
      documentRef,
      activeAccentKey,
    );
    const contextHeading = sidebar?.getCurrentContextHeading?.() ?? '';
    const contextLabel =
      sidebar?.isPinned?.() && contextHeading ? `${contextHeading} (pinned)` : contextHeading;
    ensurePanelTitleSuffix(
      dom.contextPanel,
      state.ui.activePageId,
      contextLabel,
      documentRef,
      activeAccentKey,
    );
  };

  const updateTabIndicator = (activeTab) => {
    if (!dom.tabIndicator || !dom.tabBar) return;

    const activeButton = dom.tabBar.querySelector(`[data-sidebar-tab="${activeTab}"]`);
    if (!activeButton) return;

    dom.tabIndicator.style.transform = `translateX(${activeButton.offsetLeft}px)`;
    dom.tabIndicator.style.width = `${activeButton.offsetWidth}px`;
  };

  const syncSidebarPanel = (state) => {
    const sidebarOpen = selectSidebarOpen(state);
    const activeTab = selectSidebarActiveTab(state);
    const contextDrawerOpen = isContextDrawerMode && sidebarOpen;

    if (dom.shellRoot) {
      dom.shellRoot.classList.toggle('is-sidebar-collapsed', !sidebarOpen);
      dom.shellRoot.classList.toggle('is-context-drawer-mode', isContextDrawerMode);
      dom.shellRoot.classList.toggle('is-context-drawer-open', contextDrawerOpen);
      dom.shellRoot.dataset.contextPresentation = isContextDrawerMode ? 'drawer' : 'sidebar';
    }

    if (dom.contextPanel) {
      dom.contextPanel.hidden = !isContextDrawerMode && !sidebarOpen;
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

    dom.tabButtons?.forEach((button) => {
      const isActive = button.dataset.sidebarTab === activeTab;
      button.setAttribute('aria-selected', String(isActive));
      button.tabIndex = isActive ? 0 : -1;
      button.classList.toggle('is-active', isActive);
    });

    dom.tabPanels?.forEach((panel) => {
      const isActive = panel.dataset.sidebarPanel === activeTab;
      panel.hidden = !isActive;
      panel.classList.toggle('is-active', isActive);
    });

    updateTabIndicator(activeTab);

    const toggleButton = documentRef.querySelector('[data-sidebar-toggle]');
    if (toggleButton) {
      toggleButton.setAttribute('aria-expanded', String(sidebarOpen));
    }
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
    syncSidebarPanel(state);
    syncShellProgressState(state);
    syncPanelTitles(state);
    syncPanelMetrics(dom.contextPanel, dom.contextProgressBar, state.ui.panelMetrics.context);
    syncPanelMetrics(
      dom.questionnairePanel,
      dom.questionnaireProgressBar,
      state.ui.panelMetrics.questionnaire,
    );
    scheduleCanonicalProgressDecorations(state);
  };

  const refreshPageSections = () => {
    pageSections = getRenderedPageSections(dom.questionnaireRenderRoot);
    pageSectionsById = new Map(pageSections.map((section) => [section.dataset.pageId, section]));

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
    const nextScrollTop = dom.questionnairePanel.scrollTop + (targetRect.top - panelRect.top) - 16;

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

    return true;
  }

  const navigateToSubAnchor = (descriptor) => {
    if (!descriptor) {
      return false;
    }

    ensureContextDrawerClosedForFormFocus();

    const needsPageChange = store.getState().ui.activePageId !== descriptor.pageId;

    if (needsPageChange) {
      if (!pageSectionsById.has(descriptor.pageId)) {
        refreshPageSections();
      }
      if (!pageSectionsById.has(descriptor.pageId)) {
        return false;
      }
      const pageState = store.getState().derived.pageStates.bySectionId[descriptor.pageId];
      if (pageState?.isAccessible === false) {
        return false;
      }
    }

    store.actions.setActivePageWithAnchor(descriptor.pageId, descriptor.id);

    if (needsPageChange) {
      dom.questionnairePanel.scrollTo({ top: 0, behavior: 'auto' });
      updatePanelMetricsFromDom(PANEL_NAMES.QUESTIONNAIRE, dom.questionnairePanel);
      if (dom.contextPanel && !sidebar?.isPinned?.()) {
        dom.contextPanel.scrollTo({ top: 0, behavior: 'auto' });
        updatePanelMetricsFromDom(PANEL_NAMES.CONTEXT, dom.contextPanel);
      }
    }

    const resolvedDescriptor = sidebar?.getSubAnchorTargetById?.(descriptor.id) ?? descriptor;

    if (!(resolvedDescriptor?.element instanceof HTMLElement)) {
      return false;
    }

    scrollQuestionnaireTarget(resolvedDescriptor.element, { focusTarget: true });
    syncPanelTitles(store.getState());
    return true;
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
      store.actions.setSidebarActiveTab('reference');
    },
    openAboutTopic(topicId, trigger) {
      if (!topicId) {
        return;
      }

      store.actions.setSidebarActiveTab('about');
      aboutPanel.openTopic(topicId);
    },
  });
  pager = createPagerController({ root, store, navigateToPage });
  contextTracking = createContextTrackingController({
    root,
    store,
    navigateToPage,
  });
  refreshPageSections();

  const handleSidebarToggle = () => {
    const isCurrentlyOpen = selectSidebarOpen(store.getState());
    setSidebarOpenState(!isCurrentlyOpen, {
      trigger: documentRef.getElementById('sidebarToggle'),
    });
  };

  const handleSidebarDismiss = () => {
    setSidebarOpenState(false);
  };

  const handleTabClick = (event) => {
    const tab = event.target.closest('[data-sidebar-tab]');
    if (!(tab instanceof HTMLButtonElement)) return;

    store.actions.setSidebarActiveTab(tab.dataset.sidebarTab);
  };

  const handleTabKeydown = (event) => {
    const tab = event.target.closest('[data-sidebar-tab]');
    if (!(tab instanceof HTMLButtonElement)) return;

    const tabs = Array.from(dom.tabButtons ?? []);
    const currentIndex = tabs.indexOf(tab);

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      event.preventDefault();
      const next = tabs[(currentIndex + 1) % tabs.length];
      next?.focus();
      store.actions.setSidebarActiveTab(next.dataset.sidebarTab);
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
      prev?.focus();
      store.actions.setSidebarActiveTab(prev.dataset.sidebarTab);
      return;
    }
  };

  const unsubscribe = store.subscribe(
    (state) => {
      syncFromState(state);
    },
    { immediate: true },
  );
  cleanup.push(unsubscribe);

  const toggleButton = documentRef.querySelector('[data-sidebar-toggle]');
  if (toggleButton) {
    toggleButton.addEventListener('click', handleSidebarToggle);
    cleanup.push(() => toggleButton.removeEventListener('click', handleSidebarToggle));
  }

  const dismissButtons = toArray(documentRef.querySelectorAll('[data-sidebar-dismiss]'));
  dismissButtons.forEach((button) => {
    button.addEventListener('click', handleSidebarDismiss);
    cleanup.push(() => button.removeEventListener('click', handleSidebarDismiss));
  });

  if (dom.tabBar) {
    dom.tabBar.addEventListener('click', handleTabClick);
    dom.tabBar.addEventListener('keydown', handleTabKeydown);
    cleanup.push(() => {
      dom.tabBar.removeEventListener('click', handleTabClick);
      dom.tabBar.removeEventListener('keydown', handleTabKeydown);
    });
  }

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

  if (dom.contextBackdrop) {
    const handleBackdropClick = () => {
      if (isContextDrawerMode && selectSidebarOpen(store.getState())) {
        setSidebarOpenState(false);
      }
    };

    dom.contextBackdrop.addEventListener('click', handleBackdropClick);
    cleanup.push(() => {
      dom.contextBackdrop.removeEventListener('click', handleBackdropClick);
    });
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

    if (isContextDrawerMode && selectSidebarOpen(store.getState())) {
      event.preventDefault();
      setSidebarOpenState(false);
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
        syncSidebarPanel(store.getState());
        return;
      }

      isContextDrawerMode = nextMatches;

      const sidebarBtn = documentRef.getElementById('sidebarToggle');
      if (sidebarBtn) {
        sidebarBtn.setAttribute(
          'aria-label',
          isContextDrawerMode ? 'Open sidebar drawer' : 'Toggle sidebar panel',
        );
      }

      if (isContextDrawerMode && selectSidebarOpen(store.getState())) {
        setSidebarOpenState(false, { focusAfterClose: false });
        return;
      }

      syncSidebarPanel(store.getState());
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
        syncPageVisibility(store.getState());
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
