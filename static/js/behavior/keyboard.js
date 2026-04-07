import {
  NAVIGATION_CLUSTER_REGISTRY,
  findMatchingGlobalShortcut,
  getClusterItems,
  getClusterOrientationKeys,
  isTypingTarget,
} from '../config/shortcut-registry.js';
import { getSurfaceManager } from '../utils/surface-manager.js';
import { getDocumentRef } from '../utils/shared.js';

const isActivationKey = (key) => key === 'Enter' || key === ' ';

const refocusClusterItem = (documentRef, item) => {
  if (!(item instanceof HTMLElement)) {
    return;
  }

  const windowRef = documentRef.defaultView ?? window;
  windowRef.requestAnimationFrame(() => {
    item.focus();
  });
};

const findFirstEnabledItem = (items) =>
  items.find((item) => !item.hasAttribute('disabled')) ?? null;

const syncClusterTabStops = (container, clusterConfig) => {
  const items = getClusterItems(container, clusterConfig.itemSelector).filter(
    (item) => !item.hasAttribute('disabled'),
  );

  if (items.length === 0) {
    return;
  }

  const currentItem =
    items.find((item) => item.matches('[aria-current="page"], .is-active')) ?? items[0];

  items.forEach((item) => {
    item.tabIndex = item === currentItem ? 0 : -1;
  });
};

const moveClusterFocus = ({ items, currentItem, direction }) => {
  if (!items.length) {
    return null;
  }

  const currentIndex = Math.max(items.indexOf(currentItem), 0);
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  const nextItem = items[nextIndex] ?? null;

  if (nextItem instanceof HTMLElement) {
    items.forEach((item) => {
      item.tabIndex = item === nextItem ? 0 : -1;
    });
    nextItem.focus();
  }

  return nextItem;
};

const syncAllNavigationClusters = (documentRef) => {
  NAVIGATION_CLUSTER_REGISTRY.forEach((clusterConfig) => {
    documentRef.querySelectorAll(clusterConfig.containerSelector).forEach((container) => {
      if (container instanceof HTMLElement) {
        syncClusterTabStops(container, clusterConfig);
      }
    });
  });
};

const executeGlobalShortcut = ({
  shortcut,
  documentRef,
  navigateToPage,
  toggleSidebar,
  setSidebarActiveTab,
}) => {
  if (!shortcut?.action) {
    return false;
  }

  switch (shortcut.action.type) {
    case 'jump-page':
      if (typeof navigateToPage === 'function') {
        return navigateToPage(shortcut.action.pageId, {
          focusTarget: true,
          resetSubAnchor: true,
        });
      }
      return false;
    case 'toggle-sidebar':
      if (typeof toggleSidebar === 'function') {
        toggleSidebar();
        return true;
      }
      return false;
    case 'set-sidebar-tab':
      if (typeof setSidebarActiveTab === 'function') {
        setSidebarActiveTab(shortcut.action.tabId);
        const targetTab = documentRef.querySelector(
          `[data-sidebar-tab="${shortcut.action.tabId}"]`,
        );
        if (targetTab instanceof HTMLElement) {
          targetTab.focus();
        }
        return true;
      }
      return false;
    default:
      return false;
  }
};

