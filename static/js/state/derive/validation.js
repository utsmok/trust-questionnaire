import {
  CROSS_FIELD_VALIDATION_RULES,
  VALIDATION_STATES,
} from '../../config/rules.js';
import { EMPTY_ARRAY, isPlainObject } from '../../utils/shared.js';
import {
  EMPTY_OBJECT,
  createValidationIssue,
  dedupeValidationIssues,
  normalizeState,
  parseIsoDate,
} from './helpers.js';
import { derivePageStates } from './workflow.js';
import { deriveFieldStates } from './fields.js';

export const deriveCrossFieldValidations = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const fieldStates = context.fieldStates ?? deriveFieldStates(state, {
    ...context,
    pageStates,
    includeCrossFieldValidations: false,
  });
  const byFieldId = {};
  const issues = [];

  const addIssue = (fieldId, issue) => {
    if (!fieldId || !issue) {
      return;
    }

    const nextIssues = byFieldId[fieldId] ?? [];
    nextIssues.push(issue);
    byFieldId[fieldId] = nextIssues;
    issues.push(issue);
  };

  for (const rule of CROSS_FIELD_VALIDATION_RULES) {
    const targetFieldStates = rule.targetFieldIds
      .map((fieldId) => fieldStates.byId[fieldId])
      .filter(Boolean)
      .filter((fieldState) => fieldState.suppressedBySkip !== true);

    if (
      targetFieldStates.length === 0
      || !targetFieldStates.some((fieldState) =>
        fieldState.visible || fieldState.answered || fieldState.logicallyRequired)
    ) {
      continue;
    }

    switch (rule.type) {
      case 'date_order': {
        const earlierState = fieldStates.byId[rule.earlierFieldId];
        const laterState = fieldStates.byId[rule.laterFieldId];

        if (
          !earlierState
          || !laterState
          || earlierState.suppressedBySkip
          || laterState.suppressedBySkip
        ) {
          break;
        }

        const earlierDate = parseIsoDate(earlierState.value);
        const laterDate = parseIsoDate(laterState.value);

        if (!earlierDate || !laterDate || laterDate.getTime() >= earlierDate.getTime()) {
          break;
        }

        rule.targetFieldIds.forEach((fieldId) => {
          addIssue(
            fieldId,
            createValidationIssue({
              ruleId: rule.id,
              severity: VALIDATION_STATES.INVALID,
              kind: 'chronology',
              message: rule.description,
              fieldId,
              relatedFieldIds: rule.targetFieldIds,
            }),
          );
        });
        break;
      }
      case 'date_after_latest_of': {
        const subjectState = fieldStates.byId[rule.subjectFieldId];

        if (!subjectState || subjectState.suppressedBySkip) {
          break;
        }

        const subjectDate = parseIsoDate(subjectState.value);

        if (!subjectDate) {
          break;
        }

        const referenceDates = rule.referenceFieldIds
          .map((fieldId) => fieldStates.byId[fieldId])
          .filter(Boolean)
          .filter((fieldState) => fieldState.suppressedBySkip !== true)
          .map((fieldState) => parseIsoDate(fieldState.value))
          .filter(Boolean);

        if (
          referenceDates.length === 0
          || subjectDate.getTime() > Math.max(...referenceDates.map((date) => date.getTime()))
        ) {
          break;
        }

        addIssue(
          rule.subjectFieldId,
          createValidationIssue({
            ruleId: rule.id,
            severity: VALIDATION_STATES.INVALID,
            kind: 'chronology',
            message: rule.description,
            fieldId: rule.subjectFieldId,
            relatedFieldIds: rule.targetFieldIds,
          }),
        );
        break;
      }
      case 'field_value_alignment': {
        const sourceState = fieldStates.byId[rule.sourceFieldId];
        const relatedState = fieldStates.byId[rule.relatedFieldId];

        if (
          !sourceState
          || !relatedState
          || sourceState.suppressedBySkip
          || relatedState.suppressedBySkip
          || sourceState.value !== rule.sourceValue
          || relatedState.value === rule.expectedValue
        ) {
          break;
        }

        rule.targetFieldIds.forEach((fieldId) => {
          addIssue(
            fieldId,
            createValidationIssue({
              ruleId: rule.id,
              severity: VALIDATION_STATES.INVALID,
              kind: 'field_alignment',
              message: rule.description,
              fieldId,
              relatedFieldIds: rule.targetFieldIds,
            }),
          );
        });
        break;
      }
      default:
        break;
    }
  }

  return {
    byFieldId: Object.fromEntries(
      Object.entries(byFieldId).map(([fieldId, fieldIssues]) => [
        fieldId,
        dedupeValidationIssues(fieldIssues),
      ]),
    ),
    issues: dedupeValidationIssues(issues),
  };
};
