import {
  COMPLETION_GROUPS,
  SECTION_WORKFLOW_STATES,
  getContentTopicDefinition,
  getSectionDefinition,
} from '../config/sections.js';
import {
  CRITERIA_BY_CODE,
  QUESTIONNAIRE_FIELDS_BY_ID,
  SECTION_FIELD_IDS,
} from '../config/questionnaire-schema.js';
import { PROGRESS_STATES } from '../state/derive.js';
import { selectQuickJumpPageIds } from '../state/store.js';
import { toArray, getDocumentRef, clearChildren } from '../utils/shared.js';
import { REFERENCE_DRAWER_BY_TOPIC_ID } from './reference-drawers.js';

export const CONTEXT_ROUTE_KINDS = Object.freeze({
  PAGE: 'page',
  CRITERION: 'criterion',
  SUMMARY: 'summary',
});

const PAGE_FALLBACK_COPY = Object.freeze({
  S0: Object.freeze({
    summary:
      'Set the workflow mode, canonical tool identity, and responder role first. Later pages and editability rules depend on this control layer.',
    bullets: Object.freeze([
      'Confirm the submission type before interpreting later sections.',
      'Use the canonical tool name and URL fields as the stable evaluation identity.',
      'Nomination-only rationale remains local to this opening page.',
    ]),
  }),
  S1: Object.freeze({
    summary:
      'Capture what the tool is, who provides it, how it is deployed, and whether it belongs in the evaluation scope before deeper scoring begins.',
    bullets: Object.freeze([
      'Use the scope check and rationale fields to record in/out-of-scope decisions explicitly.',
      'Account, sign-in, and access model data often drive later security and governance interpretation.',
      'Open Info > Scope and definitions for the broader framework boundary when needed.',
    ]),
  }),
  S2: Object.freeze({
    summary:
      'Document the test setup, scenarios, and evidence boundary here. This page establishes whether later claims are auditable.',
    bullets: Object.freeze([
      'Record the exact repeated-query and benchmark setup when used.',
      'Keep the evidence folder link stable for later criterion-level associations.',
      'Use REF-E for minimum evidence requirements and REF-S for score interpretation.',
    ]),
  }),
  S8: Object.freeze({
    summary:
      'Critical fails and confidence are evaluation-wide controls. Use this page to record blockers that can override otherwise positive principle scores.',
    bullets: Object.freeze([
      'Critical-fail flags are distinct from low scores and must be traceable.',
      'Confidence reflects evidence quality and verification depth, not optimism.',
      'Use REF-S when translating flags and confidence into later recommendation logic.',
    ]),
  }),
  S9: Object.freeze({
    summary:
      'Convert the principle-level evidence into a final institutional recommendation, explicit caveats, and a public-facing rationale.',
    bullets: Object.freeze([
      'Recommendation status must stay aligned with the per-principle judgment model.',
      'Document suitable and unsuitable use cases explicitly; do not rely on implication.',
      'Public summary text should remain consistent with the evidence bundle and governance outcome.',
    ]),
  }),
  S10A: Object.freeze({
    summary:
      'This handoff page packages the primary evaluation for second review. It should expose uncertainties rather than smoothing them away.',
    bullets: Object.freeze([
      'Use this page to tell the next reviewer where to look hardest.',
      'Keep uncertainty notes specific enough to support targeted re-checking.',
      'Open Info > Governance and review workflow for the full review sequence.',
    ]),
  }),
  S10B: Object.freeze({
    summary:
      'Record agreement, disagreement, and any criteria that need to be revisited during the second review step.',
    bullets: Object.freeze([
      'Conflict documentation matters as much as the second reviewer recommendation itself.',
      'Use criteria-to-revisit as a constrained, explicit list rather than a vague note.',
      'Open Info > Governance and review workflow for disagreement handling and escalation context.',
    ]),
  }),
  S10C: Object.freeze({
    summary:
      'Capture the final team decision, publication status, and review cadence in a way that can survive handoff and later re-evaluation.',
    bullets: Object.freeze([
      'Final status, rationale, and publication handling belong together.',
      'Review frequency should reflect real operational follow-up, not boilerplate.',
      'Open Info > Governance and review workflow for the institutional lifecycle view.',
    ]),
  }),
});

const QUICK_JUMP_COLOR_BY_KEY = Object.freeze({
  tr: 'var(--tr)',
  re: 'var(--re)',
  uc: 'var(--uc)',
  se: 'var(--se-dark)',
  tc: 'var(--tc-dark)',
});

const SUMMARY_ANCHOR_LABELS = Object.freeze({
  criteria: 'Criteria overview',
  primary: 'Primary fields',
  detail: 'Detail fields',
  supplementary: 'Supplementary fields',
  summary: 'Section summary',
});

const WORKFLOW_STATE_LABELS = Object.freeze({
  [SECTION_WORKFLOW_STATES.EDITABLE]: 'Editable',
  [SECTION_WORKFLOW_STATES.READ_ONLY]: 'Read-only',
  [SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED]: 'System-skipped',
});

const PROGRESS_STATE_LABELS = Object.freeze({
  [PROGRESS_STATES.NOT_STARTED]: 'Not started',
  [PROGRESS_STATES.IN_PROGRESS]: 'In progress',
  [PROGRESS_STATES.COMPLETE]: 'Complete',
  [PROGRESS_STATES.INVALID_ATTENTION]: 'Needs attention',
  [PROGRESS_STATES.SKIPPED]: 'Skipped',
  [PROGRESS_STATES.BLOCKED_ESCALATED]: 'Blocked / escalated',
});

const joinTokens = (items) => items.filter(Boolean).join(' · ');

const setAccentKey = (element, accentKey) => {
  if (!(element instanceof HTMLElement)) {
    return;
  }

  if (accentKey) {
    element.dataset.accentKey = accentKey;
    return;
  }

  delete element.dataset.accentKey;
};

const parseTopicIds = (rawValue) =>
  typeof rawValue === 'string'
    ? rawValue.trim().split(/\s+/).filter(Boolean)
    : [];

const toPrincipleKey = (pageId) => {
  const normalized = typeof pageId === 'string' ? pageId.toLowerCase() : '';
  return QUICK_JUMP_COLOR_BY_KEY[normalized] ? normalized : null;
};

