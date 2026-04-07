import { describe, expect, it } from 'vitest';

import {
  cloneEvaluationState,
  createAppStore,
  createPersistableEvaluationSnapshot,
} from '../../../static/js/state/store.js';

const createEvaluation = () => ({
  workflow: { mode: 'nomination' },
  fields: {
    's0.submissionType': 'nomination',
    's0.toolName': 'Saved review tool',
    's0.nominationReason':
      'This tool should be reviewed because it is increasingly used in academic search contexts.',
  },
  sections: {},
  criteria: {},
  evidence: { evaluation: [], criteria: {} },
  overrides: { principleJudgments: {} },
});

describe('store persistence seams', () => {
  it('creates a canonical snapshot without ui-only state and round-trips through replaceEvaluation', () => {
    const store = createAppStore({ initialEvaluation: createEvaluation() });

    store.actions.setActivePage('TR');
    store.actions.setSidebarActiveTab('reference');

    const snapshot = createPersistableEvaluationSnapshot(store.getState());

    expect(snapshot).toEqual({
      workflow: { mode: 'nomination' },
      fields: {
        's0.submissionType': 'nomination',
        's0.toolName': 'Saved review tool',
        's0.nominationReason':
          'This tool should be reviewed because it is increasingly used in academic search contexts.',
      },
      sections: {},
      criteria: {},
      evidence: { evaluation: [], criteria: {} },
      overrides: { principleJudgments: {} },
    });

    store.actions.replaceEvaluation(snapshot);

    expect(store.getState().evaluation).toEqual(snapshot);
    expect(store.getState().ui.activePageId).toBe('TR');
    expect(store.getState().ui.sidebarPanel.activeTab).toBe('reference');
  });

  it('preserves conditionally hidden values across workflow changes and persisted snapshots', () => {
    const store = createAppStore({ initialEvaluation: createEvaluation() });

    store.actions.setFieldValue('s0.submissionType', 'primary_evaluation');

    const hiddenFieldSnapshot = cloneEvaluationState(store.getState().evaluation);

    expect(hiddenFieldSnapshot.fields['s0.nominationReason']).toBe(
      'This tool should be reviewed because it is increasingly used in academic search contexts.',
    );

    store.actions.replaceEvaluation(hiddenFieldSnapshot);

    expect(store.getState().evaluation.fields['s0.nominationReason']).toBe(
      'This tool should be reviewed because it is increasingly used in academic search contexts.',
    );
  });
});
