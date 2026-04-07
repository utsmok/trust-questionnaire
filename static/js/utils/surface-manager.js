import { createFocusTrap, focusElementWithRetry } from './focus-trap.js';

const DOCUMENT_MANAGER_KEY = Symbol.for('trust.surfaceManager');

const noop = () => {};

const getDocumentRef = (documentRef) => documentRef ?? document;

const resolveWindowRef = (documentRef) => documentRef.defaultView ?? window;

const resolvePriority = (priority = 0) => (Number.isFinite(priority) ? Number(priority) : 0);

const isConnectedElement = (value) => value instanceof HTMLElement && value.isConnected;

const describeSurface = (surface) => surface?.label ?? surface?.id ?? 'surface';

const sortSurfaceStack = (stack, surfaceEntries) => {
  stack.sort((leftId, rightId) => {
    const left = surfaceEntries.get(leftId);
    const right = surfaceEntries.get(rightId);

    const priorityDelta = resolvePriority(right?.priority) - resolvePriority(left?.priority);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return (right?.openedAt ?? 0) - (left?.openedAt ?? 0);
  });
};

export const createSurfaceManager = ({ documentRef = document, statusRegion = null } = {}) => {
  const resolvedDocument = getDocumentRef(documentRef);
  const windowRef = resolveWindowRef(resolvedDocument);
  const surfaceEntries = new Map();
  const openSurfaceIds = [];
  const cleanup = [];
  let announcementSerial = 0;
  let activeStatusRegion = statusRegion instanceof HTMLElement ? statusRegion : null;

  const announce = (message) => {
    if (
      !(activeStatusRegion instanceof HTMLElement) ||
      typeof message !== 'string' ||
      !message.trim()
    ) {
      return;
    }

    announcementSerial += 1;
    const nextMessage = message.trim();
    activeStatusRegion.textContent = '';
    windowRef.requestAnimationFrame(() => {
      if (announcementSerial <= 0) {
        return;
      }
      activeStatusRegion.textContent = nextMessage;
    });
  };

  const getTopSurface = () => {
    sortSurfaceStack(openSurfaceIds, surfaceEntries);
    return surfaceEntries.get(openSurfaceIds[0]) ?? null;
  };

  const syncAriaState = (entry) => {
    if (!isConnectedElement(entry?.element)) {
      return;
    }

    if (entry.open) {
      entry.element.hidden = false;
      entry.element.setAttribute('aria-hidden', 'false');
      return;
    }

    entry.element.hidden = true;
    entry.element.setAttribute('aria-hidden', 'true');
  };

  const deactivateTrap = (entry) => {
    entry?.focusTrap?.deactivate?.();
  };

  const activateTrap = (entry) => {
    if (!entry?.modal || !(entry.element instanceof HTMLElement)) {
      return;
    }

    if (!entry.focusTrap) {
      entry.focusTrap = createFocusTrap(entry.element, {
        documentRef: resolvedDocument,
        onEscape: (event) => {
          event.preventDefault();
          closeSurface(entry.id, { reason: 'escape' });
        },
      });
    }

    entry.focusTrap.activate();
  };

  const closeSurface = (surfaceId, { reason = 'programmatic', skipFocusRestore = false } = {}) => {
    const entry = surfaceEntries.get(surfaceId);

    if (!entry || !entry.open) {
      return false;
    }

    entry.onBeforeClose?.({ reason, manager });
    entry.open = false;
    deactivateTrap(entry);
    syncAriaState(entry);

    const openIndex = openSurfaceIds.indexOf(surfaceId);
    if (openIndex >= 0) {
      openSurfaceIds.splice(openIndex, 1);
    }

    const restoreFocusTarget =
      entry.resolveRestoreFocusTarget?.({ reason, manager }) ?? entry.restoreFocusTarget ?? null;

    if (!skipFocusRestore) {
      const delayMs = Number.isFinite(entry.restoreFocusDelayMs) ? entry.restoreFocusDelayMs : 0;
      const focusRestore = () => {
        focusElementWithRetry({
          windowRef,
          documentRef: resolvedDocument,
          primaryTarget: restoreFocusTarget,
          fallbackTarget: entry.fallbackRestoreFocusTarget ?? null,
        });
      };

      if (delayMs > 0) {
        const timer = windowRef.setTimeout(() => {
          focusRestore();
        }, delayMs);
        cleanup.push(() => windowRef.clearTimeout(timer));
      } else {
        windowRef.requestAnimationFrame(focusRestore);
      }
    }

    entry.onAfterClose?.({ reason, manager });

    const announcement =
      typeof entry.closeAnnouncement === 'function'
        ? entry.closeAnnouncement({ reason, manager })
        : entry.closeAnnouncement;
    if (announcement) {
      announce(announcement);
    }

    return true;
  };

  const manager = {
    announce,
    setStatusRegion(nextStatusRegion) {
      activeStatusRegion = nextStatusRegion instanceof HTMLElement ? nextStatusRegion : null;
    },
    registerSurface({
      id,
      element,
      label = null,
      priority = 0,
      modal = true,
      initialFocusTarget = null,
      resolveInitialFocusTarget = null,
      restoreFocusTarget = null,
      fallbackRestoreFocusTarget = null,
      resolveRestoreFocusTarget = null,
      restoreFocusDelayMs = 0,
      closeAnnouncement = null,
      onBeforeClose = noop,
      onAfterClose = noop,
    }) {
      if (!id || !(element instanceof HTMLElement)) {
        throw new Error('Surface id and element are required.');
      }

      const existing = surfaceEntries.get(id);
      if (existing) {
        existing.element = element;
        existing.label = label;
        existing.priority = resolvePriority(priority);
        existing.modal = Boolean(modal);
        existing.initialFocusTarget = initialFocusTarget;
        existing.resolveInitialFocusTarget = resolveInitialFocusTarget;
        existing.restoreFocusTarget = restoreFocusTarget;
        existing.fallbackRestoreFocusTarget = fallbackRestoreFocusTarget;
        existing.resolveRestoreFocusTarget = resolveRestoreFocusTarget;
        existing.restoreFocusDelayMs = restoreFocusDelayMs;
        existing.closeAnnouncement = closeAnnouncement;
        existing.onBeforeClose = onBeforeClose;
        existing.onAfterClose = onAfterClose;
        return existing;
      }

      const entry = {
        id,
        element,
        label,
        priority: resolvePriority(priority),
        modal: Boolean(modal),
        initialFocusTarget,
        resolveInitialFocusTarget,
        restoreFocusTarget,
        fallbackRestoreFocusTarget,
        resolveRestoreFocusTarget,
        restoreFocusDelayMs,
        closeAnnouncement,
        onBeforeClose,
        onAfterClose,
        open: false,
        openedAt: 0,
        focusTrap: null,
      };

      surfaceEntries.set(id, entry);
      syncAriaState(entry);
      return entry;
    },
    updateSurface(surfaceId, updates = {}) {
      const entry = surfaceEntries.get(surfaceId);
      if (!entry) {
        return null;
      }

      Object.assign(entry, updates);
      return entry;
    },
    openSurface(
      surfaceId,
      { trigger = null, initialFocusTarget = null, announceMessage = null } = {},
    ) {
      const entry = surfaceEntries.get(surfaceId);
      if (!entry) {
        return false;
      }

      entry.restoreFocusTarget = isConnectedElement(trigger)
        ? trigger
        : (entry.restoreFocusTarget ?? null);
      entry.open = true;
      entry.openedAt = Date.now();
      syncAriaState(entry);

      if (!openSurfaceIds.includes(surfaceId)) {
        openSurfaceIds.push(surfaceId);
      }
      sortSurfaceStack(openSurfaceIds, surfaceEntries);

      activateTrap(entry);

      const resolvedInitialFocusTarget =
        initialFocusTarget ??
        entry.resolveInitialFocusTarget?.({ manager }) ??
        entry.initialFocusTarget ??
        entry.element;

      windowRef.requestAnimationFrame(() => {
        focusElementWithRetry({
          windowRef,
          documentRef: resolvedDocument,
          primaryTarget: resolvedInitialFocusTarget,
          fallbackTarget: entry.element,
        });
      });

      announce(announceMessage ?? `Opened ${describeSurface(entry)}.`);
      return true;
    },
    closeSurface,
    closeTopSurface(options = {}) {
      const topSurface = getTopSurface();
      if (!topSurface) {
        return false;
      }

      return closeSurface(topSurface.id, options);
    },
    unregisterSurface(surfaceId) {
      closeSurface(surfaceId, { skipFocusRestore: true });
      const entry = surfaceEntries.get(surfaceId);
      entry?.focusTrap?.destroy?.();
      surfaceEntries.delete(surfaceId);
    },
    hasOpenSurface() {
      return openSurfaceIds.length > 0;
    },
    getOpenSurfaceCount() {
      return openSurfaceIds.length;
    },
    getActiveSurface() {
      return getTopSurface();
    },
    isSurfaceOpen(surfaceId) {
      return Boolean(surfaceEntries.get(surfaceId)?.open);
    },
    destroy() {
      [...openSurfaceIds].forEach((surfaceId) => {
        closeSurface(surfaceId, { skipFocusRestore: true, reason: 'destroy' });
      });
      cleanup.splice(0).forEach((dispose) => dispose());
      surfaceEntries.forEach((entry) => entry.focusTrap?.destroy?.());
      surfaceEntries.clear();
    },
  };

  return manager;
};

export const ensureSurfaceManager = ({ documentRef = document, statusRegion = null } = {}) => {
  const resolvedDocument = getDocumentRef(documentRef);

  if (!resolvedDocument[DOCUMENT_MANAGER_KEY]) {
    resolvedDocument[DOCUMENT_MANAGER_KEY] = createSurfaceManager({
      documentRef: resolvedDocument,
      statusRegion,
    });
  }

  if (statusRegion instanceof HTMLElement) {
    resolvedDocument[DOCUMENT_MANAGER_KEY].setStatusRegion(statusRegion);
  }

  return resolvedDocument[DOCUMENT_MANAGER_KEY];
};

export const getSurfaceManager = (documentRef = document) => {
  return getDocumentRef(documentRef)[DOCUMENT_MANAGER_KEY] ?? null;
};