export const initializeKeyboardBehavior = ({
  root = document,
  navigateToPage,
  toggleSidebar,
  setSidebarActiveTab,
}) => {
  const documentRef = getDocumentRef(root);
  const cleanup = [];

  const attachRatingKeydown = (scale) => {
    const handleKeydown = (event) => {
      const options = Array.from(scale.querySelectorAll('.rating-option'));
      const currentIndex = options.indexOf(event.target);

      if (currentIndex === -1) {
        return;
      }

      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        options[Math.min(currentIndex + 1, options.length - 1)]?.focus();
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        options[Math.max(currentIndex - 1, 0)]?.focus();
        return;
      }

      if (isActivationKey(event.key)) {
        event.preventDefault();
        event.target.click();
      }
    };

    scale.addEventListener('keydown', handleKeydown);
    return () => scale.removeEventListener('keydown', handleKeydown);
  };

  const initialScales = Array.from(documentRef.querySelectorAll('.rating-scale'));
  initialScales.forEach((scale) => {
    cleanup.push(attachRatingKeydown(scale));
  });

  const activateSidebarTab = (item) => {
    if (!(item instanceof HTMLElement)) {
      return;
    }

    if (typeof setSidebarActiveTab === 'function' && item.dataset.sidebarTab) {
      setSidebarActiveTab(item.dataset.sidebarTab);
      refocusClusterItem(documentRef, item);
      return;
    }

    item.click();
    refocusClusterItem(documentRef, item);
  };

  syncAllNavigationClusters(documentRef);

  const observedRoot = root instanceof HTMLElement ? root : documentRef.body;
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      let shouldResyncClusters = false;

      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE) continue;
          const scales = node.matches('.rating-scale')
            ? [node]
            : Array.from(node.querySelectorAll('.rating-scale'));

          scales.forEach((scale) => {
            if (!scale.dataset.keyboardBound) {
              scale.dataset.keyboardBound = 'true';
              cleanup.push(attachRatingKeydown(scale));
            }
          });

          if (
            NAVIGATION_CLUSTER_REGISTRY.some(
              (clusterConfig) =>
                node.matches?.(clusterConfig.containerSelector) ||
                node.querySelector?.(clusterConfig.containerSelector),
            )
          ) {
            shouldResyncClusters = true;
          }
        }
      }

      if (shouldResyncClusters) {
        syncAllNavigationClusters(documentRef);
      }
    });
    observer.observe(observedRoot, { childList: true, subtree: true });
    cleanup.push(() => observer.disconnect());
  }

  const handleDocumentFocusIn = (event) => {
    NAVIGATION_CLUSTER_REGISTRY.forEach((clusterConfig) => {
      const container =
        event.target instanceof HTMLElement
          ? event.target.closest(clusterConfig.containerSelector)
          : null;
      if (container instanceof HTMLElement) {
        syncClusterTabStops(container, clusterConfig);
      }
    });
  };

  const handleClusterKeydown = (event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    const clusterConfig = NAVIGATION_CLUSTER_REGISTRY.find((entry) => {
      const container = event.target.closest(entry.containerSelector);
      return container instanceof HTMLElement && event.target.closest(entry.itemSelector);
    });

    if (!clusterConfig) {
      return;
    }

    const container = event.target.closest(clusterConfig.containerSelector);
    if (!(container instanceof HTMLElement)) {
      return;
    }

    const items = getClusterItems(container, clusterConfig.itemSelector).filter(
      (item) => !item.hasAttribute('disabled'),
    );
    const currentItem = event.target.closest(clusterConfig.itemSelector);

    if (!(currentItem instanceof HTMLElement) || items.length === 0) {
      return;
    }

    const orientationKeys = getClusterOrientationKeys(clusterConfig.orientation);

    if (orientationKeys.next.includes(event.key)) {
      event.preventDefault();
      const nextItem = moveClusterFocus({ items, currentItem, direction: 1 });
      if (clusterConfig.clusterId === 'sidebar-tab-bar') {
        activateSidebarTab(nextItem);
      }
      return;
    }

    if (orientationKeys.previous.includes(event.key)) {
      event.preventDefault();
      const previousItem = moveClusterFocus({ items, currentItem, direction: -1 });
      if (clusterConfig.clusterId === 'sidebar-tab-bar') {
        activateSidebarTab(previousItem);
      }
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      const firstItem = findFirstEnabledItem(items);
      if (firstItem instanceof HTMLElement) {
        items.forEach((item) => {
          item.tabIndex = item === firstItem ? 0 : -1;
        });
        firstItem.focus();
        if (clusterConfig.clusterId === 'sidebar-tab-bar') {
          activateSidebarTab(firstItem);
        }
      }
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      const lastItem = items[items.length - 1] ?? null;
      if (lastItem instanceof HTMLElement) {
        items.forEach((item) => {
          item.tabIndex = item === lastItem ? 0 : -1;
        });
        lastItem.focus();
        if (clusterConfig.clusterId === 'sidebar-tab-bar') {
          activateSidebarTab(lastItem);
        }
      }
      return;
    }

    if (isActivationKey(event.key) && currentItem.matches(clusterConfig.activationSelector)) {
      event.preventDefault();
      if (clusterConfig.clusterId === 'sidebar-tab-bar') {
        activateSidebarTab(currentItem);
        return;
      }

      currentItem.click();
    }
  };

  const handleDocumentKeydown = (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const surfaceManager = getSurfaceManager(documentRef);

    if (event.key === 'Escape' && surfaceManager?.hasOpenSurface()) {
      event.preventDefault();
      surfaceManager.closeTopSurface({ reason: 'escape' });
      return;
    }

    const shortcut = findMatchingGlobalShortcut(event);

    if (!shortcut) {
      return;
    }

    if (surfaceManager?.hasOpenSurface()) {
      return;
    }

    if (isTypingTarget(event.target) && !shortcut.allowWhileTyping) {
      return;
    }

    const handled = executeGlobalShortcut({
      shortcut,
      documentRef,
      navigateToPage,
      toggleSidebar,
      setSidebarActiveTab,
    });

    if (!handled) {
      return;
    }

    event.preventDefault();

    if (shortcut.announce) {
      surfaceManager?.announce(shortcut.announce);
    }
  };

  documentRef.addEventListener('focusin', handleDocumentFocusIn);
  cleanup.push(() => {
    documentRef.removeEventListener('focusin', handleDocumentFocusIn);
  });

  documentRef.addEventListener('keydown', handleClusterKeydown);
  cleanup.push(() => {
    documentRef.removeEventListener('keydown', handleClusterKeydown);
  });

  documentRef.addEventListener('keydown', handleDocumentKeydown);
  cleanup.push(() => {
    documentRef.removeEventListener('keydown', handleDocumentKeydown);
  });

  return {
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
