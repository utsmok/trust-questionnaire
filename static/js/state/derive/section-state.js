import { QUESTIONNAIRE_SECTIONS } from '../../config/questionnaire-schema.js';
import { SECTION_STATUS, SKIP_POLICY, VALIDATION_STATES } from '../../config/rules.js';
import { SECTION_WORKFLOW_STATES } from '../../config/sections.js';
import {
  EMPTY_OBJECT,
  buildSectionSkipMeta,
  dedupeValidationIssues,
  getSectionRecord,
  normalizeState,
  resolveSkipMeta,
} from './helpers.js';
import { EMPTY_ARRAY } from '../../utils/shared.js';
import { derivePageStates } from './workflow.js';
import { deriveFieldStates } from './fields.js';

export const deriveSectionStates = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const fieldStatesBundle = context.fieldStates ?? deriveFieldStates(state, context);
  const sectionSkipMetaLookup =
    context.sectionSkipMeta ??
    context.criterionStates?.sectionSkipMeta ??
    buildSectionSkipMeta(state);
  const bySectionId = {};

  for (const section of QUESTIONNAIRE_SECTIONS) {
    const pageState = pageStates.bySectionId[section.id];
    const sectionSkipMeta =
      sectionSkipMetaLookup[section.id] ??
      resolveSkipMeta(getSectionRecord(state, section.id), SKIP_POLICY.section, {
        sectionId: section.id,
      });
    const fieldStates = fieldStatesBundle.bySectionId[section.id] ?? EMPTY_ARRAY;
    const logicallyRequiredFieldStates = fieldStates.filter(
      (fieldState) => fieldState.logicallyRequired,
    );
    const logicalMissingFieldStates = logicallyRequiredFieldStates.filter(
      (fieldState) => fieldState.answered === false,
    );
    const answeredFieldCount = fieldStates.filter(
      (fieldState) => fieldState.visible && fieldState.answered,
    ).length;
    const hasConditionalMissing = logicalMissingFieldStates.some(
      (fieldState) => fieldState.baseRequiredPolicy === 'conditional',
    );
    const invalidFieldStates = fieldStates.filter((fieldState) => fieldState.invalid);
    const blockedReasons = dedupeValidationIssues(
      fieldStates
        .filter((fieldState) => fieldState.blocked)
        .flatMap((fieldState) => fieldState.issues)
        .filter((issue) => issue.severity === VALIDATION_STATES.BLOCKED)
        .map((issue) => ({
          ruleId: issue.ruleId,
          description: issue.message,
          fieldId: issue.fieldId,
        })),
    );

    let validationState = VALIDATION_STATES.CLEAR;

    let status = SECTION_STATUS.NOT_STARTED;

    if (pageState.workflowState === SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED) {
      status = SECTION_STATUS.SYSTEM_SKIPPED;
      validationState = VALIDATION_STATES.CLEAR;
    } else if (sectionSkipMeta.requested) {
      validationState = sectionSkipMeta.validationState;
      status = sectionSkipMeta.satisfied
        ? SECTION_STATUS.SKIPPED
        : SECTION_STATUS.ATTENTION_REQUIRED;
    } else if (blockedReasons.length > 0) {
      status = SECTION_STATUS.BLOCKED;
      validationState = VALIDATION_STATES.BLOCKED;
    } else if (invalidFieldStates.length > 0) {
      status = SECTION_STATUS.ATTENTION_REQUIRED;
      validationState = VALIDATION_STATES.INVALID;
    } else if (logicalMissingFieldStates.length === 0) {
      status =
        answeredFieldCount > 0 || logicallyRequiredFieldStates.length > 0
          ? SECTION_STATUS.COMPLETE
          : SECTION_STATUS.NOT_STARTED;
      validationState = VALIDATION_STATES.CLEAR;
    } else if (answeredFieldCount === 0) {
      status = SECTION_STATUS.NOT_STARTED;
      validationState = VALIDATION_STATES.CLEAR;
    } else if (hasConditionalMissing) {
      status = SECTION_STATUS.ATTENTION_REQUIRED;
      validationState = VALIDATION_STATES.ATTENTION;
    } else {
      status = SECTION_STATUS.IN_PROGRESS;
      validationState = VALIDATION_STATES.CLEAR;
    }

    bySectionId[section.id] = {
      sectionId: section.id,
      status,
      validationState,
      attention: validationState === VALIDATION_STATES.ATTENTION,
      invalid: validationState === VALIDATION_STATES.INVALID,
      blocked: validationState === VALIDATION_STATES.BLOCKED,
      skipRequested: sectionSkipMeta.requested,
      skipSatisfied: sectionSkipMeta.satisfied,
      skipMeta: sectionSkipMeta,
      logicallyRequiredFieldCount: logicallyRequiredFieldStates.length,
      logicalMissingFieldIds: logicalMissingFieldStates.map((fieldState) => fieldState.fieldId),
      answeredFieldCount,
      blockedReasons,
      invalidFieldIds: invalidFieldStates.map((fieldState) => fieldState.fieldId),
      attentionFieldIds: fieldStates
        .filter((fieldState) => fieldState.attention)
        .map((fieldState) => fieldState.fieldId),
    };
  }

  return { bySectionId };
};
