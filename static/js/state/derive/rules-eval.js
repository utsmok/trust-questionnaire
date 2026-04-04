import { EMPTY_OBJECT, getFieldValue, hasMeaningfulRawValue } from './helpers.js';
import { normalizeDelimitedList } from '../../utils/shared.js';

const getConditionValue = (condition, state, context) => {
  if (condition.fieldId) {
    return (
      context.derivedFieldValues?.[condition.fieldId] ?? getFieldValue(state, condition.fieldId)
    );
  }

  if (condition.sectionId) {
    return context.pageStates?.bySectionId?.[condition.sectionId]?.workflowState ?? null;
  }

  return null;
};

const matchLeafCondition = (condition, state, context) => {
  const subjectValue = getConditionValue(condition, state, context);

  switch (condition.operator) {
    case 'equals':
      return subjectValue === condition.value;
    case 'not_equals':
      return subjectValue !== condition.value;
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(subjectValue);
    case 'not_in':
      return Array.isArray(condition.value) && !condition.value.includes(subjectValue);
    case 'has_any':
      return normalizeDelimitedList(subjectValue).length > 0;
    case 'not_empty':
      return hasMeaningfulRawValue(subjectValue);
    case 'empty':
      return !hasMeaningfulRawValue(subjectValue);
    default:
      return false;
  }
};

export const matchesCondition = (condition, state, context) => {
  if (!condition) {
    return true;
  }

  if (Array.isArray(condition.all)) {
    return condition.all.every((part) => matchesCondition(part, state, context));
  }

  if (Array.isArray(condition.any)) {
    return condition.any.some((part) => matchesCondition(part, state, context));
  }

  if (condition.not) {
    return !matchesCondition(condition.not, state, context);
  }

  return matchLeafCondition(condition, state, context);
};
