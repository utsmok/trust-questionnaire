export const FOCUSABLE_SELECTOR = [
  'button:not([disabled]):not([tabindex="-1"])',
  '[href]:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([type="hidden"]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const isVisibleElement = (element) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.hidden) {
    return false;
  }

  const style = element.ownerDocument?.defaultView?.getComputedStyle?.(element);
  if (style?.display === 'none' || style?.visibility === 'hidden') {
    return false;
  }

  return true;
};

export const getFocusableElements = (container) => {
  if (!(container instanceof HTMLElement)) {
    return [];
  }

  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    return isVisibleElement(element) && !element.hasAttribute('inert');
  });
};

export const focusElementWithRetry = ({
  windowRef,
  documentRef,
  primaryTarget,
  fallbackTarget = null,
  remainingAttempts = 3,
}) => {
  const primary =
    primaryTarget instanceof HTMLElement && primaryTarget.isConnected ? primaryTarget : null;
  const fallback =
    fallbackTarget instanceof HTMLElement && fallbackTarget.isConnected ? fallbackTarget : null;
  const target = primary ?? fallback;

  if (!(target instanceof HTMLElement) || typeof target.focus !== 'function') {
    return;
  }

  target.focus({ preventScroll: true });

  if (documentRef?.activeElement === target) {
    return;
  }

  if (remainingAttempts <= 1) {
    if (primary && fallback && primary !== fallback && typeof fallback.focus === 'function') {
      fallback.focus({ preventScroll: true });
    }
    return;
  }

  windowRef.requestAnimationFrame(() => {
    focusElementWithRetry({
      windowRef,
      documentRef,
      primaryTarget,
      fallbackTarget,
      remainingAttempts: remainingAttempts - 1,
    });
  });
};

export const createFocusTrap = (container, { documentRef = null, onEscape } = {}) => {
  let active = false;
  const resolvedDocument = documentRef ?? container?.ownerDocument ?? document;

  const handleKeydown = (event) => {
    if (!active) {
      return;
    }

    if (event.key === 'Tab') {
      const focusable = getFocusableElements(container);

      if (!focusable.length) {
        event.preventDefault();
        return;
      }

      const currentIndex = focusable.indexOf(resolvedDocument.activeElement);
      const normalizedIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex = event.shiftKey
        ? (normalizedIndex - 1 + focusable.length) % focusable.length
        : (normalizedIndex + 1) % focusable.length;

      event.preventDefault();
      focusable[nextIndex]?.focus();
      return;
    }

    if (event.key === 'Escape' && typeof onEscape === 'function') {
      onEscape(event);
    }
  };

  return {
    activate() {
      if (active || !(container instanceof HTMLElement)) {
        return;
      }

      active = true;
      container.addEventListener('keydown', handleKeydown);
    },
    deactivate() {
      if (!active || !(container instanceof HTMLElement)) {
        return;
      }

      active = false;
      container.removeEventListener('keydown', handleKeydown);
    },
    destroy() {
      this.deactivate();
    },
  };
};
