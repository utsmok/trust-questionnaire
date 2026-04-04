import { describe, it, expect } from 'vitest';
import { matchesCondition } from '../../../static/js/state/derive/rules-eval.js';

const makeState = (fields = {}) => ({ fields });
const makeContext = (overrides = {}) => ({
  derivedFieldValues: {},
  pageStates: { bySectionId: {} },
  ...overrides,
});

describe('matchesCondition', () => {
  it('returns true for null condition', () => {
    expect(matchesCondition(null, makeState(), makeContext())).toBe(true);
  });

  it('returns true for undefined condition', () => {
    expect(matchesCondition(undefined, makeState(), makeContext())).toBe(true);
  });

  describe('equals', () => {
    it('matches when field value equals condition value', () => {
      const condition = { fieldId: 'f1', operator: 'equals', value: 'yes' };
      expect(matchesCondition(condition, makeState({ f1: 'yes' }), makeContext())).toBe(true);
    });

    it('does not match when field value differs', () => {
      const condition = { fieldId: 'f1', operator: 'equals', value: 'yes' };
      expect(matchesCondition(condition, makeState({ f1: 'no' }), makeContext())).toBe(false);
    });

    it('matches null value', () => {
      const condition = { fieldId: 'f1', operator: 'equals', value: null };
      expect(matchesCondition(condition, makeState({ f1: null }), makeContext())).toBe(true);
    });

    it('does not match when field is missing (undefined)', () => {
      const condition = { fieldId: 'f1', operator: 'equals', value: 'yes' };
      expect(matchesCondition(condition, makeState(), makeContext())).toBe(false);
    });
  });

  describe('not_equals', () => {
    it('matches when field value differs from condition value', () => {
      const condition = { fieldId: 'f1', operator: 'not_equals', value: 'yes' };
      expect(matchesCondition(condition, makeState({ f1: 'no' }), makeContext())).toBe(true);
    });

    it('does not match when values are the same', () => {
      const condition = { fieldId: 'f1', operator: 'not_equals', value: 'yes' };
      expect(matchesCondition(condition, makeState({ f1: 'yes' }), makeContext())).toBe(false);
    });

    it('matches when field is missing and condition value is not undefined', () => {
      const condition = { fieldId: 'f1', operator: 'not_equals', value: 'something' };
      expect(matchesCondition(condition, makeState(), makeContext())).toBe(true);
    });
  });

  describe('in', () => {
    it('matches when field value is in the array', () => {
      const condition = { fieldId: 'f1', operator: 'in', value: ['a', 'b', 'c'] };
      expect(matchesCondition(condition, makeState({ f1: 'b' }), makeContext())).toBe(true);
    });

    it('does not match when field value is not in the array', () => {
      const condition = { fieldId: 'f1', operator: 'in', value: ['a', 'b'] };
      expect(matchesCondition(condition, makeState({ f1: 'c' }), makeContext())).toBe(false);
    });

    it('returns false when value is not an array', () => {
      const condition = { fieldId: 'f1', operator: 'in', value: 'not-array' };
      expect(matchesCondition(condition, makeState({ f1: 'not-array' }), makeContext())).toBe(false);
    });
  });

  describe('not_in', () => {
    it('matches when field value is not in the array', () => {
      const condition = { fieldId: 'f1', operator: 'not_in', value: ['a', 'b'] };
      expect(matchesCondition(condition, makeState({ f1: 'c' }), makeContext())).toBe(true);
    });

    it('does not match when field value is in the array', () => {
      const condition = { fieldId: 'f1', operator: 'not_in', value: ['a', 'b'] };
      expect(matchesCondition(condition, makeState({ f1: 'a' }), makeContext())).toBe(false);
    });

    it('returns false when value is not an array', () => {
      const condition = { fieldId: 'f1', operator: 'not_in', value: 'not-array' };
      expect(matchesCondition(condition, makeState({ f1: 'x' }), makeContext())).toBe(false);
    });
  });

  describe('has_any', () => {
    it('matches when field value is a non-empty string', () => {
      const condition = { fieldId: 'f1', operator: 'has_any' };
      expect(matchesCondition(condition, makeState({ f1: 'item1, item2' }), makeContext())).toBe(true);
    });

    it('does not match when field value is empty string', () => {
      const condition = { fieldId: 'f1', operator: 'has_any' };
      expect(matchesCondition(condition, makeState({ f1: '' }), makeContext())).toBe(false);
    });

    it('does not match when field value is null', () => {
      const condition = { fieldId: 'f1', operator: 'has_any' };
      expect(matchesCondition(condition, makeState({ f1: null }), makeContext())).toBe(false);
    });

    it('matches when field value is an array with entries', () => {
      const condition = { fieldId: 'f1', operator: 'has_any' };
      expect(matchesCondition(condition, makeState({ f1: ['a', 'b'] }), makeContext())).toBe(true);
    });
  });

  describe('not_empty', () => {
    it('matches when field has a meaningful string value', () => {
      const condition = { fieldId: 'f1', operator: 'not_empty' };
      expect(matchesCondition(condition, makeState({ f1: 'hello' }), makeContext())).toBe(true);
    });

    it('does not match when field is null', () => {
      const condition = { fieldId: 'f1', operator: 'not_empty' };
      expect(matchesCondition(condition, makeState({ f1: null }), makeContext())).toBe(false);
    });

    it('does not match when field is undefined', () => {
      const condition = { fieldId: 'f1', operator: 'not_empty' };
      expect(matchesCondition(condition, makeState(), makeContext())).toBe(false);
    });

    it('does not match when field is empty string', () => {
      const condition = { fieldId: 'f1', operator: 'not_empty' };
      expect(matchesCondition(condition, makeState({ f1: '   ' }), makeContext())).toBe(false);
    });

    it('matches when field is a non-empty array', () => {
      const condition = { fieldId: 'f1', operator: 'not_empty' };
      expect(matchesCondition(condition, makeState({ f1: [1] }), makeContext())).toBe(true);
    });

    it('matches when field is a number', () => {
      const condition = { fieldId: 'f1', operator: 'not_empty' };
      expect(matchesCondition(condition, makeState({ f1: 0 }), makeContext())).toBe(true);
    });
  });

  describe('empty', () => {
    it('matches when field is null', () => {
      const condition = { fieldId: 'f1', operator: 'empty' };
      expect(matchesCondition(condition, makeState({ f1: null }), makeContext())).toBe(true);
    });

    it('matches when field is undefined', () => {
      const condition = { fieldId: 'f1', operator: 'empty' };
      expect(matchesCondition(condition, makeState(), makeContext())).toBe(true);
    });

    it('matches when field is empty string', () => {
      const condition = { fieldId: 'f1', operator: 'empty' };
      expect(matchesCondition(condition, makeState({ f1: '' }), makeContext())).toBe(true);
    });

    it('does not match when field has a value', () => {
      const condition = { fieldId: 'f1', operator: 'empty' };
      expect(matchesCondition(condition, makeState({ f1: 'text' }), makeContext())).toBe(false);
    });
  });

  describe('unknown operator', () => {
    it('returns false for unrecognized operator', () => {
      const condition = { fieldId: 'f1', operator: 'bogus', value: 'x' };
      expect(matchesCondition(condition, makeState({ f1: 'x' }), makeContext())).toBe(false);
    });
  });

  describe('sectionId-based conditions', () => {
    it('resolves section workflow state via context', () => {
      const condition = { sectionId: 's1', operator: 'equals', value: 'complete' };
      const context = makeContext({
        pageStates: { bySectionId: { s1: { workflowState: 'complete' } } },
      });
      expect(matchesCondition(condition, makeState(), context)).toBe(true);
    });

    it('returns null subject when section has no page state', () => {
      const condition = { sectionId: 's1', operator: 'equals', value: 'complete' };
      expect(matchesCondition(condition, makeState(), makeContext())).toBe(false);
    });
  });

  describe('derivedFieldValues', () => {
    it('prefers derived field value over state fields', () => {
      const condition = { fieldId: 'f1', operator: 'equals', value: 'derived' };
      const context = makeContext({ derivedFieldValues: { f1: 'derived' } });
      expect(matchesCondition(condition, makeState({ f1: 'raw' }), context)).toBe(true);
    });
  });

  describe('logical operators', () => {
    describe('all', () => {
      it('returns true when all sub-conditions match', () => {
        const condition = {
          all: [
            { fieldId: 'f1', operator: 'equals', value: 'a' },
            { fieldId: 'f2', operator: 'equals', value: 'b' },
          ],
        };
        expect(matchesCondition(condition, makeState({ f1: 'a', f2: 'b' }), makeContext())).toBe(true);
      });

      it('returns false when any sub-condition fails', () => {
        const condition = {
          all: [
            { fieldId: 'f1', operator: 'equals', value: 'a' },
            { fieldId: 'f2', operator: 'equals', value: 'b' },
          ],
        };
        expect(matchesCondition(condition, makeState({ f1: 'a', f2: 'x' }), makeContext())).toBe(false);
      });

      it('returns true for empty all array', () => {
        const condition = { all: [] };
        expect(matchesCondition(condition, makeState(), makeContext())).toBe(true);
      });
    });

    describe('any', () => {
      it('returns true when any sub-condition matches', () => {
        const condition = {
          any: [
            { fieldId: 'f1', operator: 'equals', value: 'a' },
            { fieldId: 'f2', operator: 'equals', value: 'b' },
          ],
        };
        expect(matchesCondition(condition, makeState({ f1: 'a', f2: 'x' }), makeContext())).toBe(true);
      });

      it('returns false when no sub-conditions match', () => {
        const condition = {
          any: [
            { fieldId: 'f1', operator: 'equals', value: 'a' },
            { fieldId: 'f2', operator: 'equals', value: 'b' },
          ],
        };
        expect(matchesCondition(condition, makeState({ f1: 'x', f2: 'y' }), makeContext())).toBe(false);
      });

      it('returns false for empty any array', () => {
        const condition = { any: [] };
        expect(matchesCondition(condition, makeState(), makeContext())).toBe(false);
      });
    });

    describe('not', () => {
      it('negates a matching condition', () => {
        const condition = { not: { fieldId: 'f1', operator: 'equals', value: 'a' } };
        expect(matchesCondition(condition, makeState({ f1: 'a' }), makeContext())).toBe(false);
      });

      it('negates a non-matching condition', () => {
        const condition = { not: { fieldId: 'f1', operator: 'equals', value: 'a' } };
        expect(matchesCondition(condition, makeState({ f1: 'b' }), makeContext())).toBe(true);
      });
    });
  });

  describe('nested conditions', () => {
    it('handles all containing not', () => {
      const condition = {
        all: [
          { fieldId: 'f1', operator: 'equals', value: 'a' },
          { not: { fieldId: 'f2', operator: 'equals', value: 'b' } },
        ],
      };
      expect(matchesCondition(condition, makeState({ f1: 'a', f2: 'c' }), makeContext())).toBe(true);
      expect(matchesCondition(condition, makeState({ f1: 'a', f2: 'b' }), makeContext())).toBe(false);
    });

    it('handles any containing all', () => {
      const condition = {
        any: [
          {
            all: [
              { fieldId: 'f1', operator: 'equals', value: 'a' },
              { fieldId: 'f2', operator: 'equals', value: 'b' },
            ],
          },
          { fieldId: 'f3', operator: 'equals', value: 'c' },
        ],
      };
      expect(matchesCondition(condition, makeState({ f1: 'a', f2: 'b', f3: 'x' }), makeContext())).toBe(true);
      expect(matchesCondition(condition, makeState({ f1: 'x', f2: 'b', f3: 'c' }), makeContext())).toBe(true);
      expect(matchesCondition(condition, makeState({ f1: 'x', f2: 'y', f3: 'z' }), makeContext())).toBe(false);
    });
  });
});
