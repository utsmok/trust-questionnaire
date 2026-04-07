import { createAppShellController } from './shell/app-shell.js';
import { initializeFormControls } from './behavior/form-controls.js';
import { initializeKeyboardBehavior } from './behavior/keyboard.js';
import { initializeNavigation } from './behavior/navigation.js';
import { mountQuestionnairePages } from './render/questionnaire-pages.js';
import { createAppStore } from './state/store.js';

const getDocumentRef = (root) => root?.ownerDocument ?? root ?? document;

const getQuestionnaireRenderRoot = (root) =>
  getDocumentRef(root).getElementById('questionnaireRenderRoot');

let globalErrorHooksInstalled = false;

const ensureGlobalErrorHooks = () => {
  if (globalErrorHooksInstalled) {
    return;
  }

  window.addEventListener('error', (event) => {
    console.error('[app] uncaught error:', event.error);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[app] unhandled promise rejection:', event.reason);
  });

  globalErrorHooksInstalled = true;
};

const isCompatibilityDocumentRoute = (root) => {
  const documentRef = getDocumentRef(root);
  const windowRef = documentRef.defaultView ?? window;
  const pathname = windowRef.location?.pathname ?? '/';

  return pathname === '/trust-framework.html';
};

export const bootstrapQuestionnaireWorkspace = ({
  root = document,
  initialEvaluation,
  workflowAuthority = null,
  routeContext = null,
  workspacePreferences = null,
} = {}) => {
  ensureGlobalErrorHooks();

  const store = createAppStore(
    initialEvaluation === undefined
      ? { workflowAuthority }
      : { initialEvaluation, workflowAuthority },
  );
  const questionnaireRenderRoot = getQuestionnaireRenderRoot(root);

  document.body.style.overflow = 'hidden';

  if (questionnaireRenderRoot) {
    mountQuestionnairePages(questionnaireRenderRoot, {
      store,
      respectVisibility: true,
    });
  }

  const navigation = initializeNavigation({
    root,
    store,
    routeContext,
    preferences: workspacePreferences,
  });
  const formControls = initializeFormControls({ root, store });
  const keyboard = initializeKeyboardBehavior({
    root,
    navigateToPage: navigation.navigateToPage,
    toggleSidebar: navigation.toggleSidebar,
    setSidebarActiveTab: store.actions.setSidebarActiveTab,
  });

  return {
    store,
    navigateToPage: navigation.navigateToPage,
    replaceEvaluation: store.actions.replaceEvaluation,
    setWorkflowAuthority: store.actions.setWorkflowAuthority,
    destroy() {
      keyboard.destroy();
      formControls.destroy();
      navigation.destroy();
    },
  };
};

export const bootstrapApp = async (root = document) => {
  ensureGlobalErrorHooks();

  if (isCompatibilityDocumentRoute(root)) {
    document.body.dataset.appMode = 'compatibility';
    document.body.dataset.appSurface = 'compatibility';
    return bootstrapQuestionnaireWorkspace({ root });
  }

  document.body.style.overflow = 'hidden';
  return createAppShellController({
    root,
    mountWorkspace: (options) => bootstrapQuestionnaireWorkspace({ root, ...options }),
  });
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
