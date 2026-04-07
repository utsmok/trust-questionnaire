import crypto from 'node:crypto';

import { WORKFLOW_MODES } from '../../static/js/config/sections.js';
import { createEtagToken } from './etag.js';
import { LIFECYCLE_WORKFLOW_MODE_MAP } from './lifecycle.js';

export const LATEST_STATE_SCHEMA_VERSION = '1';
export const CURRENT_FRAMEWORK_VERSION = '2.0';
export const DEFAULT_LIFECYCLE_STATE = 'nomination_draft';

export const SAVE_REASONS = Object.freeze({
  CREATE_REVIEW: 'create_review',
  AUTOSAVE: 'autosave',
  MANUAL_SAVE: 'manual_save',
  ROUTE_LEAVE_FLUSH: 'route_leave_flush',
  VISIBILITY_FLUSH: 'visibility_flush',
  LIFECYCLE_TRANSITION: 'lifecycle_transition',
  IMPORT_APPLY: 'import_apply',
  MIGRATION_APPLY: 'migration_apply',
  CONFLICT_RECOVERY_SAVE: 'conflict_recovery_save',
});

const VALID_WORKFLOW_MODES = new Set(Object.values(WORKFLOW_MODES));
const VALID_SAVE_REASONS = new Set(Object.values(SAVE_REASONS));

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const clonePlainObject = (value) => {
  if (!isPlainObject(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
};

const cloneValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneValue(entry)]));
  }

  return value;
};

export const createEmptyEvaluationState = (workflowMode = WORKFLOW_MODES.NOMINATION) => ({
  workflow: { mode: workflowMode },
  fields: {},
  sections: {},
  criteria: {},
  evidence: {
    evaluation: [],
    criteria: {},
  },
  overrides: {
    principleJudgments: {},
  },
});

const assertWorkflowMode = (workflowMode) => {
  if (!VALID_WORKFLOW_MODES.has(workflowMode)) {
    throw new Error(`Unsupported workflow mode: ${workflowMode ?? '<missing>'}.`);
  }

  return workflowMode;
};

const assertLifecycleWorkflowCompatibility = (lifecycleState, workflowMode) => {
  const expectedWorkflowMode = LIFECYCLE_WORKFLOW_MODE_MAP[lifecycleState] ?? null;

  if (expectedWorkflowMode && expectedWorkflowMode !== workflowMode) {
    throw new Error(
      `Lifecycle state ${lifecycleState} is not compatible with workflow mode ${workflowMode}.`,
    );
  }
};

export const normalizeSaveReason = (saveReason) => {
  if (!saveReason) {
    return SAVE_REASONS.MANUAL_SAVE;
  }

  if (!VALID_SAVE_REASONS.has(saveReason)) {
    throw new Error(`Unsupported save reason: ${saveReason}.`);
  }

  return saveReason;
};

export const normalizeEvaluationState = (
  input,
  { defaultWorkflowMode = WORKFLOW_MODES.NOMINATION, requiredWorkflowMode } = {},
) => {
  const source = isPlainObject(input) ? input : createEmptyEvaluationState(defaultWorkflowMode);
  const workflowMode = assertWorkflowMode(source.workflow?.mode ?? defaultWorkflowMode);

  if (requiredWorkflowMode && workflowMode !== requiredWorkflowMode) {
    throw new Error(
      `Workflow mode changes are not allowed through the review-state API. Expected ${requiredWorkflowMode}, received ${workflowMode}.`,
    );
  }

  return {
    workflow: { mode: workflowMode },
    fields: clonePlainObject(source.fields),
    sections: clonePlainObject(source.sections),
    criteria: clonePlainObject(source.criteria),
    evidence: {
      evaluation: Array.isArray(source.evidence?.evaluation)
        ? source.evidence.evaluation.map((item) => cloneValue(item))
        : [],
      criteria: isPlainObject(source.evidence?.criteria)
        ? Object.fromEntries(
            Object.entries(source.evidence.criteria).map(([criterionCode, items]) => [
              criterionCode,
              Array.isArray(items) ? items.map((item) => cloneValue(item)) : [],
            ]),
          )
        : {},
    },
    overrides: {
      principleJudgments: clonePlainObject(source.overrides?.principleJudgments),
    },
  };
};

const generatePublicId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TR-${timestamp}-${suffix}`;
};

export const buildCreateEvaluationInput = ({ currentState, createdByUserId, titleSnapshot = '' }) => {
  const normalizedState = normalizeEvaluationState(currentState, {
    defaultWorkflowMode: WORKFLOW_MODES.NOMINATION,
    requiredWorkflowMode: WORKFLOW_MODES.NOMINATION,
  });
  const publicId = generatePublicId();
  const workflowMode = normalizedState.workflow.mode;
  const lifecycleState = DEFAULT_LIFECYCLE_STATE;

  assertLifecycleWorkflowCompatibility(lifecycleState, workflowMode);

  const currentRevisionNumber = 1;
  const currentEtag = createEtagToken({
    publicId,
    revisionNumber: currentRevisionNumber,
    workflowMode,
    lifecycleState,
    stateJson: normalizedState,
  });

  return {
    publicId,
    titleSnapshot: typeof titleSnapshot === 'string' ? titleSnapshot.trim() : '',
    workflowMode,
    lifecycleState,
    stateSchemaVersion: LATEST_STATE_SCHEMA_VERSION,
    frameworkVersion: CURRENT_FRAMEWORK_VERSION,
    currentStateJson: normalizedState,
    currentRevisionNumber,
    currentEtag,
    createdByUserId,
    primaryEvaluatorUserId: null,
    secondReviewerUserId: null,
    decisionOwnerUserId: null,
  };
};

export const buildUpdateEvaluationInput = ({ existingEvaluation, currentState, saveReason }) => {
  const normalizedState = normalizeEvaluationState(currentState, {
    requiredWorkflowMode: existingEvaluation.workflowMode,
  });
  const normalizedSaveReason = normalizeSaveReason(saveReason);
  const workflowMode = normalizedState.workflow.mode;
  const lifecycleState = existingEvaluation.lifecycleState;

  assertLifecycleWorkflowCompatibility(lifecycleState, workflowMode);

  const currentRevisionNumber = existingEvaluation.currentRevisionNumber + 1;
  const currentEtag = createEtagToken({
    publicId: existingEvaluation.publicId,
    revisionNumber: currentRevisionNumber,
    workflowMode,
    lifecycleState,
    stateJson: normalizedState,
  });

  return {
    workflowMode,
    lifecycleState,
    stateSchemaVersion: existingEvaluation.stateSchemaVersion,
    frameworkVersion: existingEvaluation.frameworkVersion,
    currentStateJson: normalizedState,
    currentRevisionNumber,
    currentEtag,
    saveReason: normalizedSaveReason,
  };
};

export const buildRevisionRecord = ({
  evaluationId,
  workflowMode,
  lifecycleState,
  stateSchemaVersion,
  frameworkVersion,
  stateJson,
  revisionNumber,
  savedByUserId,
  saveReason,
}) => ({
  evaluationId,
  revisionNumber,
  workflowMode,
  lifecycleState,
  stateSchemaVersion,
  frameworkVersion,
  stateJson: cloneValue(stateJson),
  savedByUserId,
  saveReason: normalizeSaveReason(saveReason),
});