const getCompletionGroupLabel = (completionGroupId) => {
  return COMPLETION_GROUPS.find((group) => group.id === completionGroupId)?.label ?? completionGroupId;
};

const getSectionHeadingText = (section) => {
  const heading = section?.querySelector('h2');
  return heading?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
};

const getCriterionAnchorLabel = (criterionCode) => {
  const criterion = CRITERIA_BY_CODE[criterionCode];
  return criterion
    ? `${criterion.code} — ${criterion.title}`
    : criterionCode;
};

const formatStateLabel = (value, fallback = 'Unknown') => {
  if (typeof value !== 'string' || value.trim() === '') {
    return fallback;
  }

  return value
    .split('_')
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
};

const formatProgressStateLabel = (value, fallback = 'Not started') =>
  PROGRESS_STATE_LABELS[value] ?? fallback;

const formatSectionProgressCompact = (sectionProgress) => {
  if (!sectionProgress) {
    return 'Awaiting input';
  }

  if (sectionProgress.canonicalState === PROGRESS_STATES.SKIPPED) {
    return sectionProgress.skippedByWorkflow ? 'Workflow skip' : 'Skip satisfied';
  }

  if (sectionProgress.applicableRequiredFieldCount > 0) {
    return `${sectionProgress.satisfiedRequiredFieldCount}/${sectionProgress.applicableRequiredFieldCount} req`;
  }

  if (sectionProgress.criterionCount > 0) {
    return `${sectionProgress.resolvedCriterionCount}/${sectionProgress.criterionCount} crit`;
  }

  return sectionProgress.hasAnyActivity ? 'No active req' : 'Awaiting input';
};

const formatSectionProgressDetail = (sectionProgress) => {
  if (!sectionProgress) {
    return 'Progress unavailable.';
  }

  if (sectionProgress.canonicalState === PROGRESS_STATES.SKIPPED) {
    return sectionProgress.skippedByWorkflow
      ? 'Skipped by workflow mode.'
      : 'Skip reason and rationale satisfied.';
  }

  if (sectionProgress.applicableRequiredFieldCount > 0) {
    return `${sectionProgress.satisfiedRequiredFieldCount} of ${sectionProgress.applicableRequiredFieldCount} applicable required fields satisfied.`;
  }

  if (sectionProgress.criterionCount > 0) {
    return `${sectionProgress.resolvedCriterionCount} of ${sectionProgress.criterionCount} criteria resolved.`;
  }

  return sectionProgress.hasAnyActivity
    ? 'No currently applicable required fields remain on this page.'
    : 'No answers recorded yet.';
};

const formatGroupProgressSummary = (groupProgress) => {
  if (!groupProgress) {
    return 'Progress unavailable';
  }

  const base = groupProgress.applicableRequiredFieldCount > 0
    ? `${groupProgress.satisfiedRequiredFieldCount}/${groupProgress.applicableRequiredFieldCount} req`
    : groupProgress.activeSectionCount > 0
      ? `${groupProgress.resolvedActiveSectionCount}/${groupProgress.activeSectionCount} pages`
      : 'No active pages';

  return joinTokens([
    base,
    formatProgressStateLabel(groupProgress.canonicalState),
    groupProgress.unresolvedEscalationCount > 0
      ? `${groupProgress.unresolvedEscalationCount} escalated`
      : groupProgress.blockedEscalatedSectionCount > 0
        ? `${groupProgress.blockedEscalatedSectionCount} blocked`
      : null,
    groupProgress.invalidAttentionSectionCount > 0
      ? `${groupProgress.invalidAttentionSectionCount} attention`
      : null,
    groupProgress.skippedSectionCount > 0
      ? `${groupProgress.skippedSectionCount} skipped`
      : null,
  ]);
};

const formatOverallProgressRequirementSummary = (overallProgress) => {
  if (!overallProgress) {
    return 'Progress unavailable';
  }

  if (overallProgress.applicableRequiredFieldCount > 0) {
    return `${overallProgress.satisfiedRequiredFieldCount}/${overallProgress.applicableRequiredFieldCount} applicable required fields satisfied`;
  }

  if (overallProgress.activeSectionCount === 0) {
    return 'No active questionnaire pages in this workflow';
  }

  return overallProgress.resolvedActiveSectionCount === overallProgress.activeSectionCount
    ? 'All active pages resolved'
    : 'No applicable required fields active yet';
};

const formatOverallProgressMetaSummary = (overallProgress) => {
  if (!overallProgress) {
    return 'Progress unavailable';
  }

  return joinTokens([
    overallProgress.activeSectionCount > 0
      ? `${overallProgress.resolvedActiveSectionCount}/${overallProgress.activeSectionCount} active pages resolved`
      : '0 active pages',
    overallProgress.invalidAttentionSectionCount > 0
      ? `${overallProgress.invalidAttentionSectionCount} attention`
      : null,
    overallProgress.unresolvedEscalationCount > 0
      ? `${overallProgress.unresolvedEscalationCount} escalated`
      : overallProgress.blockedEscalatedSectionCount > 0
        ? `${overallProgress.blockedEscalatedSectionCount} blocked`
      : null,
    overallProgress.skippedSectionCount > 0
      ? `${overallProgress.skippedSectionCount} skipped`
      : null,
  ]);
};

const buildSectionNavigationLabel = ({ pageDefinition, pageState, sectionProgress }) => {
  return [
    `Go to ${pageDefinition?.title ?? 'page'}.`,
    `${WORKFLOW_STATE_LABELS[pageState?.workflowState] ?? 'Unavailable'} workflow state.`,
    `${formatProgressStateLabel(sectionProgress?.canonicalState)}.`,
    formatSectionProgressDetail(sectionProgress),
    sectionProgress?.escalationReasons?.length
      ? `${sectionProgress.escalationReasons.length} unresolved escalation ${sectionProgress.escalationReasons.length === 1 ? 'rule' : 'rules'}.`
      : null,
  ].filter(Boolean).join(' ');
};

const buildCompletionStripItemLabel = ({ pageDefinition, pageState, sectionProgress }) => {
  return [
    `${pageDefinition?.pageCode ?? '—'} ${pageDefinition?.title ?? 'Page'}.`,
    `${formatProgressStateLabel(sectionProgress?.canonicalState)}.`,
    formatSectionProgressDetail(sectionProgress),
    `${WORKFLOW_STATE_LABELS[pageState?.workflowState] ?? 'Unavailable'} workflow state.`,
  ].filter(Boolean).join(' ');
};

