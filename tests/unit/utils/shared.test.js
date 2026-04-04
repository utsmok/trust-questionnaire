import { describe, it, expect } from 'vitest';
import {
  normalizeTextValue,
  normalizeDelimitedList,
  isPlainObject,
  isImageMimeType,
  inferMimeTypeFromName,
  extractEvidenceItems,
  joinTokens,
  getCompletionGroupLabel,
  formatProgressStateLabel,
} from '../../../static/js/utils/shared.js';

describe('normalizeTextValue', () => {
  it('returns null for null', () => {
    expect(normalizeTextValue(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(normalizeTextValue(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeTextValue('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normalizeTextValue('   ')).toBeNull();
  });

  it('trims and returns a non-empty string', () => {
    expect(normalizeTextValue('  hello  ')).toBe('hello');
  });

  it('converts numbers to string', () => {
    expect(normalizeTextValue(42)).toBe('42');
  });
});

describe('normalizeDelimitedList', () => {
  it('splits comma-separated string', () => {
    expect(normalizeDelimitedList('a, b, c')).toEqual(['a', 'b', 'c']);
  });

  it('splits newline-separated string', () => {
    expect(normalizeDelimitedList('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array for null', () => {
    expect(normalizeDelimitedList(null)).toEqual([]);
  });

  it('returns empty array for undefined', () => {
    expect(normalizeDelimitedList(undefined)).toEqual([]);
  });

  it('passes through an array, trimming and deduplicating', () => {
    expect(normalizeDelimitedList(['a', ' b ', 'a'])).toEqual(['a', 'b']);
  });

  it('handles a Set', () => {
    expect(normalizeDelimitedList(new Set(['x', 'y']))).toEqual(['x', 'y']);
  });

  it('wraps a single non-string value in an array', () => {
    expect(normalizeDelimitedList(42)).toEqual(['42']);
  });

  it('filters out empty entries', () => {
    expect(normalizeDelimitedList('a,,b, ,c')).toEqual(['a', 'b', 'c']);
  });

  it('uses custom splitter', () => {
    expect(normalizeDelimitedList('a|b|c', /\|/)).toEqual(['a', 'b', 'c']);
  });
});

describe('isPlainObject', () => {
  it('returns true for plain object', () => {
    expect(isPlainObject({})).toBe(true);
  });

  it('returns true for object with properties', () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isPlainObject(null)).toBe(false);
  });

  it('returns false for array', () => {
    expect(isPlainObject([])).toBe(false);
  });

  it('returns false for string', () => {
    expect(isPlainObject('hello')).toBe(false);
  });

  it('returns false for number', () => {
    expect(isPlainObject(42)).toBe(false);
  });
});

describe('isImageMimeType', () => {
  it('returns true for image/png', () => {
    expect(isImageMimeType('image/png')).toBe(true);
  });

  it('returns true for image/jpeg', () => {
    expect(isImageMimeType('image/jpeg')).toBe(true);
  });

  it('returns false for application/pdf', () => {
    expect(isImageMimeType('application/pdf')).toBe(false);
  });

  it('returns false for null', () => {
    expect(isImageMimeType(null)).toBe(false);
  });

  it('returns false for non-string', () => {
    expect(isImageMimeType(42)).toBe(false);
  });
});

describe('inferMimeTypeFromName', () => {
  it('infers png mime type', () => {
    expect(inferMimeTypeFromName('photo.png')).toBe('image/png');
  });

  it('infers jpeg mime type from .jpg', () => {
    expect(inferMimeTypeFromName('photo.jpg')).toBe('image/jpeg');
  });

  it('infers jpeg mime type from .jpeg', () => {
    expect(inferMimeTypeFromName('photo.jpeg')).toBe('image/jpeg');
  });

  it('infers pdf mime type', () => {
    expect(inferMimeTypeFromName('doc.pdf')).toBe('application/pdf');
  });

  it('infers json mime type', () => {
    expect(inferMimeTypeFromName('data.json')).toBe('application/json');
  });

  it('infers csv mime type', () => {
    expect(inferMimeTypeFromName('sheet.csv')).toBe('text/csv');
  });

  it('infers svg mime type', () => {
    expect(inferMimeTypeFromName('icon.svg')).toBe('image/svg+xml');
  });

  it('returns null for unknown extension', () => {
    expect(inferMimeTypeFromName('file.xyz')).toBeNull();
  });

  it('returns null for no extension', () => {
    expect(inferMimeTypeFromName('noext')).toBeNull();
  });

  it('returns null for null', () => {
    expect(inferMimeTypeFromName(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(inferMimeTypeFromName('')).toBeNull();
  });

  it('is case insensitive', () => {
    expect(inferMimeTypeFromName('Photo.PNG')).toBe('image/png');
  });
});

describe('extractEvidenceItems', () => {
  it('returns an array directly', () => {
    const items = [{ id: 1 }];
    expect(extractEvidenceItems(items)).toBe(items);
  });

  it('extracts items from object with items key', () => {
    const items = [{ id: 1 }];
    expect(extractEvidenceItems({ items })).toEqual(items);
  });

  it('extracts files from object with files key', () => {
    const files = [{ name: 'a.pdf' }];
    expect(extractEvidenceItems({ files })).toEqual(files);
  });

  it('prefers items over files', () => {
    const items = [{ id: 1 }];
    const files = [{ name: 'a.pdf' }];
    expect(extractEvidenceItems({ items, files })).toBe(items);
  });

  it('returns empty array for string', () => {
    expect(extractEvidenceItems('hello')).toEqual([]);
  });

  it('returns empty array for null', () => {
    expect(extractEvidenceItems(null)).toEqual([]);
  });

  it('returns empty array for object without items or files', () => {
    expect(extractEvidenceItems({ other: true })).toEqual([]);
  });
});

describe('joinTokens', () => {
  it('joins truthy values with middle dot', () => {
    expect(joinTokens(['a', 'b', 'c'])).toBe('a \u00b7 b \u00b7 c');
  });

  it('filters out falsy values', () => {
    expect(joinTokens(['a', null, 'b', undefined, '', 'c'])).toBe('a \u00b7 b \u00b7 c');
  });

  it('returns empty string for all falsy', () => {
    expect(joinTokens([null, undefined, ''])).toBe('');
  });

  it('returns single item without separator', () => {
    expect(joinTokens(['only'])).toBe('only');
  });
});

describe('getCompletionGroupLabel', () => {
  const groups = [
    { id: 'evidence', label: 'Evidence bundle' },
    { id: 'criteria', label: 'TRUST criteria' },
  ];

  it('returns label for matching group', () => {
    expect(getCompletionGroupLabel('evidence', groups)).toBe('Evidence bundle');
  });

  it('returns id when no group matches', () => {
    expect(getCompletionGroupLabel('unknown', groups)).toBe('unknown');
  });

  it('returns id when groups is empty', () => {
    expect(getCompletionGroupLabel('evidence', [])).toBe('evidence');
  });

  it('returns id when groups is default (empty)', () => {
    expect(getCompletionGroupLabel('evidence')).toBe('evidence');
  });
});

describe('formatProgressStateLabel', () => {
  it('returns label for known state', () => {
    expect(formatProgressStateLabel('complete')).toBe('Complete');
  });

  it('returns label for not_started', () => {
    expect(formatProgressStateLabel('not_started')).toBe('Not started');
  });

  it('returns label for in_progress', () => {
    expect(formatProgressStateLabel('in_progress')).toBe('In progress');
  });

  it('returns label for skipped', () => {
    expect(formatProgressStateLabel('skipped')).toBe('Skipped');
  });

  it('returns label for invalid_attention', () => {
    expect(formatProgressStateLabel('invalid_attention')).toBe('Needs attention');
  });

  it('returns fallback for unknown state', () => {
    expect(formatProgressStateLabel('bogus')).toBe('Not started');
  });

  it('returns custom fallback', () => {
    expect(formatProgressStateLabel('bogus', 'Custom')).toBe('Custom');
  });
});
