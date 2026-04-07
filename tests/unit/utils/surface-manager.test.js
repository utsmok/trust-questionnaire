import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createSurfaceManager } from '../../../static/js/utils/surface-manager.js';

class FakeHTMLElement {
  constructor(ownerDocument, tagName = 'DIV') {
    this.ownerDocument = ownerDocument;
    this.tagName = tagName.toUpperCase();
    this.hidden = false;
    this.isConnected = true;
    this.textContent = '';
    this.tabIndex = 0;
    this.attributes = new Map();
    this.listeners = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, value === '' ? '' : String(value));
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    listeners.push(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? [];
    this.listeners.set(
      type,
      listeners.filter((entry) => entry !== listener),
    );
  }

  querySelectorAll() {
    return [];
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }
}

const createFakeDocument = () => {
  const documentRef = {
    activeElement: null,
    defaultView: {
      requestAnimationFrame(callback) {
        callback();
        return 1;
      },
      setTimeout(callback) {
        callback();
        return 1;
      },
      clearTimeout() {},
    },
  };

  documentRef.createElement = (tagName) => new FakeHTMLElement(documentRef, tagName);
  return documentRef;
};

describe('surface manager', () => {
  let originalHTMLElement;

  beforeEach(() => {
    originalHTMLElement = globalThis.HTMLElement;
    globalThis.HTMLElement = FakeHTMLElement;
  });

  afterEach(() => {
    if (originalHTMLElement) {
      globalThis.HTMLElement = originalHTMLElement;
      return;
    }

    delete globalThis.HTMLElement;
  });

  it('opens a modal surface, announces it, and restores focus on close', () => {
    const documentRef = createFakeDocument();
    const statusRegion = new FakeHTMLElement(documentRef, 'div');
    const trigger = new FakeHTMLElement(documentRef, 'button');
    const closeButton = new FakeHTMLElement(documentRef, 'button');
    const surfaceElement = new FakeHTMLElement(documentRef, 'section');

    const manager = createSurfaceManager({ documentRef, statusRegion });
    manager.registerSurface({
      id: 'context-drawer',
      element: surfaceElement,
      initialFocusTarget: closeButton,
      restoreFocusTarget: trigger,
      closeAnnouncement: 'Closed context drawer.',
    });

    manager.openSurface('context-drawer', {
      trigger,
      announceMessage: 'Opened context drawer.',
    });

    expect(manager.isSurfaceOpen('context-drawer')).toBe(true);
    expect(surfaceElement.hidden).toBe(false);
    expect(documentRef.activeElement).toBe(closeButton);
    expect(statusRegion.textContent).toBe('Opened context drawer.');

    manager.closeSurface('context-drawer');

    expect(manager.isSurfaceOpen('context-drawer')).toBe(false);
    expect(surfaceElement.hidden).toBe(true);
    expect(documentRef.activeElement).toBe(trigger);
    expect(statusRegion.textContent).toBe('Closed context drawer.');
  });

  it('closes the highest-priority open surface first', () => {
    const documentRef = createFakeDocument();
    const manager = createSurfaceManager({ documentRef });
    const drawer = new FakeHTMLElement(documentRef, 'section');
    const dialog = new FakeHTMLElement(documentRef, 'section');

    manager.registerSurface({
      id: 'context-drawer',
      element: drawer,
      priority: 30,
      modal: true,
    });
    manager.registerSurface({
      id: 'confirm-dialog',
      element: dialog,
      priority: 50,
      modal: true,
    });

    manager.openSurface('context-drawer');
    manager.openSurface('confirm-dialog');

    expect(manager.getActiveSurface()?.id).toBe('confirm-dialog');

    manager.closeTopSurface({ reason: 'escape' });

    expect(manager.isSurfaceOpen('confirm-dialog')).toBe(false);
    expect(manager.isSurfaceOpen('context-drawer')).toBe(true);
    expect(manager.getActiveSurface()?.id).toBe('context-drawer');
  });
});