const getSummaryAnchorLabel = (pageDefinition, summaryKind) => {
  const baseLabel = SUMMARY_ANCHOR_LABELS[summaryKind] ?? `${formatStateLabel(summaryKind, 'Summary')} block`;
  return pageDefinition ? `${pageDefinition.title} — ${baseLabel}` : baseLabel;
};

const getSummaryAnchorShortLabel = (summaryKind) =>
  summaryKind === 'criteria'
    ? 'CRITERIA'
    : formatStateLabel(summaryKind, 'SUMMARY').toUpperCase();

const createInfoRow = (documentRef, label, value, extraClassName = '') => {
  const wrapper = documentRef.createElement('div');
  const dt = documentRef.createElement('dt');
  const dd = documentRef.createElement('dd');

  wrapper.className = `context-route-row${extraClassName ? ` ${extraClassName}` : ''}`;
  dt.textContent = label;
  dd.textContent = value;

  wrapper.append(dt, dd);
  return wrapper;
};

const createSectionTag = (documentRef, pageDefinition) => {
  const tag = documentRef.createElement('span');
  tag.className = 'context-route-code';
  tag.dataset.accentKey = pageDefinition?.accentKey ?? 'control';
  tag.textContent = pageDefinition?.pageCode ?? '—';
  return tag;
};

const extractContextSources = (mount) => {
  const contextSectionsByTopicId = new Map();
  const fallback = mount?.querySelector('#contextSidebarFallback') ?? null;

  toArray(mount?.querySelectorAll('[data-topic-area="context"][data-topic-ids]')).forEach((section) => {
    parseTopicIds(section.dataset.topicIds)
      .filter((topicId) => topicId.startsWith('context.'))
      .forEach((topicId) => {
        const list = contextSectionsByTopicId.get(topicId) ?? [];
        list.push(section);
        contextSectionsByTopicId.set(topicId, list);
      });
  });

  return {
    fallback,
    contextSectionsByTopicId,
  };
};

const buildContextShell = (mount, documentRef) => {
  clearChildren(mount);

  const shell = documentRef.createElement('div');
  const routeCard = documentRef.createElement('section');
  const anchorCard = documentRef.createElement('section');
  const generatedSlot = documentRef.createElement('div');
  const topicStack = documentRef.createElement('div');

  shell.className = 'context-sidebar-shell';
  routeCard.className = 'context-route-card';
  anchorCard.className = 'context-anchor-card';
  generatedSlot.className = 'context-generated-slot';
  topicStack.className = 'context-topic-stack';

  shell.append(routeCard, anchorCard, generatedSlot, topicStack);
  mount.appendChild(shell);

  return {
    shell,
    routeCard,
    anchorCard,
    generatedSlot,
    topicStack,
  };
};

const ensureHeaderProgressSummary = (documentRef, quickJumpMount) => {
  const headerInner = quickJumpMount?.closest('.header-inner');

  if (!(headerInner instanceof HTMLElement)) {
    return null;
  }

  let summary = headerInner.querySelector('.header-progress-summary');

  if (!(summary instanceof HTMLElement)) {
    summary = documentRef.createElement('div');
    summary.className = 'header-progress-summary';
    summary.id = 'headerProgressSummary';
    summary.setAttribute('role', 'status');
    summary.setAttribute('aria-live', 'polite');
    summary.setAttribute('aria-atomic', 'true');

    const title = documentRef.createElement('p');
    const body = documentRef.createElement('p');
    const meta = documentRef.createElement('p');

    title.className = 'header-progress-title';
    title.textContent = 'Questionnaire progress';

    body.className = 'header-progress-body';
    meta.className = 'header-progress-meta';

    summary.append(title, body, meta);

    const completionStrip = headerInner.querySelector('.completion-strip');

    if (completionStrip?.nextSibling) {
      headerInner.insertBefore(summary, completionStrip.nextSibling);
    } else if (completionStrip) {
      completionStrip.insertAdjacentElement('afterend', summary);
    } else {
      headerInner.insertBefore(summary, quickJumpMount);
    }
  }

  if (!summary.id) {
    summary.id = 'headerProgressSummary';
  }

  return {
    root: summary,
    title: summary.querySelector('.header-progress-title'),
    body: summary.querySelector('.header-progress-body'),
    meta: summary.querySelector('.header-progress-meta'),
  };
};

const createLinkButton = ({
  documentRef,
  className,
  text,
  dataName,
  dataValue,
  ariaLabel,
}) => {
  const button = documentRef.createElement('button');
  button.type = 'button';
  button.className = className;
  button.dataset[dataName] = dataValue;
  button.textContent = text;

  if (ariaLabel) {
    button.setAttribute('aria-label', ariaLabel);
  }

  return button;
};

const createSourceList = (documentRef, sourceRefs) => {
  const block = documentRef.createElement('div');
  const label = documentRef.createElement('p');
  const list = documentRef.createElement('ul');

  block.className = 'context-source-block';
  label.className = 'context-block-label';
  label.textContent = 'Source refs';
  list.className = 'context-source-list';

  sourceRefs.forEach((sourceRef) => {
    const item = documentRef.createElement('li');
    item.className = 'context-source-item';
    item.textContent = sourceRef;
    list.appendChild(item);
  });

  block.append(label, list);
  return block;
};

const buildCriterionCompanion = (documentRef, route) => {
  const criterion = route.activeAnchor?.criterionCode
    ? CRITERIA_BY_CODE[route.activeAnchor.criterionCode]
    : null;

  if (!criterion) {
    return null;
  }

  const section = documentRef.createElement('section');
  const kicker = documentRef.createElement('div');
  const heading = documentRef.createElement('h2');
  const statement = documentRef.createElement('p');
  const listLabel = documentRef.createElement('p');
  const list = documentRef.createElement('ul');

  section.className = 'doc-section context-generated-section';
  section.dataset.section = route.pageDefinition?.accentKey ?? 'control';

  kicker.className = 'section-kicker';
  kicker.textContent = 'Criterion focus';

  heading.textContent = `${criterion.code} — ${criterion.title}`;
  statement.textContent = criterion.statement;

  listLabel.className = 'context-block-label';
  listLabel.textContent = 'Field obligations';

  [
    criterion.fieldIds.score,
    criterion.fieldIds.evidenceSummary,
    criterion.fieldIds.evidenceLinks,
    criterion.fieldIds.uncertaintyOrBlockers,
  ]
    .map((fieldId) => QUESTIONNAIRE_FIELDS_BY_ID[fieldId])
    .filter(Boolean)
    .forEach((field) => {
      const item = documentRef.createElement('li');
      item.textContent = field.requiredPolicy === 'conditional'
        ? `${field.label} — conditionally required when the criterion is blocked or unclear.`
        : field.label;
      list.appendChild(item);
    });

  section.append(kicker, heading, statement, listLabel, list);
  return section;
};

