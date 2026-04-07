import { getSectionDefinition } from '../config/sections.js';
import { selectReferenceDrawerState } from '../state/store.js';
import { getDocumentRef, clearChildren } from '../utils/shared.js';
import {
  REFERENCE_DRAWER_TOPIC_REGISTRY,
  REFERENCE_TOPIC_BY_DRAWER_ID,
} from '../content/reference-topics.js';
import { appendStructuredTopicBlocks } from './content-topic-blocks.js';

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
  drawer.querySelectorAll('.chip').forEach((chip) => {
    const label = chip.textContent?.trim().toLowerCase();

    if (!label) {
      return;
    }

    if (!chip.dataset.recommendationState && RECOMMENDATION_STATE_BY_LABEL[label]) {
      chip.dataset.recommendationState = RECOMMENDATION_STATE_BY_LABEL[label];
    }

    if (!chip.dataset.confidenceLevel && CONFIDENCE_LEVEL_BY_LABEL[label]) {
      chip.dataset.confidenceLevel = CONFIDENCE_LEVEL_BY_LABEL[label];
    }
  });
};

export const REFERENCE_DRAWER_REGISTRY = Object.freeze(
  REFERENCE_DRAWER_TOPIC_REGISTRY.map((topic) =>
    Object.freeze({
      drawerId: topic.drawerId,
      topicId: topic.id,
      code: topic.code,
      title: topic.title,
      summary: topic.summary,
    }),
  ),
);

export const REFERENCE_DRAWER_BY_ID = Object.freeze(
  Object.fromEntries(REFERENCE_DRAWER_REGISTRY.map((drawer) => [drawer.drawerId, drawer])),
);

export const REFERENCE_DRAWER_BY_TOPIC_ID = Object.freeze(
  Object.fromEntries(REFERENCE_DRAWER_REGISTRY.map((drawer) => [drawer.topicId, drawer])),
);

const buildReferenceDrawer = (documentRef, drawerDefinition) => {
  const topicDefinition = REFERENCE_TOPIC_BY_DRAWER_ID[drawerDefinition.drawerId];
  const drawer = documentRef.createElement('details');
  const summary = documentRef.createElement('summary');
  const main = documentRef.createElement('span');
  const code = documentRef.createElement('span');
  const title = documentRef.createElement('span');
  const actions = documentRef.createElement('span');
  const status = documentRef.createElement('span');
  const panel = documentRef.createElement('div');

  drawer.className = 'reference-drawer';
  drawer.dataset.drawerId = drawerDefinition.drawerId;
  drawer.dataset.topicId = drawerDefinition.topicId;

  summary.className = 'reference-drawer-summary';
  summary.dataset.drawerId = drawerDefinition.drawerId;
  main.className = 'reference-drawer-summary-main';
  code.className = 'reference-drawer-code';
  code.textContent = drawerDefinition.code;
  title.className = 'reference-drawer-title';
  title.textContent = drawerDefinition.title;
  actions.className = 'reference-drawer-summary-actions';
  status.className = 'reference-drawer-status';
  panel.className = 'reference-drawer-panel';

  main.append(code, title);
  actions.appendChild(status);
  summary.append(main, actions);
  drawer.append(summary, panel);

  if (topicDefinition) {
    appendStructuredTopicBlocks(documentRef, panel, topicDefinition);
  }

  annotateSemanticChips(drawer);

  return {
    drawer,
    chrome: {
      summary,
      status,
    },
  };
};

export const createReferenceDrawersRenderer = ({ root = document, store }) => {
  const documentRef = getDocumentRef(root);
  const mount = documentRef.getElementById('referenceDrawerMount');

  if (!mount) {
    return {
      sync() {},
      destroy() {},
    };
  }

  const cleanup = [];
  const drawerElementsById = new Map();
  const drawerChromeById = new Map();

  clearChildren(mount);

  const stack = documentRef.createElement('section');
  stack.className = 'reference-drawer-stack';
  stack.setAttribute('aria-label', 'Persistent reference drawers');
  mount.appendChild(stack);

  REFERENCE_DRAWER_REGISTRY.forEach((drawerDefinition) => {
    const { drawer, chrome } = buildReferenceDrawer(documentRef, drawerDefinition);
    stack.appendChild(drawer);
    drawerElementsById.set(drawerDefinition.drawerId, drawer);
    drawerChromeById.set(drawerDefinition.drawerId, chrome);

    const handleToggle = () => {
      const drawerId = drawer.dataset.drawerId;

      if (!drawerId) {
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
      const isRelevant = activeReferenceTopicIds.has(drawerDefinition.topicId);
      const isOpen = selectReferenceDrawerState(state, drawerDefinition.drawerId);

      if (!drawer || !chrome) {
        return;
      }

      if (drawer.open !== isOpen) {
        drawer.open = isOpen;
      }

      drawer.classList.toggle('is-open', isOpen);
      drawer.classList.toggle('is-contextual-match', isRelevant);
      drawer.setAttribute('data-contextual-match', String(isRelevant));

      chrome.status.textContent = isRelevant ? 'PAGE LINK' : 'REFERENCE';
      chrome.status.classList.toggle('is-contextual-match', isRelevant);
    });
  };

  sync(store.getState());

  return {
    sync,
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
