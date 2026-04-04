import { initializeFormControls } from './behavior/form-controls.js';
import { initializeKeyboardBehavior } from './behavior/keyboard.js';
import { initializeNavigation } from './behavior/navigation.js';
import { mountQuestionnairePages } from './render/questionnaire-pages.js';
import { createAppStore } from './state/store.js';

const getDocumentRef = (root) => root?.ownerDocument ?? root ?? document;

const getQuestionnaireRenderRoot = (root) =>
  getDocumentRef(root).getElementById('questionnaireRenderRoot');

export const bootstrapApp = (root = document) => {
  const store = createAppStore();
  const questionnaireRenderRoot = getQuestionnaireRenderRoot(root);

  if (questionnaireRenderRoot) {
    mountQuestionnairePages(questionnaireRenderRoot, {
      store,
      respectVisibility: true,
    });
  }

  const navigation = initializeNavigation({ root, store });
  const formControls = initializeFormControls({ root, store });
  const keyboard = initializeKeyboardBehavior({
    root,
    navigateToPage: navigation.navigateToPage,
  });

  return {
    store,
    destroy() {
      keyboard.destroy();
      formControls.destroy();
      navigation.destroy();
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
