import { CRITERIA_BY_CODE } from '../config/questionnaire-schema.js';

export const TEST_SET_SCENARIO_OPTIONS = Object.freeze([
  { value: 'known_item', label: 'Known item' },
  { value: 'exploratory', label: 'Exploratory' },
  { value: 'synthesis', label: 'Synthesis' },
  { value: 'policy_review', label: 'Policy review' },
  { value: 'provenance_check', label: 'Provenance check' },
  { value: 'workflow_integration', label: 'Workflow integration' },
  { value: 'privacy_review', label: 'Privacy review' },
]);

export const TEST_SET_EVIDENCE_OPTIONS = Object.freeze([
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'url', label: 'URL / title' },
  { value: 'document', label: 'Document' },
  { value: 'export', label: 'Export' },
  { value: 'note', label: 'Note' },
]);

export const TEST_SET_VISIBILITY_OPTIONS = Object.freeze([
  { value: 'team', label: 'Team' },
  { value: 'private', label: 'Private' },
]);

export const REVIEW_PLAN_ROLE_OPTIONS = Object.freeze([
  { value: 'baseline', label: 'Baseline' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'ad_hoc', label: 'Ad hoc' },
  { value: 'regression', label: 'Regression' },
]);

const cloneValue = (value) => JSON.parse(JSON.stringify(value));

const formatRoleLabel = (value) =>
  String(value ?? '')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (part) => part.toUpperCase());

const createCriterionOptions = () =>
  Object.values(CRITERIA_BY_CODE)
    .map((criterion) => ({
      value: criterion.code,
      label: `${criterion.code} · ${criterion.name}`,
      sectionId: criterion.sectionId,
    }))
    .sort((left, right) => left.value.localeCompare(right.value));

const createEmptyCase = (ordinal) => ({
  ordinal,
  title: '',
  scenarioType: 'exploratory',
  instructionText: '',
  criterionCode: '',
  evidenceType: 'screenshot',
  expectedObservationType: '',
  notes: '',
});

export const createEmptyToolingDraftState = (overrides = {}) => ({
  title: '',
  description: '',
  purpose: '',
  visibility: 'team',
  changeSummary: '',
  cases: [],
  ...cloneValue(overrides),
});

export const createToolingDraftStateFromTestSet = (testSet = null) => {
  const sourceRevision = testSet?.currentDraftRevision ?? testSet?.latestPublishedRevision ?? null;

  return createEmptyToolingDraftState({
    title: sourceRevision?.titleSnapshot ?? testSet?.title ?? '',
    description: sourceRevision?.descriptionSnapshot ?? testSet?.description ?? '',
    purpose: sourceRevision?.purposeSnapshot ?? testSet?.purpose ?? '',
    visibility: sourceRevision?.visibilitySnapshot ?? testSet?.visibility ?? 'team',
    changeSummary: sourceRevision?.changeSummary ?? '',
    cases: Array.isArray(sourceRevision?.cases) ? cloneValue(sourceRevision.cases) : [],
  });
};

export const appendEmptyCaseToDraft = (draftState) => {
  const nextDraft = createEmptyToolingDraftState(draftState);
  const nextOrdinal = nextDraft.cases.length + 1;
  nextDraft.cases = [...nextDraft.cases, createEmptyCase(nextOrdinal)];
  return nextDraft;
};

export const removeCaseFromDraft = (draftState, index) => {
  const nextDraft = createEmptyToolingDraftState(draftState);
  nextDraft.cases = nextDraft.cases
    .filter((_, caseIndex) => caseIndex !== index)
    .map((entry, caseIndex) => ({
      ...entry,
      ordinal: caseIndex + 1,
    }));
  return nextDraft;
};

const buildSummary = (testSets) => {
  const published = testSets.filter((entry) => entry.status === 'published').length;
  const archived = testSets.filter((entry) => entry.status === 'archived').length;
  const draft = testSets.filter((entry) => entry.currentDraftRevision).length;
  const linked = testSets.reduce((sum, entry) => sum + Number(entry.linkCount ?? 0), 0);

  return [
    { label: 'Visible sets', value: String(testSets.length) },
    { label: 'Drafts', value: String(draft) },
    { label: 'Published', value: String(published) },
    { label: 'Linked reviews', value: String(linked) },
    { label: 'Archived', value: String(archived) },
  ];
};

const buildListItems = (testSets, selectedTestSetId) =>
  testSets.map((testSet) => ({
    id: testSet.id,
    href: `/tooling/test-sets/${encodeURIComponent(String(testSet.id))}`,
    title: testSet.title,
    description: testSet.description,
    status: testSet.status,
    visibility: testSet.visibility,
    ownerDisplayName: testSet.ownerDisplayName,
    currentDraftRevision: testSet.currentDraftRevision,
    latestPublishedRevision: testSet.latestPublishedRevision,
    linkCount: Number(testSet.linkCount ?? 0),
    active: Number(selectedTestSetId) === Number(testSet.id),
  }));

const buildReviewOptions = (reviews) =>
  reviews.map((review) => ({
    value: String(review.id),
    label: `${review.publicId} · ${review.titleSnapshot || 'Untitled review'} · ${formatRoleLabel(
      review.lifecycleState,
    )}`,
  }));

const normalizePublishedRevisions = (publishedRevisions = []) =>
  publishedRevisions.map((revision) => ({
    id: revision.id,
    versionNumber: revision.versionNumber,
    titleSnapshot: revision.titleSnapshot,
    caseCount: revision.caseCount,
    publishedAt: revision.publishedAt,
    changeSummary: revision.changeSummary,
  }));

export const createToolingViewModel = ({
  route,
  testSets = [],
  selectedTestSet = null,
  draftState = null,
  reviews = [],
  feedback = null,
} = {}) => ({
  routeName: route?.name ?? 'tooling',
  title: 'Tooling workspace',
  description:
    'Reusable test sets live outside the questionnaire flow. Drafts stay editable, published revisions stay pinned, and review links stop before test-run execution.',
  summary: buildSummary(testSets),
  listItems: buildListItems(testSets, route?.testSetId ?? null),
  selectedTestSetId: route?.testSetId ? Number(route.testSetId) : null,
  selectedTestSet,
  editorDraft: draftState ?? createToolingDraftStateFromTestSet(selectedTestSet),
  criterionOptions: createCriterionOptions(),
  scenarioOptions: TEST_SET_SCENARIO_OPTIONS,
  evidenceOptions: TEST_SET_EVIDENCE_OPTIONS,
  visibilityOptions: TEST_SET_VISIBILITY_OPTIONS,
  reviewPlanRoleOptions: REVIEW_PLAN_ROLE_OPTIONS,
  reviewOptions: buildReviewOptions(reviews),
  feedback,
  publishedRevisions: normalizePublishedRevisions(selectedTestSet?.publishedRevisions ?? []),
});
