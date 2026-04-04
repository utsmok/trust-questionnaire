import { getSectionDefinition } from '../config/sections.js';
import { selectReferenceDrawerState } from '../state/store.js';
import { toArray, getDocumentRef, clearChildren } from '../utils/shared.js';

const RECOMMENDATION_STATE_BY_LABEL = Object.freeze({
  recommended: 'recommended',
  'recommended with caveats': 'recommended_with_caveats',
  'needs review / provisional': 'needs_review_provisional',
  'needs review/provisional': 'needs_review_provisional',
  'pilot only': 'pilot_only',
  'not recommended': 'not_recommended',
  'out of scope': 'out_of_scope',
});

const CONFIDENCE_LEVEL_BY_LABEL = Object.freeze({
  high: 'high',
  medium: 'medium',
  low: 'low',
});

const annotateSemanticChips = (drawer) => {
  toArray(drawer?.querySelectorAll('.chip')).forEach((chip) => {
    const label = chip.textContent?.trim().toLowerCase();

    if (!label) {
      return;
    }

    if (RECOMMENDATION_STATE_BY_LABEL[label]) {
      chip.dataset.recommendationState = RECOMMENDATION_STATE_BY_LABEL[label];
    }

    if (CONFIDENCE_LEVEL_BY_LABEL[label]) {
      chip.dataset.confidenceLevel = CONFIDENCE_LEVEL_BY_LABEL[label];
    }
  });
};

export const REFERENCE_DRAWER_REGISTRY = Object.freeze([
  Object.freeze({
    drawerId: 'answer-sets',
    topicId: 'reference.answer-sets',
    code: 'REF-A',
    title: 'Standard answer sets',
    summary: 'Reusable answer vocabularies, confidence levels, and critical-fail flag references.',
  }),
  Object.freeze({
    drawerId: 'scoring-model',
    topicId: 'reference.scoring-model',
    code: 'REF-S',
    title: 'Evaluation scoring model',
    summary: 'Criterion scoring, per-principle judgment rules, and final recommendation thresholds.',
  }),
  Object.freeze({
    drawerId: 'evidence-requirements',
    topicId: 'reference.evidence-requirements',
    code: 'REF-E',
    title: 'Minimum evidence requirements',
    summary: 'Evaluation evidence expectations, repeated-query rules, and verification requirements.',
  }),
]);

export const REFERENCE_DRAWER_BY_ID = Object.freeze(
  Object.fromEntries(REFERENCE_DRAWER_REGISTRY.map((drawer) => [drawer.drawerId, drawer])),
);

export const REFERENCE_DRAWER_BY_TOPIC_ID = Object.freeze(
  Object.fromEntries(REFERENCE_DRAWER_REGISTRY.map((drawer) => [drawer.topicId, drawer])),
);

const extractDrawersById = (mount) => {
  return new Map(
    toArray(mount?.querySelectorAll('.reference-drawer[data-drawer-id]')).map((drawer) => [
      drawer.dataset.drawerId,
      drawer,
    ]),
  );
};

const ensureSummaryChrome = (drawer, drawerDefinition, documentRef) => {
  const summary = drawer.querySelector('summary');

  if (!summary) {
    return null;
  }

  summary.classList.add('reference-drawer-summary');
  summary.dataset.drawerId = drawerDefinition.drawerId;
  drawer.dataset.topicId = drawerDefinition.topicId;

  let main = summary.querySelector('.reference-drawer-summary-main');
  if (!main) {
    main = documentRef.createElement('span');
    main.className = 'reference-drawer-summary-main';

    const code = summary.querySelector('.reference-drawer-code') ?? documentRef.createElement('span');
    code.className = 'reference-drawer-code';
    code.textContent = drawerDefinition.code;

    const title = summary.querySelector('.reference-drawer-title') ?? documentRef.createElement('span');
    title.className = 'reference-drawer-title';
    title.textContent = drawerDefinition.title;

    clearChildren(summary);
    main.append(code, title);
    summary.appendChild(main);
  }

  let actions = summary.querySelector('.reference-drawer-summary-actions');
  if (!actions) {
    actions = documentRef.createElement('span');
    actions.className = 'reference-drawer-summary-actions';
    summary.appendChild(actions);
  }

  let status = actions.querySelector('.reference-drawer-status');
  if (!status) {
    status = documentRef.createElement('span');
    status.className = 'reference-drawer-status';
    actions.appendChild(status);
  }

  let pinButton = actions.querySelector('.reference-pin-button');
  if (!pinButton) {
    pinButton = documentRef.createElement('button');
    pinButton.type = 'button';
    pinButton.className = 'reference-pin-button';
    pinButton.dataset.referencePin = drawerDefinition.drawerId;
    pinButton.setAttribute('aria-label', `Pin ${drawerDefinition.title}`);
    actions.appendChild(pinButton);
  }

  let subtitle = drawer.querySelector('.reference-drawer-subtitle');
  if (!subtitle) {
    subtitle = documentRef.createElement('p');
    subtitle.className = 'reference-drawer-subtitle';
    summary.insertAdjacentElement('afterend', subtitle);
  }

  subtitle.textContent = drawerDefinition.summary;

  return {
    summary,
    status,
    pinButton,
  };
};

