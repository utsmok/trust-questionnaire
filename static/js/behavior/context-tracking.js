import { getSectionDefinition } from '../config/sections.js';
import { getDocumentRef } from '../utils/shared.js';

export const resolvePageIdFromHash = (hash, pageOrder) => {
  const normalizedHash =
    typeof hash === 'string' ? hash.replace(/^#/, '').trim().toLowerCase() : '';

  if (!normalizedHash) {
    return null;
  }

  return (
    pageOrder.find((pageId) => {
      const pageDefinition = getSectionDefinition(pageId);

      return (
        normalizedHash === pageId.toLowerCase() ||
        normalizedHash === pageDefinition?.slug?.toLowerCase()
      );
    }) ?? null
  );
};

export const updateHashForPage = (windowRef, pageId) => {
  const pageDefinition = getSectionDefinition(pageId);
  const nextHash = pageDefinition?.slug ?? pageId?.toLowerCase();

  if (!nextHash || windowRef.location.hash === `#${nextHash}`) {
    return;
  }

  const nextUrl = `${windowRef.location.pathname}${windowRef.location.search}#${nextHash}`;
  windowRef.history?.replaceState?.(null, '', nextUrl);
};

export const createContextTrackingController = ({ root = document, store, navigateToPage }) => {
  const documentRef = getDocumentRef(root);
  const windowRef = documentRef.defaultView ?? window;
  const questionnaireRenderRoot = documentRef.getElementById('questionnaireRenderRoot');
  const cleanup = [];

  if (!questionnaireRenderRoot) {
    return {
      clearActiveSubAnchor() {},
      setActiveSubAnchorById() {},
      destroy() {},
    };
  }

  const setActiveSubAnchorById = (anchorId) => {
    store.actions.setActiveSubAnchor(anchorId || null);
  };

  const clearActiveSubAnchor = () => {
    setActiveSubAnchorById(null);
  };

  const handleQuestionnaireContextTarget = (event) => {
    const anchorElement = event.target.closest?.('[data-context-anchor-id]');

    if (!(anchorElement instanceof HTMLElement)) {
      return;
    }

    const pageSection = anchorElement.closest('[data-page-id]');

    if (pageSection?.dataset.pageId !== store.getState().ui.activePageId) {
      return;
    }

    setActiveSubAnchorById(anchorElement.dataset.contextAnchorId || null);
  };

  const handleHashChange = () => {
    const targetPageId = resolvePageIdFromHash(
      windowRef.location.hash,
      store.getState().ui.pageOrder,
    );

    if (!targetPageId) {
      return;
    }

    navigateToPage(targetPageId, { resetSubAnchor: true });
  };

  questionnaireRenderRoot.addEventListener('focusin', handleQuestionnaireContextTarget);
  questionnaireRenderRoot.addEventListener('click', handleQuestionnaireContextTarget);
  windowRef.addEventListener('hashchange', handleHashChange);

  cleanup.push(() => {
    questionnaireRenderRoot.removeEventListener('focusin', handleQuestionnaireContextTarget);
    questionnaireRenderRoot.removeEventListener('click', handleQuestionnaireContextTarget);
    windowRef.removeEventListener('hashchange', handleHashChange);
  });

  const initialPageId = resolvePageIdFromHash(
    windowRef.location.hash,
    store.getState().ui.pageOrder,
  );

  if (initialPageId) {
    navigateToPage(initialPageId, { resetSubAnchor: true });
  } else {
    updateHashForPage(windowRef, store.getState().ui.activePageId);
  }

  let lastActivePageId = null;

  const unsubscribe = store.subscribe(
    (state) => {
      if (state.ui.activePageId === lastActivePageId) {
        return;
      }

      lastActivePageId = state.ui.activePageId;
      updateHashForPage(windowRef, state.ui.activePageId);
    },
    { immediate: true },
  );

  cleanup.push(unsubscribe);

  return {
    clearActiveSubAnchor,
    setActiveSubAnchorById,
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
