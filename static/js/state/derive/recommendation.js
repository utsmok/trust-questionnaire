import {
  FIELD_IDS,
} from '../../config/questionnaire-schema.js';
import {
  CONDITIONAL_RECOMMENDATION_VALUES,
  POSITIVE_RECOMMENDATION_VALUES,
  RECOMMENDATION_CONSTRAINT_RULES,
  RECOMMENDATION_VALUE_ORDER,
} from '../../config/rules.js';
import {
  EMPTY_OBJECT,
  getFieldValue,
  normalizeState,
} from './helpers.js';
import { matchesCondition } from './rules-eval.js';

export const deriveRecommendationConstraints = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const allowedValues = new Set(RECOMMENDATION_VALUE_ORDER);
  const blockedReasons = {};
  const activeRuleIds = [];

  for (const rule of RECOMMENDATION_CONSTRAINT_RULES) {
    if (!matchesCondition(rule.when, state, context)) {
      continue;
    }

    activeRuleIds.push(rule.id);

    if (Array.isArray(rule.allowedValues)) {
      for (const value of Array.from(allowedValues)) {
        if (!rule.allowedValues.includes(value)) {
          allowedValues.delete(value);
        }
      }
    }

    const released = rule.releaseCondition ? matchesCondition(rule.releaseCondition, state, context) : false;

    if (!released && Array.isArray(rule.blockedValues)) {
      for (const value of rule.blockedValues) {
        allowedValues.delete(value);
        const reasons = blockedReasons[value] ?? [];
        reasons.push({ ruleId: rule.id, description: rule.description });
        blockedReasons[value] = reasons;
      }
    }
  }

  const selectedValue = getFieldValue(state, FIELD_IDS.S9.RECOMMENDATION_STATUS) ?? null;

  return {
    allowedValues: Array.from(allowedValues),
    blockedValues: Object.keys(blockedReasons),
    blockedReasons,
    activeRuleIds,
    selectedValue,
    selectedValueBlocked: selectedValue ? blockedReasons[selectedValue] ?? null : null,
    positiveRecommendationLocked: POSITIVE_RECOMMENDATION_VALUES.some(
      (value) => Array.isArray(blockedReasons[value]),
    ),
    requiresConditionsOrCaveats: CONDITIONAL_RECOMMENDATION_VALUES.includes(selectedValue),
  };
};
