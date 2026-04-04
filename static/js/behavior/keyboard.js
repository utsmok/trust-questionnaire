import { getDocumentRef } from '../utils/shared.js';

const QUICK_JUMP_SHORTCUTS = Object.freeze({
  '1': 'TR',
  '2': 'RE',
  '3': 'UC',
  '4': 'SE',
  '5': 'TC',
  t: 'TR',
  r: 'RE',
  u: 'UC',
  s: 'SE',
  c: 'TC',
});

const isActivationKey = (key) => key === 'Enter' || key === ' ';

export const initializeKeyboardBehavior = ({
  root = document,
  navigateToPage,
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

  const observedRoot = root instanceof HTMLElement ? root : documentRef.body;
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
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
        }
      }
    });
    observer.observe(observedRoot, { childList: true, subtree: true });
    cleanup.push(() => observer.disconnect());
  }

  const handleDocumentKeydown = (event) => {
    if (!event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const shortcutKey = typeof event.key === 'string'
      ? event.key.toLowerCase()
      : '';
    const targetPageId = QUICK_JUMP_SHORTCUTS[shortcutKey];

    if (!targetPageId) {
      return;
    }

    if (typeof navigateToPage !== 'function') {
      return;
    }

    event.preventDefault();
    navigateToPage(targetPageId, { revealContext: true });
  };

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
