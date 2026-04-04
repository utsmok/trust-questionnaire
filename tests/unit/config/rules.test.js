import { describe, it, expect } from 'vitest';
import {
  SKIP_POLICY,
  SKIP_STATES,
  VALIDATION_STATES,
  FIELD_VISIBILITY_RULES,
  FIELD_VISIBILITY_RULES_BY_TARGET,
  FIELD_REQUIREMENT_RULES,
  FIELD_REQUIREMENT_RULES_BY_TARGET,
} from '../../../static/js/config/rules.js';

describe('SKIP_POLICY', () => {
  it('has section and criterion scopes', () => {
    expect(SKIP_POLICY.section).toBeDefined();
    expect(SKIP_POLICY.criterion).toBeDefined();
  });

  it('section scope has required properties', () => {
    const section = SKIP_POLICY.section;
    expect(section.scope).toBe('section');
    expect(section.allowUserSkip).toBe(true);
    expect(section.requiresReasonCode).toBe(true);
    expect(section.requiresRationale).toBe(true);
    expect(typeof section.rationaleMinLength).toBe('number');
    expect(Array.isArray(section.reasonCodeKeys)).toBe(true);
    expect(Array.isArray(section.rationaleKeys)).toBe(true);
    expect(Array.isArray(section.userReasonCodes)).toBe(true);
    expect(Array.isArray(section.systemReasonCodes)).toBe(true);
  });

  it('criterion scope has required properties', () => {
    const criterion = SKIP_POLICY.criterion;
    expect(criterion.scope).toBe('criterion');
    expect(criterion.allowUserSkip).toBe(true);
    expect(criterion.requiresReasonCode).toBe(true);
    expect(criterion.requiresRationale).toBe(true);
    expect(typeof criterion.rationaleMinLength).toBe('number');
    expect(Array.isArray(criterion.reasonCodeKeys)).toBe(true);
    expect(Array.isArray(criterion.rationaleKeys)).toBe(true);
  });

  it('section uses INHERITED_SECTION_SKIP for inherited state', () => {
    expect(SKIP_POLICY.section.inheritedCriterionSkipState).toBe(SKIP_STATES.INHERITED_SECTION_SKIP);
  });

  it('criterion uses INHERITED_SECTION_SKIP for inherited state', () => {
    expect(SKIP_POLICY.criterion.inheritedFieldSkipState).toBe(SKIP_STATES.INHERITED_SECTION_SKIP);
  });

  it('rationaleMinLength is at least 20 for both scopes', () => {
    expect(SKIP_POLICY.section.rationaleMinLength).toBeGreaterThanOrEqual(20);
    expect(SKIP_POLICY.criterion.rationaleMinLength).toBeGreaterThanOrEqual(20);
  });
});

describe('FIELD_VISIBILITY_RULES_BY_TARGET', () => {
  it('is a frozen object', () => {
    expect(Object.isFrozen(FIELD_VISIBILITY_RULES_BY_TARGET)).toBe(true);
  });

  it('indexes rules by targetFieldId', () => {
    const targets = Object.keys(FIELD_VISIBILITY_RULES_BY_TARGET);
    expect(targets.length).toBeGreaterThan(0);

    for (const target of targets) {
      const rules = FIELD_VISIBILITY_RULES_BY_TARGET[target];
      expect(Array.isArray(rules)).toBe(true);
      for (const rule of rules) {
        expect(rule.targetFieldId).toBe(target);
      }
    }
  });

  it('every rule has required fields', () => {
    for (const rule of FIELD_VISIBILITY_RULES) {
      expect(rule.id).toBeDefined();
      expect(rule.targetFieldId).toBeDefined();
      expect(rule.when).toBeDefined();
      expect(rule.description).toBeDefined();
    }
  });
});

describe('FIELD_REQUIREMENT_RULES_BY_TARGET', () => {
  it('is a frozen object', () => {
    expect(Object.isFrozen(FIELD_REQUIREMENT_RULES_BY_TARGET)).toBe(true);
  });

  it('indexes rules by targetFieldId', () => {
    const targets = Object.keys(FIELD_REQUIREMENT_RULES_BY_TARGET);
    expect(targets.length).toBeGreaterThan(0);

    for (const target of targets) {
      const rules = FIELD_REQUIREMENT_RULES_BY_TARGET[target];
      expect(Array.isArray(rules)).toBe(true);
      for (const rule of rules) {
        expect(rule.targetFieldId).toBe(target);
      }
    }
  });

  it('every rule has required fields', () => {
    for (const rule of FIELD_REQUIREMENT_RULES) {
      expect(rule.id).toBeDefined();
      expect(rule.targetFieldId).toBeDefined();
      expect(rule.when).toBeDefined();
      expect(rule.description).toBeDefined();
    }
  });
});

describe('SKIP_STATES', () => {
  it('contains expected state values', () => {
    expect(SKIP_STATES.NOT_STARTED).toBe('not_started');
    expect(SKIP_STATES.ANSWERED).toBe('answered');
    expect(SKIP_STATES.USER_SKIPPED).toBe('user_skipped');
    expect(SKIP_STATES.SYSTEM_SKIPPED).toBe('system_skipped');
    expect(SKIP_STATES.INHERITED_SECTION_SKIP).toBe('inherited_section_skip');
  });
});

describe('VALIDATION_STATES', () => {
  it('contains expected state values', () => {
    expect(VALIDATION_STATES.CLEAR).toBe('clear');
    expect(VALIDATION_STATES.ATTENTION).toBe('attention');
    expect(VALIDATION_STATES.INVALID).toBe('invalid');
    expect(VALIDATION_STATES.BLOCKED).toBe('blocked');
  });
});
