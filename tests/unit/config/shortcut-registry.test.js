import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  findMatchingGlobalShortcut,
  isTypingTarget,
} from '../../../static/js/config/shortcut-registry.js';

class FakeHTMLElement {
  constructor(tagName = 'DIV', attributes = {}) {
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map(Object.entries(attributes));
    this.isContentEditable = false;
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }
}

describe('shortcut registry', () => {
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

  it('matches the canonical principle quick-jump shortcuts', () => {
    expect(
      findMatchingGlobalShortcut({
        key: '1',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      })?.commandId,
    ).toBe('jump-transparent');

    expect(
      findMatchingGlobalShortcut({
        key: 'g',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: true,
      })?.commandId,
    ).toBe('open-guidance-tab');
    expect(
      findMatchingGlobalShortcut({
        key: 'x',
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
      }),
    ).toBeNull();
  });

  it('distinguishes typing targets from navigation controls', () => {
    expect(isTypingTarget(new FakeHTMLElement('input', { type: 'text' }))).toBe(true);
    expect(isTypingTarget(new FakeHTMLElement('textarea'))).toBe(true);
    expect(isTypingTarget(new FakeHTMLElement('select'))).toBe(true);
    expect(isTypingTarget(new FakeHTMLElement('input', { type: 'checkbox' }))).toBe(false);
    expect(isTypingTarget(new FakeHTMLElement('button'))).toBe(false);
  });
});
