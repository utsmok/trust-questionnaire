import {
  SECTION_WORKFLOW_STATES,
  getContentTopicDefinition,
  getSectionDefinition,
} from '../config/sections.js';
import { getGuidanceTopicDefinition } from '../content/guidance-topics.js';
import { CRITERIA_BY_CODE } from '../config/questionnaire-schema.js';
import { PROGRESS_STATES } from '../state/derive.js';
import {
  toArray,
  getDocumentRef,
  clearChildren,
  joinTokens,
  setAccentKey,
  createInfoRow,
  getCompletionGroupLabel,
  formatProgressStateLabel,
  formatSectionProgressCompact,
  createSourceList,
} from '../utils/shared.js';
import { REFERENCE_DRAWER_BY_TOPIC_ID } from './reference-drawers.js';
import { buildGuidanceTopicSection } from './content-topic-blocks.js';

export const CONTEXT_ROUTE_KINDS = Object.freeze({
  PAGE: 'page',
  CRITERION: 'criterion',
  SUMMARY: 'summary',
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

const getCriterionAnchorLabel = (criterionCode) => {
  const criterion = CRITERIA_BY_CODE[criterionCode];
  return criterion ? `${criterion.code} — ${criterion.title}` : criterionCode;
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

  const base =
    groupProgress.applicableRequiredFieldCount > 0
      ? `${groupProgress.satisfiedRequiredFieldCount}/${groupProgress.applicableRequiredFieldCount}`
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
    groupProgress.skippedSectionCount > 0 ? `${groupProgress.skippedSectionCount} skipped` : null,
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
  ]
    .filter(Boolean)
    .join(' ');
};

const buildCompletionStripItemLabel = ({ pageDefinition, pageState, sectionProgress }) => {
  return [
    `${pageDefinition?.pageCode ?? '—'} ${pageDefinition?.title ?? 'Page'}.`,
    `${formatProgressStateLabel(sectionProgress?.canonicalState)}.`,
    formatSectionProgressDetail(sectionProgress),
    `${WORKFLOW_STATE_LABELS[pageState?.workflowState] ?? 'Unavailable'} workflow state.`,
  ]
    .filter(Boolean)
    .join(' ');
};

const getSummaryAnchorLabel = (pageDefinition, summaryKind) => {
  const baseLabel =
    SUMMARY_ANCHOR_LABELS[summaryKind] ?? `${formatStateLabel(summaryKind, 'Summary')} block`;
  return pageDefinition ? `${pageDefinition.title} — ${baseLabel}` : baseLabel;
};

const getSummaryAnchorShortLabel = (summaryKind) =>
  summaryKind === 'criteria' ? 'CRITERIA' : formatStateLabel(summaryKind, 'SUMMARY').toUpperCase();

const createSectionTag = (documentRef, pageDefinition) => {
  const tag = documentRef.createElement('span');
  tag.className = 'context-route-code';
  tag.dataset.accentKey = pageDefinition?.accentKey ?? 'control';
  tag.textContent = pageDefinition?.pageCode ?? '—';
  return tag;
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

const createLinkButton = ({ documentRef, className, text, dataName, dataValue, ariaLabel }) => {
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

  section.className = 'doc-section context-generated-section';
  section.dataset.section = route.pageDefinition?.accentKey ?? 'control';

  kicker.className = 'section-kicker';
  kicker.textContent = 'Criterion focus';

  heading.textContent = `${criterion.code} — ${criterion.title}`;
  statement.textContent = criterion.statement;

  section.append(kicker, heading, statement);
  return section;
};

const buildSummaryCompanion = (documentRef, route) => {
  const section = documentRef.createElement('section');
  const kicker = documentRef.createElement('div');
  const heading = documentRef.createElement('h2');
  const summary = documentRef.createElement('p');

  section.className = 'doc-section context-generated-section';
  section.dataset.section = route.pageDefinition?.accentKey ?? 'control';

  kicker.className = 'section-kicker';
  kicker.textContent = 'Summary focus';

  heading.textContent = `${route.pageDefinition?.title ?? route.pageId} summary guidance`;
  summary.textContent = 'Translate criterion scores into a section judgment.';

  section.append(kicker, heading, summary);
  return section;
};

const buildMissingGuidanceFallback = (documentRef, route) => {
  const section = documentRef.createElement('section');
  const heading = documentRef.createElement('h2');
  const summary = documentRef.createElement('p');

  section.className = 'doc-section context-generated-section context-empty-state';
  section.dataset.section = route.pageDefinition?.accentKey ?? 'control';
  heading.textContent = route.pageDefinition?.title ?? 'Context guidance';
  summary.textContent = 'No registered page guidance exists for this topic yet.';
  section.append(heading, summary);
  return section;
};

const buildGuidanceContent = (documentRef, route) => {
  const guidanceTopic = getGuidanceTopicDefinition(route.topicId);

  if (!guidanceTopic) {
    return buildMissingGuidanceFallback(documentRef, route);
  }

  return buildGuidanceTopicSection(documentRef, guidanceTopic, {
    accentKey: route.pageDefinition?.accentKey ?? 'control',
  });
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
  const idSuffix = kind === CONTEXT_ROUTE_KINDS.CRITERION ? criterionCode?.toLowerCase() : kind;
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
  const headerBarToggles = documentRef.getElementById('headerBarToggles');
  const pageSidebarMount = documentRef.getElementById('pageSidebarMount');
  const contextSidebarMount = documentRef.getElementById('contextSidebarMount');
  const questionnaireRenderRoot = documentRef.getElementById('questionnaireRenderRoot');
  const completionStrip = documentRef.querySelector('.completion-strip');

  if (!headerBarToggles || !pageSidebarMount || !contextSidebarMount) {
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
  const contextShell = buildContextShell(contextSidebarMount, documentRef);
  const prefersReducedMotion = () =>
    Boolean(documentRef.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);

  let pageAnchorsByPageId = new Map();
  let anchorById = new Map();
  let pinnedRoute = null;
  let currentRoute = null;
  let completionStripCache = new Map();
  let completionStripCachedKeys = '';

  const refreshPageAnchors = () => {
    const nextAnchorsByPageId = new Map();
    const nextAnchorById = new Map();

    getRenderedPageSections(questionnaireRenderRoot).forEach((pageSection) => {
      const pageId = pageSection.dataset.pageId;
      const pageDefinition = getSectionDefinition(pageId);
      const anchors = [];

      const criteriaOverviewElement = pageSection.querySelector(
        '.criteria-stack[data-summary-anchor]',
      );

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

      toArray(pageSection.querySelectorAll('.criterion-card[data-criterion]')).forEach(
        (criterionElement) => {
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
        },
      );

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
    const activeAnchor = subAnchorId ? (anchorById.get(subAnchorId) ?? null) : null;
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

  const renderHeaderProgress = () => {};

  const renderCompletionStrip = (state) => {
    const overallProgress = state.derived.completionProgress?.overall ?? null;

    if (!(completionStrip instanceof HTMLElement) || !overallProgress) {
      return;
    }

    completionStrip.dataset.progressState = overallProgress.canonicalState ?? '';
    completionStrip.setAttribute('aria-labelledby', 'completionStripLabel');

    const currentKeys = state.ui.pageOrder.join(',');

    if (currentKeys !== completionStripCachedKeys) {
      clearChildren(completionStrip);
      completionStripCache.clear();

      state.ui.pageOrder.forEach((pageId) => {
        const pageDefinition = getSectionDefinition(pageId);
        const pageState = state.derived.pageStates.bySectionId[pageId] ?? null;
        const sectionProgress = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;
        const cell = documentRef.createElement('button');
        const code = documentRef.createElement('span');

        cell.type = 'button';
        cell.className = 'strip-cell';
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
        cell.disabled = !pageState?.isAccessible;
        cell.setAttribute(
          'aria-label',
          buildCompletionStripItemLabel({
            pageDefinition,
            pageState,
            sectionProgress,
          }),
        );
        if (state.ui.activePageId === pageId) {
          cell.setAttribute('aria-current', 'page');
        }
        code.className = 'strip-cell-code';
        code.setAttribute('aria-hidden', 'true');
        code.textContent = pageDefinition?.pageCode ?? pageId;
        cell.appendChild(code);
        completionStrip.appendChild(cell);
        completionStripCache.set(pageId, cell);
      });

      completionStripCachedKeys = currentKeys;
    } else {
      state.ui.pageOrder.forEach((pageId) => {
        const cell = completionStripCache.get(pageId);
        if (!cell) return;
        const pageDefinition = getSectionDefinition(pageId);
        const pageState = state.derived.pageStates.bySectionId[pageId] ?? null;
        const sectionProgress = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;

        cell.dataset.progressState = sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
        cell.dataset.workflowState = pageState?.workflowState ?? '';
        cell.classList.toggle(
          'filled',
          sectionProgress?.canonicalState === PROGRESS_STATES.COMPLETE,
        );
        cell.classList.toggle('is-active', state.ui.activePageId === pageId);
        cell.disabled = !pageState?.isAccessible;
        cell.setAttribute(
          'aria-label',
          buildCompletionStripItemLabel({
            pageDefinition,
            pageState,
            sectionProgress,
          }),
        );
        if (state.ui.activePageId === pageId) {
          cell.setAttribute('aria-current', 'page');
        } else {
          cell.removeAttribute('aria-current');
        }
      });
    }
  };

  const renderQuickJump = (state) => {
    renderCompletionStrip(state);
  };

  const renderPageIndex = (state) => {
    const list = documentRef.createElement('ol');
    const heading = documentRef.createElement('h2');

    pageSidebarMount.hidden = false;
    clearChildren(pageSidebarMount);

    heading.className = 'workspace-title';
    heading.textContent = 'Page index';

    const toggleBtn = documentRef.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'nav-button sidebar-collapse-toggle';
    toggleBtn.textContent = 'Collapse Index';
    toggleBtn.style.cssText = 'width: 100%; margin-bottom: 12px; font-size: 10px;';
    toggleBtn.onclick = () => {
      const layout = documentRef.querySelector('.workspace-layout');
      if (layout) {
        layout.classList.toggle('is-compact');
        toggleBtn.textContent = layout.classList.contains('is-compact') ? '' : 'Collapse Index';
      }
    };

    list.className = 'page-index-list';

    state.ui.pageOrder.forEach((pageId) => {
      const pageDefinition = getSectionDefinition(pageId);
      const pageState = state.derived.pageStates.bySectionId[pageId] ?? null;
      const sectionState = state.derived.sectionStates.bySectionId[pageId] ?? null;
      const sectionProgress = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;
      const isActive = state.ui.activePageId === pageId;

      const item = documentRef.createElement('li');
      const button = documentRef.createElement('button');
      const code = documentRef.createElement('span');
      const content = documentRef.createElement('span');
      const label = documentRef.createElement('span');
      const meta = documentRef.createElement('span');
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
      button.setAttribute(
        'aria-label',
        buildSectionNavigationLabel({
          pageDefinition,
          pageState,
          sectionProgress,
        }),
      );

      if (isActive) {
        button.setAttribute('aria-current', 'page');
      }

      code.className = 'page-index-code';
      code.textContent = pageDefinition?.pageCode ?? pageId;

      label.className = 'page-index-label';
      label.textContent = pageDefinition?.title ?? pageId;

      content.className = 'page-index-content';
      meta.className = 'page-index-meta';

      statusState.className = 'page-index-status';
      statusState.dataset.sectionStatus = sectionState?.status ?? '';
      statusState.dataset.progressState =
        sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
      statusState.textContent = formatProgressStateLabel(
        sectionProgress?.canonicalState,
        formatStateLabel(sectionState?.status, 'Not started'),
      );

      progressState.className = 'page-index-state page-index-progress';
      progressState.dataset.progressState =
        sectionProgress?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
      progressState.textContent = formatSectionProgressCompact(sectionProgress);

      meta.append(statusState, progressState);
      content.append(label, meta);

      button.append(code, content);
      item.appendChild(button);
      list.appendChild(item);
    });

    pageSidebarMount.append(heading, toggleBtn, list);
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
    kicker.textContent = 'Current page';

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
    pinButton.setAttribute(
      'aria-label',
      `${route.isPinned ? 'Unpin' : 'Pin'} current context route`,
    );

    infoGrid.className = 'context-route-grid';
    infoGrid.append(
      createInfoRow(documentRef, 'Mode', route.isPinned ? 'Pinned route' : 'Live route'),
      createInfoRow(
        documentRef,
        'Topic',
        route.topicDefinition?.title ?? 'No registered context topic',
      ),
      createInfoRow(
        documentRef,
        'Focus',
        route.activeAnchor ? route.activeAnchor.label : 'Page-level overview',
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

          list.appendChild(
            createLinkButton({
              documentRef,
              className: 'context-link-button',
              text: `${drawerDefinition.code} ${drawerDefinition.title}`,
              dataName: 'contextDrawerId',
              dataValue: drawerDefinition.drawerId,
              ariaLabel: `Open ${drawerDefinition.title}`,
            }),
          );
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

          list.appendChild(
            createLinkButton({
              documentRef,
              className: 'context-link-button',
              text: topicDefinition.title,
              dataName: 'contextAboutTopicId',
              dataValue: topicId,
              ariaLabel: `Open info topic ${topicDefinition.title}`,
            }),
          );
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

    const generatedSection =
      route.kind === CONTEXT_ROUTE_KINDS.CRITERION
        ? buildCriterionCompanion(documentRef, route)
        : route.kind === CONTEXT_ROUTE_KINDS.SUMMARY
          ? buildSummaryCompanion(documentRef, route)
          : null;

    const pageGuidanceSection = buildGuidanceContent(documentRef, route);

    if (generatedSection) {
      contextShell.generatedSlot.appendChild(generatedSection);
    }

    contextShell.topicStack.appendChild(pageGuidanceSection);
  };

  const sync = (state) => {
    try {
      renderQuickJump(state);
    } catch (err) {
      console.error('Failed to render quick jump:', err);
    }

    try {
      renderPageIndex(state);
    } catch (err) {
      console.error('Failed to render page index:', err);
      try {
        clearChildren(pageSidebarMount);
        const msg = documentRef.createElement('p');
        msg.textContent = 'Unable to render page index.';
        msg.className = 'sidebar-error-fallback';
        pageSidebarMount.append(msg);
      } catch (_) {}
    }

    currentRoute = resolveDisplayedRoute(state);

    try {
      renderRouteCard(currentRoute);
    } catch (err) {
      console.error('Failed to render route card:', err);
      try {
        clearChildren(contextShell.routeCard);
        const msg = documentRef.createElement('p');
        msg.textContent = 'Unable to render route card.';
        msg.className = 'sidebar-error-fallback';
        contextShell.routeCard.append(msg);
      } catch (_) {}
    }

    try {
      renderAnchorCard(currentRoute);
    } catch (err) {
      console.error('Failed to render anchor card:', err);
      try {
        clearChildren(contextShell.anchorCard);
        const msg = documentRef.createElement('p');
        msg.textContent = 'Unable to render anchor card.';
        msg.className = 'sidebar-error-fallback';
        contextShell.anchorCard.append(msg);
      } catch (_) {}
    }

    try {
      renderContextContent(currentRoute);
    } catch (err) {
      console.error('Failed to render context content:', err);
      try {
        clearChildren(contextShell.generatedSlot);
        clearChildren(contextShell.topicStack);
        const msg = documentRef.createElement('p');
        msg.textContent = 'Unable to render context content.';
        msg.className = 'sidebar-error-fallback';
        contextShell.topicStack.append(msg);
      } catch (_) {}
    }
  };

  const handleCompletionStripClick = (event) => {
    const button = event.target.closest('.strip-cell[data-page-id]');

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
      const panelInner = contextSidebarMount.parentElement;
      const drawerEl = panelInner?.querySelector(
        `.reference-drawer[data-drawer-id="${drawerButton.dataset.contextDrawerId}"]`,
      );
      if (drawerEl) {
        drawerEl.scrollIntoView({
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
          block: 'start',
        });
      }
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

  completionStrip.addEventListener('click', handleCompletionStripClick);
  pageSidebarMount.addEventListener('click', handlePageIndexClick);
  contextSidebarMount.addEventListener('click', handleContextClick);

  cleanup.push(() => {
    completionStrip.removeEventListener('click', handleCompletionStripClick);
    pageSidebarMount.removeEventListener('click', handlePageIndexClick);
    contextSidebarMount.removeEventListener('click', handleContextClick);
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
        return (
          activeAnchor?.label ?? `${route.pageDefinition?.title ?? route.pageId} summary guidance`
        );
      }

      return route.topicDefinition?.title || route.pageDefinition?.title || '';
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