export const createReferenceDrawersRenderer = ({ root = document, store }) => {
  const documentRef = getDocumentRef(root);
  const mount = documentRef.getElementById('referenceDrawerMount');

  if (!mount) {
    return {
      sync() {},
      isPinned() {
        return false;
      },
      destroy() {},
    };
  }

  const sourceDrawersById = extractDrawersById(mount);
  const cleanup = [];
  const pinnedDrawerIds = new Set();
  const drawerElementsById = new Map();
  const drawerChromeById = new Map();

  clearChildren(mount);

  const stack = documentRef.createElement('section');
  stack.className = 'reference-drawer-stack';
  stack.setAttribute('aria-label', 'Persistent reference drawers');
  mount.appendChild(stack);

  REFERENCE_DRAWER_REGISTRY.forEach((drawerDefinition) => {
    const drawer = sourceDrawersById.get(drawerDefinition.drawerId);

    if (!drawer) {
      return;
    }

    const chrome = ensureSummaryChrome(drawer, drawerDefinition, documentRef);
    annotateSemanticChips(drawer);
    stack.appendChild(drawer);
    drawerElementsById.set(drawerDefinition.drawerId, drawer);
    drawerChromeById.set(drawerDefinition.drawerId, chrome);

    const handleToggle = () => {
      const drawerId = drawer.dataset.drawerId;

      if (!drawerId) {
        return;
      }

      if (pinnedDrawerIds.has(drawerId) && !drawer.open) {
        drawer.open = true;
        return;
      }

      if (selectReferenceDrawerState(store.getState(), drawerId) === drawer.open) {
        return;
      }

      store.actions.setReferenceDrawerOpen(drawerId, drawer.open);
    };

    drawer.addEventListener('toggle', handleToggle);
    cleanup.push(() => {
      drawer.removeEventListener('toggle', handleToggle);
    });
  });

  const sync = (state) => {
    const activePageDefinition = getSectionDefinition(state.ui.activePageId);
    const activeReferenceTopicIds = new Set(activePageDefinition?.referenceTopicIds ?? []);

    REFERENCE_DRAWER_REGISTRY.forEach((drawerDefinition) => {
      const drawer = drawerElementsById.get(drawerDefinition.drawerId);
      const chrome = drawerChromeById.get(drawerDefinition.drawerId);
      const isPinned = pinnedDrawerIds.has(drawerDefinition.drawerId);
      const isRelevant = activeReferenceTopicIds.has(drawerDefinition.topicId);
      const isOpen = isPinned || selectReferenceDrawerState(state, drawerDefinition.drawerId);

      if (!drawer || !chrome) {
        return;
      }

      if (drawer.open !== isOpen) {
        drawer.open = isOpen;
      }

      drawer.classList.toggle('is-open', isOpen);
      drawer.classList.toggle('is-pinned', isPinned);
      drawer.classList.toggle('is-contextual-match', isRelevant);
      drawer.setAttribute('data-contextual-match', String(isRelevant));

      chrome.status.textContent = isPinned
        ? 'PINNED'
        : isRelevant
          ? 'PAGE LINK'
          : 'REFERENCE';
      chrome.status.classList.toggle('is-contextual-match', isRelevant);
      chrome.status.classList.toggle('is-pinned', isPinned);

      chrome.pinButton.textContent = isPinned ? 'UNPIN' : 'PIN';
      chrome.pinButton.setAttribute('aria-pressed', String(isPinned));
      chrome.pinButton.setAttribute(
        'aria-label',
        `${isPinned ? 'Unpin' : 'Pin'} ${drawerDefinition.title}`,
      );
    });
  };

  const handleClick = (event) => {
    const pinButton = event.target.closest('[data-reference-pin]');

    if (!(pinButton instanceof HTMLButtonElement)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const drawerId = pinButton.dataset.referencePin;

    if (!drawerId) {
      return;
    }

    if (pinnedDrawerIds.has(drawerId)) {
      pinnedDrawerIds.delete(drawerId);
    } else {
      pinnedDrawerIds.add(drawerId);
      store.actions.setReferenceDrawerOpen(drawerId, true);
    }

    sync(store.getState());
  };

  mount.addEventListener('click', handleClick);
  cleanup.push(() => {
    mount.removeEventListener('click', handleClick);
  });

  sync(store.getState());

  return {
    sync,
    isPinned(drawerId) {
      return pinnedDrawerIds.has(drawerId);
    },
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
