import { CANONICAL_PAGE_SEQUENCE } from './config/sections.js';
import { initializeFormControls } from './behavior/form-controls.js';
import { initializeKeyboardBehavior } from './behavior/keyboard.js';
import { createPanelSyncController } from './behavior/panel-sync.js';
import { createAppStore } from './state/store.js';

const getShellPageOrder = (root = document) => {
  const pageIds = Array.from(
    root.querySelectorAll('#questionnaireRenderRoot [data-page-id]'),
  )
    .map((section) => section.dataset.pageId)
    .filter(Boolean);

  return pageIds.length ? pageIds : CANONICAL_PAGE_SEQUENCE;
};

export const bootstrapApp = (root = document) => {
  const store = createAppStore({ pageOrder: getShellPageOrder(root) });
  const panelSync = createPanelSyncController({ root, store });
  const formControls = initializeFormControls({ root, store });
  const keyboard = initializeKeyboardBehavior({
    root,
    navigateToPage: panelSync.navigateToPage,
  });

  return {
    store,
    destroy() {
      keyboard.destroy();
      formControls.destroy();
      panelSync.destroy();
    },
  };
};

let appInstance = null;

const start = () => {
  if (appInstance) {
    return appInstance;
  }

  appInstance = bootstrapApp(document);
  return appInstance;
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
