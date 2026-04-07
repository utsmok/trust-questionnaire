const normalizeKey = (value) => (typeof value === 'string' ? value.toLowerCase() : '');

const createKeyCombo = ({
  key,
  altKey = false,
  ctrlKey = false,
  metaKey = false,
  shiftKey = false,
}) =>
  Object.freeze({
    key: normalizeKey(key),
    altKey: Boolean(altKey),
    ctrlKey: Boolean(ctrlKey),
    metaKey: Boolean(metaKey),
    shiftKey: Boolean(shiftKey),
  });

const createShortcut = ({
  commandId,
  description,
  scope,
  combos,
  allowWhileTyping = false,
  announce = null,
  action,
}) =>
  Object.freeze({
    commandId,
    description,
    scope,
    combos: Object.freeze(combos.map((combo) => createKeyCombo(combo))),
    allowWhileTyping,
    announce,
    action,
  });

export const SHORTCUT_SCOPES = Object.freeze({
  GLOBAL: 'global',
  SURFACE: 'surface',
  CLUSTER: 'cluster',
});

export const GLOBAL_SHORTCUTS = Object.freeze([
  createShortcut({
    commandId: 'jump-transparent',
    description: 'Jump to Transparent',
    scope: SHORTCUT_SCOPES.GLOBAL,
    combos: [
      { key: '1', altKey: true },
      { key: 't', altKey: true },
    ],
    announce: 'Jumped to Transparent.',
    action: Object.freeze({ type: 'jump-page', pageId: 'TR' }),
  }),
  createShortcut({
    commandId: 'jump-reliable',
    description: 'Jump to Reliable',
    scope: SHORTCUT_SCOPES.GLOBAL,
    combos: [
      { key: '2', altKey: true },
      { key: 'r', altKey: true },
    ],
    announce: 'Jumped to Reliable.',
    action: Object.freeze({ type: 'jump-page', pageId: 'RE' }),
  }),
  createShortcut({
    commandId: 'jump-user-centric',
    description: 'Jump to User-centric',
    scope: SHORTCUT_SCOPES.GLOBAL,
    combos: [
      { key: '3', altKey: true },
      { key: 'u', altKey: true },
    ],
    announce: 'Jumped to User-centric.',
    action: Object.freeze({ type: 'jump-page', pageId: 'UC' }),
  }),
  createShortcut({
    commandId: 'jump-secure',
    description: 'Jump to Secure',
    scope: SHORTCUT_SCOPES.GLOBAL,
    combos: [
      { key: '4', altKey: true },
      { key: 's', altKey: true },
    ],
    announce: 'Jumped to Secure.',
    action: Object.freeze({ type: 'jump-page', pageId: 'SE' }),
  }),
  createShortcut({
    commandId: 'jump-traceable',
    description: 'Jump to Traceable',
    scope: SHORTCUT_SCOPES.GLOBAL,
    combos: [
      { key: '5', altKey: true },
      { key: 'c', altKey: true },
    ],
    announce: 'Jumped to Traceable.',
    action: Object.freeze({ type: 'jump-page', pageId: 'TC' }),
  }),
  createShortcut({
    commandId: 'toggle-sidebar',
    description: 'Toggle sidebar or drawer',
    scope: SHORTCUT_SCOPES.GLOBAL,
    combos: [{ key: 'b', altKey: true }],
    announce: null,
    action: Object.freeze({ type: 'toggle-sidebar' }),
  }),
  createShortcut({
    commandId: 'open-guidance-tab',
    description: 'Open Guidance tab',
    scope: SHORTCUT_SCOPES.GLOBAL,
    combos: [{ key: 'g', altKey: true, shiftKey: true }],
    announce: 'Opened Guidance tab.',
    action: Object.freeze({ type: 'set-sidebar-tab', tabId: 'guidance' }),
  }),
  createShortcut({
    commandId: 'open-reference-tab',
    description: 'Open Reference tab',
    scope: SHORTCUT_SCOPES.GLOBAL,
    combos: [{ key: 'r', altKey: true, shiftKey: true }],
    announce: 'Opened Reference tab.',
    action: Object.freeze({ type: 'set-sidebar-tab', tabId: 'reference' }),
  }),
  createShortcut({
    commandId: 'open-about-tab',
    description: 'Open About tab',
    scope: SHORTCUT_SCOPES.GLOBAL,
    combos: [{ key: 'a', altKey: true, shiftKey: true }],
    announce: 'Opened About tab.',
    action: Object.freeze({ type: 'set-sidebar-tab', tabId: 'about' }),
  }),
]);

export const NAVIGATION_CLUSTER_REGISTRY = Object.freeze([
  Object.freeze({
    clusterId: 'completion-strip',
    containerSelector: '.completion-strip',
    itemSelector: '.strip-cell',
    orientation: 'horizontal',
    activationSelector: '.strip-cell',
  }),
  Object.freeze({
    clusterId: 'page-index',
    containerSelector: '.page-index-list',
    itemSelector: '.page-index-button',
    orientation: 'vertical',
    activationSelector: '.page-index-button',
  }),
  Object.freeze({
    clusterId: 'context-anchor-list',
    containerSelector: '.context-anchor-list',
    itemSelector: '.context-anchor-button',
    orientation: 'vertical',
    activationSelector: '.context-anchor-button',
  }),
  Object.freeze({
    clusterId: 'sidebar-tab-bar',
    containerSelector: '.sidebar-tab-bar',
    itemSelector: '[data-sidebar-tab]',
    orientation: 'horizontal',
    activationSelector: '[data-sidebar-tab]',
  }),
]);

export const matchesShortcutCombo = (event, combo) => {
  if (!combo || normalizeKey(event?.key) !== combo.key) {
    return false;
  }

  return (
    Boolean(event.altKey) === combo.altKey &&
    Boolean(event.ctrlKey) === combo.ctrlKey &&
    Boolean(event.metaKey) === combo.metaKey &&
    Boolean(event.shiftKey) === combo.shiftKey
  );
};

export const findMatchingGlobalShortcut = (event) => {
  return (
    GLOBAL_SHORTCUTS.find((shortcut) =>
      shortcut.combos.some((combo) => matchesShortcutCombo(event, combo)),
    ) ?? null
  );
};

export const isTypingTarget = (target) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  if (tagName !== 'input') {
    return false;
  }

  const inputType = normalizeKey(target.getAttribute('type') || 'text');
  return !['button', 'checkbox', 'radio', 'range', 'file', 'submit', 'reset'].includes(inputType);
};

export const getClusterItems = (container, itemSelector) => {
  if (!(container instanceof HTMLElement)) {
    return [];
  }

  return Array.from(container.querySelectorAll(itemSelector)).filter(
    (item) => item instanceof HTMLElement && !item.hasAttribute('disabled'),
  );
};

export const getClusterOrientationKeys = (orientation = 'horizontal') => {
  return orientation === 'vertical'
    ? Object.freeze({ previous: ['ArrowUp'], next: ['ArrowDown'] })
    : Object.freeze({ previous: ['ArrowLeft'], next: ['ArrowRight'] });
};
