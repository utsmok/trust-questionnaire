import {
  SECTION_WORKFLOW_STATES,
  getSectionDefinition,
} from '../config/sections.js';

const WORKFLOW_STATE_LABELS = Object.freeze({
  [SECTION_WORKFLOW_STATES.EDITABLE]: 'Editable',
  [SECTION_WORKFLOW_STATES.READ_ONLY]: 'Read-only',
  [SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED]: 'System-skipped',
});

const getDocumentRef = (root) => root?.ownerDocument ?? root ?? document;

const ensurePagerShell = (mount, documentRef) => {
  const existingShell = mount.querySelector('.pager-shell');

  if (existingShell) {
    return {
      shell: existingShell,
      previousButton: existingShell.querySelector('[data-page-direction="previous"]'),
      status: existingShell.querySelector('.pager-status'),
      nextButton: existingShell.querySelector('[data-page-direction="next"]'),
    };
  }

  mount.innerHTML = '';
  mount.hidden = false;

  const shell = documentRef.createElement('div');
  const previousButton = documentRef.createElement('button');
  const status = documentRef.createElement('p');
  const nextButton = documentRef.createElement('button');

  shell.className = 'pager-shell';

  previousButton.type = 'button';
  previousButton.className = 'pager-button';
  previousButton.dataset.pageDirection = 'previous';

  status.className = 'pager-status';
  status.setAttribute('aria-live', 'polite');

  nextButton.type = 'button';
  nextButton.className = 'pager-button';
  nextButton.dataset.pageDirection = 'next';

  shell.append(previousButton, status, nextButton);
  mount.appendChild(shell);

  return {
    shell,
    previousButton,
    status,
    nextButton,
  };
};

export const getPagerPageIds = (state) =>
  state.derived.pageStates.accessibleSectionIds?.length
    ? state.derived.pageStates.accessibleSectionIds
    : state.ui.pageOrder;

export const getPagerState = (state) => {
  const pageOrder = getPagerPageIds(state);
  const activePageIndex = pageOrder.indexOf(state.ui.activePageId);
  const previousPageId = activePageIndex > 0 ? pageOrder[activePageIndex - 1] : null;
  const nextPageId = activePageIndex >= 0 ? pageOrder[activePageIndex + 1] ?? null : null;
  const activePageDefinition = getSectionDefinition(state.ui.activePageId);
  const activePageState = state.derived.pageStates.bySectionId[state.ui.activePageId] ?? null;

  return {
    pageOrder,
    activePageIndex,
    previousPageId,
    nextPageId,
    activePageDefinition,
    activePageState,
  };
};

export const createPagerController = ({
  root = document,
  store,
  navigateToPage,
}) => {
  const documentRef = getDocumentRef(root);
  const mount = documentRef.getElementById('pagerMount');
  const cleanup = [];

  if (!mount) {
    return {
      sync() {},
      navigateRelative() {
        return false;
      },
      destroy() {},
    };
  }

  const refs = ensurePagerShell(mount, documentRef);

  const sync = (state) => {
    const pagerState = getPagerState(state);
    const workflowState = pagerState.activePageState?.workflowState ?? '';
    const workflowLabel = WORKFLOW_STATE_LABELS[workflowState] ?? '';

    mount.hidden = false;
    refs.shell.dataset.activeWorkflowState = workflowState;

    if (refs.previousButton instanceof HTMLButtonElement) {
      refs.previousButton.disabled = !pagerState.previousPageId;
      refs.previousButton.dataset.pageId = pagerState.previousPageId ?? '';
      refs.previousButton.textContent = pagerState.previousPageId
        ? `← ${getSectionDefinition(pagerState.previousPageId)?.shortLabel ?? pagerState.previousPageId}`
        : '← Start';
      refs.previousButton.setAttribute(
        'aria-label',
        pagerState.previousPageId
          ? `Go to previous page: ${getSectionDefinition(pagerState.previousPageId)?.title ?? pagerState.previousPageId}`
          : 'No previous page',
      );
    }

    if (refs.nextButton instanceof HTMLButtonElement) {
      refs.nextButton.disabled = !pagerState.nextPageId;
      refs.nextButton.dataset.pageId = pagerState.nextPageId ?? '';
      refs.nextButton.textContent = pagerState.nextPageId
        ? `${getSectionDefinition(pagerState.nextPageId)?.shortLabel ?? pagerState.nextPageId} →`
        : 'End →';
      refs.nextButton.setAttribute(
        'aria-label',
        pagerState.nextPageId
          ? `Go to next page: ${getSectionDefinition(pagerState.nextPageId)?.title ?? pagerState.nextPageId}`
          : 'No next page',
      );
    }

    if (refs.status) {
      refs.status.textContent = pagerState.activePageDefinition
        ? `Page ${pagerState.activePageIndex + 1} of ${pagerState.pageOrder.length} — ${pagerState.activePageDefinition.pageCode} ${pagerState.activePageDefinition.title}${workflowLabel ? ` · ${workflowLabel}` : ''}`
        : `Page ${Math.max(pagerState.activePageIndex + 1, 1)} of ${pagerState.pageOrder.length}`;
    }
  };

  const navigateRelative = (direction, { focusTarget = true } = {}) => {
    const state = store.getState();
    const pagerState = getPagerState(state);
    const targetPageId = direction === 'previous'
      ? pagerState.previousPageId
      : pagerState.nextPageId;

    if (!targetPageId) {
      return false;
    }

    return navigateToPage(targetPageId, { focusTarget, resetSubAnchor: true });
  };

  const handleClick = (event) => {
    const button = event.target.closest('.pager-button[data-page-direction]');

    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      return;
    }

    navigateRelative(button.dataset.pageDirection, { focusTarget: true });
  };

  mount.addEventListener('click', handleClick);
  cleanup.push(() => {
    mount.removeEventListener('click', handleClick);
  });

  sync(store.getState());

  return {
    sync,
    navigateRelative,
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
