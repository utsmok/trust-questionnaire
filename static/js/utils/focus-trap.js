export const createFocusTrap = (container, { onEscape } = {}) => {
  let active = false;
  const handleKeydown = (event) => {
    if (!active) return;
    if (event.key === 'Tab') {
      event.preventDefault();
      const focusable = container.querySelectorAll(
        'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          first.focus();
        }
      }
    }
    if (event.key === 'Escape' && onEscape) {
      onEscape(event);
    }
  };
  return {
    activate() {
      if (active) return;
      active = true;
      container.addEventListener('keydown', handleKeydown);
    },
    deactivate() {
      active = false;
      container.removeEventListener('keydown', handleKeydown);
    },
    destroy() {
      deactivate();
    },
  };
};
