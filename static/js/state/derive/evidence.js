import {
  CRITERIA,
  CRITERION_FIELD_IDS,
  FIELD_IDS,
  QUESTIONNAIRE_FIELDS_BY_ID,
} from '../../config/questionnaire-schema.js';
import { EVIDENCE_COMPLETENESS_RULES, SKIP_STATES } from '../../config/rules.js';
import { SECTION_IDS } from '../../config/sections.js';
import { extractEvidenceItems } from '../../utils/shared.js';
import {
  EMPTY_OBJECT,
  getFieldValue,
  getTypedFieldValidationIssues,
  hasEvidenceNote,
  hasMeaningfulText,
  isFieldValuePresent,
  normalizeState,
  normalizeUrlList,
} from './helpers.js';
import { derivePageStates } from './workflow.js';
import { deriveCriterionStates } from './criterion.js';

export const deriveEvidenceCompleteness = (evaluation, context = EMPTY_OBJECT) => {
  const state = normalizeState(evaluation);
  const pageStates = context.pageStates ?? derivePageStates(state);
  const criterionStatesBundle = context.criterionStates ?? deriveCriterionStates(state, pageStates);
  const evaluationEvidenceItems = extractEvidenceItems(state.evidence.evaluation);
  const evaluationFolderLinkField = QUESTIONNAIRE_FIELDS_BY_ID[FIELD_IDS.S2.EVIDENCE_FOLDER_LINK];
  const evaluationFolderLinkValue = getFieldValue(state, FIELD_IDS.S2.EVIDENCE_FOLDER_LINK);
  const hasEvaluationFolderLink = isFieldValuePresent(
    evaluationFolderLinkField,
    evaluationFolderLinkValue,
  );
  const evaluationFolderLinkValid =
    getTypedFieldValidationIssues(evaluationFolderLinkField, evaluationFolderLinkValue).length ===
    0;
  const criteria = {};

  for (const criterion of CRITERIA) {
    const evidenceItems = extractEvidenceItems(state.evidence.criteria?.[criterion.code]);
    const criterionState = criterionStatesBundle.byCode[criterion.code];
    const evidenceLinksFieldId = CRITERION_FIELD_IDS[criterion.code].evidenceLinks;

    criteria[criterion.code] = {
      criterionCode: criterion.code,
      complete:
        criterionState.skipState === SKIP_STATES.USER_SKIPPED
          ? criterionState.skipSatisfied
          : criterionState.skipState === SKIP_STATES.INHERITED_SECTION_SKIP ||
              criterionState.skipState === SKIP_STATES.SYSTEM_SKIPPED
            ? true
            : criterionState.evidenceComplete,
      summaryPresent:
        criterionState.evidenceComplete || hasMeaningfulText(criterionState.values.evidenceSummary),
      linksPresent:
        normalizeUrlList(criterionState.values.evidenceLinks).length > 0 &&
        !criterionState.invalidFieldIds.includes(evidenceLinksFieldId),
      itemCount: evidenceItems.length,
      noteHookComplete: evidenceItems.length === 0 || evidenceItems.every(hasEvidenceNote),
    };
  }

  return {
    rules: EVIDENCE_COMPLETENESS_RULES,
    evaluation: {
      required: pageStates.bySectionId[SECTION_IDS.S2].isAccessible,
      hasFolderLink: hasEvaluationFolderLink,
      folderLinkValid: evaluationFolderLinkValid,
      itemCount: evaluationEvidenceItems.length,
      noteHookComplete:
        evaluationEvidenceItems.length === 0 || evaluationEvidenceItems.every(hasEvidenceNote),
      complete: hasEvaluationFolderLink && evaluationFolderLinkValid,
    },
    criteria,
    hooks: {
      evaluationEvidenceNotesReady:
        evaluationEvidenceItems.length === 0 || evaluationEvidenceItems.every(hasEvidenceNote),
      criterionAssociationNotesReady: Object.values(criteria).every(
        (criterion) => criterion.noteHookComplete,
      ),
    },
  };
};