const buildSummaryCompanion = (documentRef, route) => {
  const section = documentRef.createElement('section');
  const kicker = documentRef.createElement('div');
  const heading = documentRef.createElement('h2');
  const summary = documentRef.createElement('p');
  const listLabel = documentRef.createElement('p');
  const list = documentRef.createElement('ul');
  const sectionFieldIds = SECTION_FIELD_IDS[route.pageId] ?? [];

  section.className = 'doc-section context-generated-section';
  section.dataset.section = route.pageDefinition?.accentKey ?? 'control';

  kicker.className = 'section-kicker';
  kicker.textContent = 'Summary focus';

  heading.textContent = `${route.pageDefinition?.title ?? route.pageId} summary guidance`;
  summary.textContent = 'Use the section-level summary fields to translate criterion evidence into a page-level judgment and handoff-ready rationale.';

  listLabel.className = 'context-block-label';
  listLabel.textContent = 'Section-level fields';

  sectionFieldIds
    .map((fieldId) => QUESTIONNAIRE_FIELDS_BY_ID[fieldId])
    .filter((field) => field && !field.criterionCode)
    .forEach((field) => {
      const item = documentRef.createElement('li');
      item.textContent = field.requiredPolicy === 'conditional'
        ? `${field.label} — conditionally required.`
        : field.label;
      list.appendChild(item);
    });

  section.append(kicker, heading, summary, listLabel, list);
  return section;
};

const buildPageFallback = (documentRef, route) => {
  const fallbackCopy = PAGE_FALLBACK_COPY[route.pageId];
  const section = documentRef.createElement('section');
  const kicker = documentRef.createElement('div');
  const heading = documentRef.createElement('h2');
  const summary = documentRef.createElement('p');

  section.className = 'doc-section context-generated-section';
  section.dataset.section = route.pageDefinition?.accentKey ?? 'control';

  kicker.className = 'section-kicker';
  kicker.textContent = 'Generated guidance';

  heading.textContent = route.topicDefinition?.title ?? route.pageDefinition?.title ?? 'Context guidance';
  summary.textContent = fallbackCopy?.summary
    ?? 'This page currently uses registry-driven guidance rather than a dedicated literal context block in the shell.';

  section.append(kicker, heading, summary);

  if (fallbackCopy?.bullets?.length) {
    const list = documentRef.createElement('ul');
    fallbackCopy.bullets.forEach((bullet) => {
      const item = documentRef.createElement('li');
      item.textContent = bullet;
      list.appendChild(item);
    });
    section.appendChild(list);
  }

  return section;
};

const createAnchorDescriptor = ({
  pageId,
  pageDefinition,
  element,
  kind,
  label,
  shortLabel,
  criterionCode = null,
  summaryKind = null,
}) => {
  const slug = pageDefinition?.slug ?? pageId.toLowerCase();
  const idSuffix = kind === CONTEXT_ROUTE_KINDS.CRITERION
    ? criterionCode?.toLowerCase()
    : kind;
  const elementId = element.id || `${slug}-${idSuffix}`;

  element.id = elementId;
  element.tabIndex = -1;
  element.dataset.contextAnchorId = elementId;
  element.dataset.contextAnchorKind = kind;
  element.dataset.pageId = pageId;

  if (criterionCode) {
    element.dataset.contextCriterionCode = criterionCode;
  }

  return Object.freeze({
    id: elementId,
    pageId,
    kind,
    label,
    shortLabel,
    criterionCode,
    summaryKind,
    element,
  });
};

const getRenderedPageSections = (root) =>
  toArray(root?.children).filter(
    (element) => element instanceof HTMLElement && element.matches('[data-page-id]'),
  );

