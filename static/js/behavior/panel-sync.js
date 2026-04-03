import { getSectionDefinition } from '../config/sections.js';
import { selectQuickJumpPageIds } from '../state/store.js';

const PANEL_SCROLL_OFFSET = 12;
const INTERSECTION_THRESHOLD = 0.18;
const QUICK_JUMP_COLOR_BY_KEY = Object.freeze({
  tr: 'var(--tr)',
  re: 'var(--re)',
  uc: 'var(--uc)',
  se: 'var(--se-dark)',
  tc: 'var(--tc-dark)',
});

const toArray = (value) => Array.from(value ?? []);

const toPrincipleKey = (pageId) => {
  const key = typeof pageId === 'string' ? pageId.toLowerCase() : '';
  return QUICK_JUMP_COLOR_BY_KEY[key] ? key : null;
};

const parseTopicIds = (rawValue) =>
  typeof rawValue === 'string'
    ? rawValue.trim().split(/\s+/).filter(Boolean)
    : [];

const getDocumentRef = (root) => root?.ownerDocument ?? root ?? document;

const getWindowRef = (root) => getDocumentRef(root).defaultView ?? window;

const getHeadingText = (section) => {
  const heading = section?.querySelector('h2');

  if (!heading) {
    return '';
  }

  return toArray(heading.childNodes)
    .filter((node) => {
      return !(
        node instanceof HTMLElement &&
        node.classList.contains('completion-badge')
      );
    })
    .map((node) => node.textContent ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const ensurePanelTitleSuffix = (panel, pageId, label) => {
  const title = panel?.querySelector('.panel-title');

  if (!title) {
    return;
  }

  let suffix = title.querySelector('.panel-title-section');

  if (!suffix) {
    suffix = document.createElement('span');
    suffix.className = 'panel-title-section';
    title.appendChild(suffix);
  }

  suffix.className = 'panel-title-section';

  const principleKey = toPrincipleKey(pageId);
  if (principleKey) {
    suffix.classList.add(principleKey);
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

const revealPanelOffset = (panel, offsetTop, prefersReducedMotion) => {
  panel.scrollTo({
    top: Math.max(offsetTop - PANEL_SCROLL_OFFSET, 0),
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });
};

const resolveShellDom = (root) => {
  const documentRef = getDocumentRef(root);

  return {
    documentRef,
    contextPanel: documentRef.getElementById('frameworkPanel'),
    questionnairePanel: documentRef.getElementById('questionnairePanel'),
    contextSidebarMount: documentRef.getElementById('contextSidebarMount'),
    questionnaireRenderRoot: documentRef.getElementById('questionnaireRenderRoot'),
    navButtons: toArray(documentRef.querySelectorAll('.nav-button[data-page-id]')),
    navIndicator: documentRef.getElementById('navIndicator'),
    contextProgressBar: documentRef.getElementById('frameworkProgress'),
    questionnaireProgressBar: documentRef.getElementById('questionnaireProgress'),
  };
};

export const createPanelSyncController = ({ root = document, store }) => {
  const dom = resolveShellDom(root);
  const windowRef = getWindowRef(root);
  const prefersReducedMotion = Boolean(
    windowRef.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  const pageSections = dom.questionnaireRenderRoot
    ? toArray(dom.questionnaireRenderRoot.querySelectorAll('[data-page-id]'))
    : [];
  const contextSections = dom.contextSidebarMount
    ? toArray(dom.contextSidebarMount.querySelectorAll('[data-topic-ids]'))
    : [];
  const pageSectionsById = new Map(
    pageSections.map((section) => [section.dataset.pageId, section]),
  );
  const cleanup = [];
  let resizeFrame = 0;

  const getContextSectionsForTopic = (topicId) => {
    if (!topicId) {
      return [];
    }

    return contextSections.filter((section) =>
      parseTopicIds(section.dataset.topicIds).includes(topicId),
    );
  };

  const syncQuickJump = (state) => {
    const availableQuickJumpPageIds = new Set(selectQuickJumpPageIds(state));
    const activePageId = state.ui.activePageId;

    dom.navButtons.forEach((button) => {
      const pageId = button.dataset.pageId;
      const isAvailable = availableQuickJumpPageIds.has(pageId);
      const isActive = activePageId === pageId;

      button.disabled = !isAvailable;
      button.classList.toggle('active', isAvailable && isActive);

      if (isAvailable && isActive) {
        button.setAttribute('aria-current', 'page');
      } else {
        button.removeAttribute('aria-current');
      }
    });

    const principleKey = toPrincipleKey(activePageId);
    const activeButton = dom.navButtons.find((button) => button.dataset.pageId === activePageId);

    if (!dom.navIndicator || !principleKey || !activeButton) {
      if (dom.navIndicator) {
        dom.navIndicator.style.width = '0px';
      }
      return;
    }

    const nav = activeButton.parentElement;
    const navRect = nav.getBoundingClientRect();
    const buttonRect = activeButton.getBoundingClientRect();

    dom.navIndicator.style.left = `${buttonRect.left - navRect.left}px`;
    dom.navIndicator.style.width = `${buttonRect.width}px`;
    dom.navIndicator.style.background = QUICK_JUMP_COLOR_BY_KEY[principleKey];
  };

  const syncPanelMetrics = (panel, progressBar, metrics) => {
    if (progressBar) {
      progressBar.style.width = `${metrics.progressPercent}%`;
    }

    if (!panel) {
      return;
    }

    panel.classList.toggle('can-scroll-up', metrics.canScrollUp);
    panel.classList.toggle('can-scroll-down', metrics.canScrollDown);
  };

  const syncContextSurface = (state) => {
    const activePageId = state.ui.activePageId;
    const activeTopicId = state.ui.activeContextTopicId;
    const matchedContextSections = getContextSectionsForTopic(activeTopicId);
    const activePageSection = pageSectionsById.get(activePageId) ?? null;

    contextSections.forEach((section) => {
      section.classList.toggle('is-active', matchedContextSections.includes(section));
    });

    ensurePanelTitleSuffix(
      dom.questionnairePanel,
      activePageId,
      getHeadingText(activePageSection),
    );
    ensurePanelTitleSuffix(
      dom.contextPanel,
      activePageId,
      getHeadingText(matchedContextSections[0] ?? null),
    );
  };

  const syncFromState = (state) => {
    syncQuickJump(state);
    syncContextSurface(state);
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
  };

  const updatePanelMetricsFromDom = (panelName, panel) => {
    if (!panel) {
      return;
    }

    store.actions.setPanelMetrics(panelName, measurePanel(panel));
  };

  const revealContextForPage = (pageId) => {
    if (!dom.contextPanel) {
      return;
    }

    const topicId = getSectionDefinition(pageId)?.contextTopicId ?? null;
    const matchedContextSections = getContextSectionsForTopic(topicId);

    if (!matchedContextSections.length) {
      return;
    }

    revealPanelOffset(
      dom.contextPanel,
      matchedContextSections[0].offsetTop,
      prefersReducedMotion,
    );
  };

  const navigateToPage = (pageId, { revealContext = false } = {}) => {
    const targetSection = pageSectionsById.get(pageId);

    if (!targetSection || !dom.questionnairePanel) {
      return false;
    }

    revealPanelOffset(
      dom.questionnairePanel,
      targetSection.offsetTop,
      prefersReducedMotion,
    );
    store.actions.setActivePage(pageId);

    if (revealContext) {
      revealContextForPage(pageId);
    }

    return true;
  };

  const unsubscribe = store.subscribe((state) => {
    syncFromState(state);
  }, { immediate: true });
  cleanup.push(unsubscribe);

  if (dom.contextPanel) {
    const handleContextScroll = () => {
      updatePanelMetricsFromDom('context', dom.contextPanel);
    };

    dom.contextPanel.addEventListener('scroll', handleContextScroll, { passive: true });
    cleanup.push(() => {
      dom.contextPanel.removeEventListener('scroll', handleContextScroll);
    });
    handleContextScroll();
  }

  if (dom.questionnairePanel) {
    const handleQuestionnaireScroll = () => {
      updatePanelMetricsFromDom('questionnaire', dom.questionnairePanel);
    };

    dom.questionnairePanel.addEventListener('scroll', handleQuestionnaireScroll, { passive: true });
    cleanup.push(() => {
      dom.questionnairePanel.removeEventListener('scroll', handleQuestionnaireScroll);
    });
    handleQuestionnaireScroll();
  }

  dom.navButtons.forEach((button) => {
    const handleClick = () => {
      navigateToPage(button.dataset.pageId, { revealContext: true });
    };

    button.addEventListener('click', handleClick);
    cleanup.push(() => {
      button.removeEventListener('click', handleClick);
    });
  });

  if (dom.questionnairePanel && pageSections.length && 'IntersectionObserver' in windowRef) {
    const observer = new windowRef.IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle('is-active', entry.isIntersecting);
        });

        store.actions.recordPageVisibilities(
          entries.map((entry) => ({
            pageId: entry.target.dataset.pageId,
            ratio: entry.isIntersecting ? entry.intersectionRatio : 0,
          })),
          INTERSECTION_THRESHOLD,
        );
      },
      {
        root: dom.questionnairePanel,
        threshold: [0.2, 0.5],
      },
    );

    pageSections.forEach((section) => {
      observer.observe(section);
    });

    cleanup.push(() => {
      observer.disconnect();
    });
  }

  const handleResize = () => {
    windowRef.cancelAnimationFrame(resizeFrame);
    resizeFrame = windowRef.requestAnimationFrame(() => {
      syncQuickJump(store.getState());
    });
  };

  windowRef.addEventListener('resize', handleResize);
  cleanup.push(() => {
    windowRef.removeEventListener('resize', handleResize);
    windowRef.cancelAnimationFrame(resizeFrame);
  });

  return {
    navigateToPage,
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
