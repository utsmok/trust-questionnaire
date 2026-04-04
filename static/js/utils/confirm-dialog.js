let activeDialog = null;

const DIALOG_STYLES = `
  .confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.4);
  }

  .confirm-card {
    background: var(--ut-white, #fafbfc);
    border: var(--border-default, 2px) solid var(--ut-border, #bfc6cf);
    border-radius: var(--radius-md, 2px);
    padding: var(--space-6, 24px);
    max-width: 420px;
    width: calc(100% - var(--space-8, 32px) * 2);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  .confirm-message {
    margin: 0 0 var(--space-5, 20px);
    font-size: var(--text-body, 1rem);
    line-height: var(--lh-body, 1.55);
    color: var(--ut-text, #172033);
  }

  .confirm-actions {
    display: flex;
    gap: var(--space-3, 12px);
    justify-content: flex-end;
  }

  .confirm-btn {
    padding: var(--space-2, 8px) var(--space-4, 16px);
    font-size: var(--text-sm, 0.75rem);
    font-family: var(--ff-body, inherit);
    font-weight: 700;
    letter-spacing: var(--ls-label, 0.02em);
    border: var(--border-default, 2px) solid var(--ut-border, #bfc6cf);
    border-radius: var(--radius-md, 2px);
    cursor: pointer;
    background: var(--ut-white, #fafbfc);
    color: var(--ut-text, #172033);
  }

  .confirm-btn[data-primary="true"] {
    background: var(--ut-red, #c60c30);
    border-color: var(--ut-red, #c60c30);
    color: var(--ut-white, #fafbfc);
  }

  .confirm-btn:focus-visible {
    outline: var(--focus-ring-width, 2px) solid var(--focus-ring, #007d9c);
    outline-offset: var(--focus-ring-offset, 2px);
  }
`;

let styleInjected = false;

const injectStyles = (documentRef) => {
  if (styleInjected) return;
  const style = documentRef.createElement('style');
  style.textContent = DIALOG_STYLES;
  documentRef.head.appendChild(style);
  styleInjected = true;
};

export const confirmDialog = (message, { documentRef = document } = {}) => {
  if (activeDialog) return Promise.resolve(false);

  injectStyles(documentRef);

  return new Promise((resolve) => {
    const previousFocus = documentRef.activeElement;

    const overlay = documentRef.createElement('div');
    overlay.className = 'confirm-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Confirm action');

    const card = documentRef.createElement('div');
    card.className = 'confirm-card';

    const messageEl = documentRef.createElement('p');
    messageEl.className = 'confirm-message';
    messageEl.textContent = message;

    const actionsEl = documentRef.createElement('div');
    actionsEl.className = 'confirm-actions';

    const cancelButton = documentRef.createElement('button');
    cancelButton.className = 'confirm-btn';
    cancelButton.type = 'button';
    cancelButton.textContent = 'Cancel';

    const confirmButton = documentRef.createElement('button');
    confirmButton.className = 'confirm-btn';
    confirmButton.type = 'button';
    confirmButton.setAttribute('data-primary', 'true');
    confirmButton.textContent = 'Confirm';

    let settled = false;

    const teardown = (result) => {
      if (settled) return;
      settled = true;
      documentRef.removeEventListener('keydown', handleKeydown);
      activeDialog = null;
      overlay.remove();
      if (previousFocus && typeof previousFocus.focus === 'function') {
        previousFocus.focus();
      }
      resolve(result);
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        teardown(false);
      }
    };

    documentRef.addEventListener('keydown', handleKeydown);

    cancelButton.addEventListener('click', () => teardown(false));
    confirmButton.addEventListener('click', () => teardown(true));

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) teardown(false);
    });

    actionsEl.appendChild(cancelButton);
    actionsEl.appendChild(confirmButton);
    card.appendChild(messageEl);
    card.appendChild(actionsEl);
    overlay.appendChild(card);
    documentRef.body.appendChild(overlay);

    activeDialog = overlay;

    confirmButton.focus();
  });
};