export const createSidebarRenderer = ({
  root = document,
  store,
  navigateToPage,
  navigateToSubAnchor,
  openReferenceDrawer,
  openAboutTopic,
}) => {
  const documentRef = getDocumentRef(root);
  const windowRef = documentRef.defaultView ?? window;
  const quickJumpMount = documentRef.getElementById('quickJumpMount');
  const pageSidebarMount = documentRef.getElementById('pageSidebarMount');
  const contextSidebarMount = documentRef.getElementById('contextSidebarMount');
  const questionnaireRenderRoot = documentRef.getElementById('questionnaireRenderRoot');
  const completionStrip = documentRef.querySelector('.completion-strip');

  if (!quickJumpMount || !pageSidebarMount || !contextSidebarMount) {
    return {
      sync() {},
      refreshPageAnchors() {},
      getSubAnchorTargetById() {
        return null;
      },
      setActiveSubAnchorById() {},
      clearActiveSubAnchor() {},
      getCurrentContextHeading() {
        return '';
      },
      isPinned() {
        return false;
      },
      destroy() {},
    };
  }

  const cleanup = [];
  const contextSources = extractContextSources(contextSidebarMount);
  const actionNodes = toArray(quickJumpMount.querySelectorAll('[data-surface-toggle]'));
  const navIndicator = quickJumpMount.querySelector('#navIndicator') ?? documentRef.createElement('div');
  const contextShell = buildContextShell(contextSidebarMount, documentRef);
  const headerProgressSummary = ensureHeaderProgressSummary(documentRef, quickJumpMount);

  let pageAnchorsByPageId = new Map();
  let anchorById = new Map();
  let pinnedRoute = null;
  let currentRoute = null;
  let indicatorFrame = 0;

  navIndicator.id = 'navIndicator';
  navIndicator.className = 'nav-indicator';

  const refreshPageAnchors = () => {
    const nextAnchorsByPageId = new Map();
    const nextAnchorById = new Map();

    getRenderedPageSections(questionnaireRenderRoot).forEach((pageSection) => {
      const pageId = pageSection.dataset.pageId;
      const pageDefinition = getSectionDefinition(pageId);
      const anchors = [];

      const criteriaOverviewElement = pageSection.querySelector('.criteria-stack[data-summary-anchor]');

      if (criteriaOverviewElement) {
        const descriptor = createAnchorDescriptor({
          pageId,
          pageDefinition,
          element: criteriaOverviewElement,
          kind: CONTEXT_ROUTE_KINDS.SUMMARY,
          label: getSummaryAnchorLabel(pageDefinition, 'criteria'),
          shortLabel: getSummaryAnchorShortLabel('criteria'),
          summaryKind: 'criteria',
        });

        anchors.push(descriptor);
        nextAnchorById.set(descriptor.id, descriptor);
      }

      toArray(pageSection.querySelectorAll('.criterion-card[data-criterion]')).forEach((criterionElement) => {
        const criterionCode = criterionElement.dataset.criterion;
        const descriptor = createAnchorDescriptor({
          pageId,
          pageDefinition,
          element: criterionElement,
          kind: CONTEXT_ROUTE_KINDS.CRITERION,
          label: getCriterionAnchorLabel(criterionCode),
          shortLabel: criterionCode,
          criterionCode,
        });

        anchors.push(descriptor);
        nextAnchorById.set(descriptor.id, descriptor);
      });

      toArray(pageSection.querySelectorAll('[data-summary-kind]')).forEach((summaryElement) => {
        const summaryKind = summaryElement.dataset.summaryKind ?? 'summary';
        const descriptor = createAnchorDescriptor({
          pageId,
          pageDefinition,
          element: summaryElement,
          kind: CONTEXT_ROUTE_KINDS.SUMMARY,
          label: getSummaryAnchorLabel(pageDefinition, summaryKind),
          shortLabel: getSummaryAnchorShortLabel(summaryKind),
          summaryKind,
        });

        anchors.push(descriptor);
        nextAnchorById.set(descriptor.id, descriptor);
      });

      nextAnchorsByPageId.set(pageId, anchors);
    });

    pageAnchorsByPageId = nextAnchorsByPageId;
    anchorById = nextAnchorById;

    if (pinnedRoute?.subAnchorId && !anchorById.has(pinnedRoute.subAnchorId)) {
      pinnedRoute = {
        ...pinnedRoute,
        subAnchorId: null,
      };
    }
  };

  const buildRoute = (state, pageId, subAnchorId) => {
    const pageDefinition = getSectionDefinition(pageId);
    const topicId = pageDefinition?.contextTopicId ?? null;
    const topicDefinition = getContentTopicDefinition(topicId);
    const activeAnchor = subAnchorId ? anchorById.get(subAnchorId) ?? null : null;
    const literalSections = topicId
      ? contextSources.contextSectionsByTopicId.get(topicId) ?? []
      : [];
    const pageState = state.derived.pageStates.bySectionId[pageId] ?? null;
    const sectionState = state.derived.sectionStates.bySectionId[pageId] ?? null;
    const sectionProgress = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;

    return Object.freeze({
      pageId,
      pageDefinition,
      pageState,
      sectionState,
      sectionProgress,
      topicId,
      topicDefinition,
      activeAnchor,
      literalSections,
      referenceTopicIds: pageDefinition?.referenceTopicIds ?? [],
      aboutTopicIds: pageDefinition?.aboutTopicIds ?? [],
      sourceRefs: topicDefinition?.sourceRefs ?? [],
      kind: activeAnchor?.kind ?? CONTEXT_ROUTE_KINDS.PAGE,
    });
  };

  const resolveDisplayedRoute = (state) => {
    const liveRoute = buildRoute(state, state.ui.activePageId, state.ui.activeSubAnchorId);

    if (!pinnedRoute?.pageId) {
      return {
        ...liveRoute,
        isPinned: false,
        livePageId: state.ui.activePageId,
      };
    }

    return {
      ...buildRoute(state, pinnedRoute.pageId, pinnedRoute.subAnchorId),
      isPinned: true,
      livePageId: state.ui.activePageId,
    };
  };

  const renderHeaderProgress = (state) => {
    const overallProgress = state.derived.completionProgress?.overall ?? null;

    if (!headerProgressSummary || !overallProgress) {
      return;
    }

    headerProgressSummary.root.dataset.progressState = overallProgress.canonicalState ?? '';
    headerProgressSummary.body.textContent = formatOverallProgressRequirementSummary(overallProgress);
    headerProgressSummary.meta.textContent = formatOverallProgressMetaSummary(overallProgress);
    headerProgressSummary.root.setAttribute(
      'aria-label',
      [
        `Questionnaire progress: ${formatProgressStateLabel(overallProgress.canonicalState)}.`,
        `${formatOverallProgressRequirementSummary(overallProgress)}.`,
        `${formatOverallProgressMetaSummary(overallProgress)}.`,
      ].join(' '),
    );
  };

  const renderCompletionStrip = (state) => {
    const overallProgress = state.derived.completionProgress?.overall ?? null;

    if (!(completionStrip instanceof HTMLElement) || !overallProgress) {
      return;
    }

    clearChildren(completionStrip);
    completionStrip.dataset.progressState = overallProgress.canonicalState ?? '';
    completionStrip.setAttribute('aria-labelledby', 'completionStripLabel');

    if (headerProgressSummary?.root?.id) {
      completionStrip.setAttribute('aria-describedby', headerProgressSummary.root.id);
    }

    state.ui.pageOrder.forEach((pageId) => {
      const pageDefinition = getSectionDefinition(pageId);
      const pageState = state.derived.pageStates.bySectionId[pageId] ?? null;
      const sectionProgress = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;
      const cell = documentRef.createElement('li');
      const code = documentRef.createElement('span');
      const description = documentRef.createElement('span');

      cell.className = 'strip-cell';
      cell.setAttribute('aria-hidden', 'true');
      cell.setAttribute('role', 'presentation');
      cell.dataset.pageId = pageId;
      cell.dataset.pageCode = pageDefinition?.pageCode ?? pageId;
      cell.dataset.accentKey = pageDefinition?.accentKey ?? 'control';
      cell.dataset.progressState = sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
      cell.dataset.workflowState = pageState?.workflowState ?? '';
      cell.classList.toggle(
        'filled',
        sectionProgress?.canonicalState === PROGRESS_STATES.COMPLETE,
      );
      cell.classList.toggle('is-active', state.ui.activePageId === pageId);
      code.className = 'strip-cell-code';
      code.textContent = pageDefinition?.pageCode ?? pageId;
      description.className = 'strip-cell-description visually-hidden';
      description.textContent = buildCompletionStripItemLabel({
        pageDefinition,
        pageState,
        sectionProgress,
      });
      cell.append(code, description);
      completionStrip.appendChild(cell);
    });
  };

  const renderQuickJump = (state) => {
    const activePageId = state.ui.activePageId;
    const availableQuickJumpPageIds = new Set(
      selectQuickJumpPageIds(state).filter(
        (pageId) => state.derived.pageStates.bySectionId[pageId]?.isAccessible,
      ),
    );

    clearChildren(quickJumpMount);

    selectQuickJumpPageIds(state).forEach((pageId) => {
      const pageDefinition = getSectionDefinition(pageId);
      const pageState = state.derived.pageStates.bySectionId[pageId] ?? null;
      const sectionProgress = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;
      const button = documentRef.createElement('button');
      const isActive = activePageId === pageId;

      button.type = 'button';
      button.className = 'nav-button';
      button.dataset.pageId = pageId;
      button.dataset.accentKey = pageDefinition?.accentKey ?? 'control';
      button.dataset.target = pageDefinition?.principleKey?.toLowerCase() ?? pageId.toLowerCase();
      button.dataset.workflowState = pageState?.workflowState ?? '';
      button.dataset.progressState = sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
      button.textContent = pageDefinition?.shortLabel ?? pageId;
      button.setAttribute('aria-label', buildSectionNavigationLabel({
        pageDefinition,
        pageState,
        sectionProgress,
      }));

      button.disabled = !availableQuickJumpPageIds.has(pageId);
      button.classList.toggle('active', isActive);

      if (isActive) {
        button.setAttribute('aria-current', 'page');
      }

      quickJumpMount.appendChild(button);
    });

    actionNodes.forEach((node) => {
      quickJumpMount.appendChild(node);
    });
    quickJumpMount.appendChild(navIndicator);

    windowRef.cancelAnimationFrame(indicatorFrame);
    indicatorFrame = windowRef.requestAnimationFrame(() => {
      const principleKey = toPrincipleKey(activePageId);
      const activeButton = quickJumpMount.querySelector(`.nav-button[data-page-id="${activePageId}"]`);

      if (!(activeButton instanceof HTMLButtonElement) || !principleKey) {
        navIndicator.style.width = '0px';
        return;
      }

      const navRect = quickJumpMount.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      navIndicator.style.left = `${buttonRect.left - navRect.left}px`;
      navIndicator.style.width = `${buttonRect.width}px`;
      navIndicator.style.background = QUICK_JUMP_COLOR_BY_KEY[principleKey];
    });

    renderCompletionStrip(state);
    renderHeaderProgress(state);
  };

  const renderPageIndex = (state) => {
    const list = documentRef.createElement('ol');
    const heading = documentRef.createElement('h2');
    let lastCompletionGroupId = null;

    pageSidebarMount.hidden = false;
    clearChildren(pageSidebarMount);

    heading.className = 'workspace-title';
    heading.textContent = 'Canonical page index';

    list.className = 'page-index-list';

    state.ui.pageOrder.forEach((pageId) => {
      const pageDefinition = getSectionDefinition(pageId);
      const pageState = state.derived.pageStates.bySectionId[pageId] ?? null;
      const sectionState = state.derived.sectionStates.bySectionId[pageId] ?? null;
      const sectionProgress = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;
      const isActive = state.ui.activePageId === pageId;

      if (pageDefinition?.completionGroupId !== lastCompletionGroupId) {
        const groupProgress = state.derived.completionProgress?.byCompletionGroupId?.[pageDefinition?.completionGroupId] ?? null;
        const groupItem = documentRef.createElement('li');
        const groupHeader = documentRef.createElement('div');
        const groupLabel = documentRef.createElement('p');
        const groupSummary = documentRef.createElement('p');

        groupItem.className = 'page-index-group';
        groupItem.dataset.progressState = groupProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
        groupHeader.className = 'page-index-group-header';
        groupLabel.className = 'page-index-group-label';
        groupLabel.textContent = getCompletionGroupLabel(pageDefinition?.completionGroupId);
        groupSummary.className = 'page-index-group-summary';
        groupSummary.textContent = formatGroupProgressSummary(groupProgress);

        groupHeader.append(groupLabel, groupSummary);
        groupItem.appendChild(groupHeader);
        list.appendChild(groupItem);
        lastCompletionGroupId = pageDefinition?.completionGroupId ?? null;
      }

      const item = documentRef.createElement('li');
      const button = documentRef.createElement('button');
      const code = documentRef.createElement('span');
      const content = documentRef.createElement('span');
      const label = documentRef.createElement('span');
      const meta = documentRef.createElement('span');
      const workflowState = documentRef.createElement('span');
      const statusState = documentRef.createElement('span');
      const progressState = documentRef.createElement('span');

      button.type = 'button';
      button.className = 'page-index-button';
      button.dataset.pageId = pageId;
      button.dataset.accentKey = pageDefinition?.accentKey ?? 'control';
      button.dataset.workflowState = pageState?.workflowState ?? '';
      button.dataset.sectionStatus = sectionState?.status ?? '';
      button.dataset.progressState = sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
      button.classList.toggle('is-active', isActive);
      button.disabled = pageState?.isAccessible === false;
      button.setAttribute('aria-label', buildSectionNavigationLabel({
        pageDefinition,
        pageState,
        sectionProgress,
      }));

      if (isActive) {
        button.setAttribute('aria-current', 'page');
      }

      code.className = 'page-index-code';
      code.textContent = pageDefinition?.pageCode ?? pageId;

      label.className = 'page-index-label';
      label.textContent = pageDefinition?.title ?? pageId;

      content.className = 'page-index-content';
      meta.className = 'page-index-meta';

      workflowState.className = 'page-index-state';
      workflowState.dataset.workflowState = pageState?.workflowState ?? '';
      workflowState.textContent = WORKFLOW_STATE_LABELS[pageState?.workflowState] ?? 'Unavailable';

      statusState.className = 'page-index-status';
      statusState.dataset.sectionStatus = sectionState?.status ?? '';
      statusState.dataset.progressState = sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
      statusState.textContent = formatProgressStateLabel(
        sectionProgress?.canonicalState,
        formatStateLabel(sectionState?.status, 'Not started'),
      );

      progressState.className = 'page-index-state page-index-progress';
      progressState.dataset.progressState = sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
      progressState.textContent = formatSectionProgressCompact(sectionProgress);

      meta.append(workflowState, statusState, progressState);
      content.append(label, meta);

      button.append(code, content);
      item.appendChild(button);
      list.appendChild(item);
    });

    pageSidebarMount.append(heading, list);
  };

  const renderAnchorCard = (route) => {
    const anchors = pageAnchorsByPageId.get(route.pageId) ?? [];

    clearChildren(contextShell.anchorCard);
    setAccentKey(contextShell.anchorCard, route.pageDefinition?.accentKey ?? 'control');

    if (!anchors.length) {
      contextShell.anchorCard.hidden = true;
      return;
    }

    contextShell.anchorCard.hidden = false;

    const header = documentRef.createElement('div');
    const label = documentRef.createElement('p');
    const overviewButton = documentRef.createElement('button');
    const list = documentRef.createElement('div');

    header.className = 'context-anchor-header';
    label.className = 'workspace-title';
    label.textContent = 'Page anchors';

    overviewButton.type = 'button';
    overviewButton.className = 'context-overview-button';
    overviewButton.dataset.contextPageOverview = route.pageId;
    overviewButton.textContent = 'Page overview';

    list.className = 'context-anchor-list';

    header.append(label, overviewButton);
    contextShell.anchorCard.append(header, list);

    anchors.forEach((anchor) => {
      const button = documentRef.createElement('button');
      const shortLabel = documentRef.createElement('span');
      const longLabel = documentRef.createElement('span');
      const isActive = route.activeAnchor?.id === anchor.id;

      button.type = 'button';
      button.className = 'context-anchor-button';
      button.dataset.contextAnchorId = anchor.id;
      button.dataset.accentKey = route.pageDefinition?.accentKey ?? 'control';
      button.classList.toggle('is-active', isActive);

      shortLabel.className = 'context-anchor-code';
      shortLabel.textContent = anchor.shortLabel;

      longLabel.className = 'context-anchor-label';
      longLabel.textContent = anchor.label;

      button.append(shortLabel, longLabel);
      list.appendChild(button);
    });
  };

  const renderRouteCard = (route) => {
    clearChildren(contextShell.routeCard);
    setAccentKey(contextShell.routeCard, route.pageDefinition?.accentKey ?? 'control');

    const header = documentRef.createElement('div');
    const titleBlock = documentRef.createElement('div');
    const kicker = documentRef.createElement('p');
    const title = documentRef.createElement('h2');
    const pinButton = documentRef.createElement('button');
    const infoGrid = documentRef.createElement('dl');

    header.className = 'context-route-header';
    titleBlock.className = 'context-route-title-block';
    kicker.className = 'workspace-title';
    kicker.textContent = 'Context route';

    title.className = 'context-route-title';
    title.append(
      createSectionTag(documentRef, route.pageDefinition),
      documentRef.createTextNode(` ${route.pageDefinition?.title ?? route.pageId}`),
    );

    pinButton.type = 'button';
    pinButton.className = 'context-pin-button';
    pinButton.dataset.contextPinToggle = 'true';
    pinButton.textContent = route.isPinned ? 'UNPIN' : 'PIN';
    pinButton.setAttribute('aria-pressed', String(route.isPinned));
    pinButton.setAttribute('aria-label', `${route.isPinned ? 'Unpin' : 'Pin'} current context route`);

    infoGrid.className = 'context-route-grid';
    infoGrid.append(
      createInfoRow(documentRef, 'Mode', route.isPinned ? 'Pinned route' : 'Live route'),
      createInfoRow(documentRef, 'Topic', route.topicDefinition?.title ?? 'No registered context topic'),
      createInfoRow(
        documentRef,
        'Focus',
        route.activeAnchor
          ? route.activeAnchor.label
          : 'Page-level overview',
      ),
      createInfoRow(
        documentRef,
        'Workflow',
        WORKFLOW_STATE_LABELS[route.pageState?.workflowState] ?? 'Unavailable',
      ),
      createInfoRow(
        documentRef,
        'Status',
        formatProgressStateLabel(
          route.sectionProgress?.canonicalState,
          formatStateLabel(route.sectionState?.status, 'Not started'),
        ),
      ),
      createInfoRow(
        documentRef,
        'Required',
        formatSectionProgressCompact(route.sectionProgress),
      ),
    );

    if (route.isPinned && route.livePageId !== route.pageId) {
      const livePageDefinition = getSectionDefinition(route.livePageId);
      infoGrid.append(
        createInfoRow(
          documentRef,
          'Live page',
          `${livePageDefinition?.pageCode ?? route.livePageId} ${livePageDefinition?.title ?? ''}`.trim(),
        ),
      );
    }

    titleBlock.append(kicker, title);
    header.append(titleBlock, pinButton);
    contextShell.routeCard.append(header, infoGrid);

    if (route.referenceTopicIds.length || route.aboutTopicIds.length) {
      const linkGroups = documentRef.createElement('div');
      linkGroups.className = 'context-link-groups';

      if (route.referenceTopicIds.length) {
        const group = documentRef.createElement('div');
        const label = documentRef.createElement('p');
        const list = documentRef.createElement('div');

        group.className = 'context-link-group';
        label.className = 'context-block-label';
        label.textContent = 'Reference drawers';
        list.className = 'context-link-list';

        route.referenceTopicIds.forEach((topicId) => {
          const drawerDefinition = REFERENCE_DRAWER_BY_TOPIC_ID[topicId];

          if (!drawerDefinition) {
            return;
          }

          list.appendChild(createLinkButton({
            documentRef,
            className: 'context-link-button',
            text: `${drawerDefinition.code} ${drawerDefinition.title}`,
            dataName: 'contextDrawerId',
            dataValue: drawerDefinition.drawerId,
            ariaLabel: `Open ${drawerDefinition.title}`,
          }));
        });

        group.append(label, list);
        linkGroups.appendChild(group);
      }

      if (route.aboutTopicIds.length) {
        const group = documentRef.createElement('div');
        const label = documentRef.createElement('p');
        const list = documentRef.createElement('div');

        group.className = 'context-link-group';
        label.className = 'context-block-label';
        label.textContent = 'Info topics';
        list.className = 'context-link-list';

        route.aboutTopicIds.forEach((topicId) => {
          const topicDefinition = getContentTopicDefinition(topicId);

          if (!topicDefinition) {
            return;
          }

          list.appendChild(createLinkButton({
            documentRef,
            className: 'context-link-button',
            text: topicDefinition.title,
            dataName: 'contextAboutTopicId',
            dataValue: topicId,
            ariaLabel: `Open info topic ${topicDefinition.title}`,
          }));
        });

        group.append(label, list);
        linkGroups.appendChild(group);
      }

      contextShell.routeCard.appendChild(linkGroups);
    }

    if (route.sourceRefs.length) {
      contextShell.routeCard.appendChild(createSourceList(documentRef, route.sourceRefs));
    }
  };

  const renderContextContent = (route) => {
    clearChildren(contextShell.generatedSlot);
    clearChildren(contextShell.topicStack);

    const generatedSection = route.kind === CONTEXT_ROUTE_KINDS.CRITERION
      ? buildCriterionCompanion(documentRef, route)
      : route.kind === CONTEXT_ROUTE_KINDS.SUMMARY
        ? buildSummaryCompanion(documentRef, route)
        : route.literalSections.length === 0
          ? buildPageFallback(documentRef, route)
          : null;

    if (generatedSection) {
      contextShell.generatedSlot.appendChild(generatedSection);
    }

    if (route.literalSections.length) {
      route.literalSections.forEach((section) => {
        section.classList.remove('is-context-hidden');
        section.hidden = false;
        contextShell.topicStack.appendChild(section);
      });
      return;
    }

    if (!generatedSection && contextSources.fallback) {
      contextSources.fallback.classList.remove('is-context-hidden');
      contextSources.fallback.hidden = false;
      contextShell.topicStack.appendChild(contextSources.fallback);
    }
  };

  const sync = (state) => {
    refreshPageAnchors();
    renderQuickJump(state);
    renderPageIndex(state);

    currentRoute = resolveDisplayedRoute(state);
    renderRouteCard(currentRoute);
    renderAnchorCard(currentRoute);
    renderContextContent(currentRoute);
  };

  const handleQuickJumpClick = (event) => {
    const button = event.target.closest('.nav-button[data-page-id]');

    if (!(button instanceof HTMLButtonElement) || button.disabled) {
      return;
    }

    navigateToPage(button.dataset.pageId, { focusTarget: true, resetSubAnchor: true });
  };

  const handlePageIndexClick = (event) => {
    const button = event.target.closest('.page-index-button[data-page-id]');

    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    navigateToPage(button.dataset.pageId, { focusTarget: true, resetSubAnchor: true });
  };

  const handleContextClick = (event) => {
    const pinButton = event.target.closest('[data-context-pin-toggle]');
    if (pinButton instanceof HTMLButtonElement) {
      pinnedRoute = pinnedRoute
        ? null
        : {
            pageId: currentRoute?.pageId ?? store.getState().ui.activePageId,
            subAnchorId: currentRoute?.activeAnchor?.id ?? null,
          };
      sync(store.getState());
      return;
    }

    const drawerButton = event.target.closest('[data-context-drawer-id]');
    if (drawerButton instanceof HTMLButtonElement) {
      openReferenceDrawer?.(drawerButton.dataset.contextDrawerId, drawerButton);
      return;
    }

    const aboutButton = event.target.closest('[data-context-about-topic-id]');
    if (aboutButton instanceof HTMLButtonElement) {
      openAboutTopic?.(aboutButton.dataset.contextAboutTopicId, aboutButton);
      return;
    }

    const overviewButton = event.target.closest('[data-context-page-overview]');
    if (overviewButton instanceof HTMLButtonElement) {
      navigateToPage(overviewButton.dataset.contextPageOverview, {
        focusTarget: true,
        resetSubAnchor: true,
      });
      return;
    }

    const anchorButton = event.target.closest('[data-context-anchor-id]');
    if (anchorButton instanceof HTMLButtonElement) {
      const descriptor = anchorById.get(anchorButton.dataset.contextAnchorId);
      if (descriptor) {
        navigateToSubAnchor?.(descriptor);
      }
    }
  };

  quickJumpMount.addEventListener('click', handleQuickJumpClick);
  pageSidebarMount.addEventListener('click', handlePageIndexClick);
  contextSidebarMount.addEventListener('click', handleContextClick);

  cleanup.push(() => {
    quickJumpMount.removeEventListener('click', handleQuickJumpClick);
    pageSidebarMount.removeEventListener('click', handlePageIndexClick);
    contextSidebarMount.removeEventListener('click', handleContextClick);
    windowRef.cancelAnimationFrame(indicatorFrame);
  });

  sync(store.getState());

  return {
    sync,
    refreshPageAnchors,
    getSubAnchorTargetById(anchorId) {
      return anchorById.get(anchorId) ?? null;
    },
    setActiveSubAnchorById(anchorId) {
      if (anchorId && anchorById.has(anchorId)) {
        store.actions.setActiveSubAnchor(anchorId);
      } else if (!anchorId) {
        store.actions.setActiveSubAnchor(null);
      }
    },
    clearActiveSubAnchor() {
      store.actions.setActiveSubAnchor(null);
    },
    getCurrentContextHeading() {
      const route = currentRoute;
      const activeAnchor = route?.activeAnchor ?? null;

      if (!route) {
        return '';
      }

      if (activeAnchor?.kind === CONTEXT_ROUTE_KINDS.CRITERION) {
        return activeAnchor?.label ?? route.pageDefinition?.title ?? route.pageId;
      }

      if (activeAnchor?.kind === CONTEXT_ROUTE_KINDS.SUMMARY) {
        return activeAnchor?.label ?? `${route.pageDefinition?.title ?? route.pageId} summary guidance`;
      }

      const literalHeading = getSectionHeadingText(route.literalSections[0]);
      return literalHeading || route.topicDefinition?.title || route.pageDefinition?.title || '';
    },
    isPinned() {
      return Boolean(pinnedRoute?.pageId);
    },
    destroy() {
      cleanup.splice(0).forEach((dispose) => {
        dispose();
      });
    },
  };
};
