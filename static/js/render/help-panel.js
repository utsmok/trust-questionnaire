import {
  COMPLETION_GROUPS,
  SECTION_WORKFLOW_STATES,
  getContentTopicDefinition,
  getSectionDefinition,
} from '../config/sections.js';
import { PROGRESS_STATES } from '../state/derive.js';
import { getDocumentRef, clearChildren, joinTokens, formatProgressStateLabel, formatSectionProgressCompact, createInfoRow, getCompletionGroupLabel } from '../utils/shared.js';
import { REFERENCE_DRAWER_BY_TOPIC_ID } from './reference-drawers.js';

const PAGE_HELP_SUMMARIES = Object.freeze({
  S0: 'Set workflow mode, tool identity, and responder role before relying on later completion or routing behavior.',
  S1: 'Record provider, scope, and access characteristics here; these values frame later security and governance interpretation.',
  S2: 'Use this page to make the evaluation auditable: scenarios, benchmark choices, and evidence boundary belong here first.',
  TR: 'Section color marks transparency context; scores and follow-up blockers stay local to each criterion.',
  RE: 'Use repeated-run and verification evidence to separate reliability scoring from final recommendation language.',
  UC: 'User-centric scoring is about fit, workflow integration, usability, and explicit uncertainty cues—not general enthusiasm.',
  SE: 'Security scoring should stay distinct from recommendation outcomes; unresolved compliance concerns escalate visibly.',
  TC: 'Traceability requires inspectable provenance and source linkage; a positive tone is not the same thing as traceability.',
  S8: 'Critical fails and confidence are workflow/status controls. They modify downstream recommendation logic without replacing section identity.',
  S9: 'Recommendation colors represent decision outcomes only; the section accent still marks where you are in the questionnaire.',
  S10A: 'Use handoff pages to expose uncertainty, not hide it. Governance pages stay explicitly tagged and separately colored.',
  S10B: 'Second review captures agreement and conflict as first-class workflow outcomes; keep recommendation state distinct from governance context.',
  S10C: 'Final decision records publication and review cadence. It closes the workflow without overwriting the evidence trail.',
});

const WORKFLOW_STATE_LABELS = Object.freeze({
  [SECTION_WORKFLOW_STATES.EDITABLE]: 'Editable',
  [SECTION_WORKFLOW_STATES.READ_ONLY]: 'Read-only',
  [SECTION_WORKFLOW_STATES.SYSTEM_SKIPPED]: 'System-skipped',
});

const PROGRESS_STATE_LABELS = (documentRef, text, dataset = {}) => {
  const chip = documentRef.createElement('span');
  chip.className = 'chip';
  chip.textContent = text;
  Object.entries(dataset).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      chip.dataset[key] = value;
    }
  });
  return chip;
};

const createLegendCard = ({ documentRef, titleText, bodyText, chips = [] }) => {
  const card = documentRef.createElement('section');
  const title = documentRef.createElement('h3');
  const body = documentRef.createElement('p');
  const chipRow = documentRef.createElement('div');

  card.className = 'mini-card';
  title.textContent = titleText;
  body.textContent = bodyText;
  chipRow.className = 'chips';

  chips.forEach((chip) => {
    chipRow.appendChild(chip);
  });

  card.append(title, body, chipRow);
  return card;
};

const createTagListBlock = ({ documentRef, labelText, items, accentKey = 'control' }) => {
  if (!items.length) {
    return null;
  }

  const block = documentRef.createElement('div');
  const label = documentRef.createElement('p');
  const list = documentRef.createElement('div');

  block.className = 'context-link-group';
  label.className = 'context-block-label';
  label.textContent = labelText;
  list.className = 'about-topic-pages';

  items.forEach((itemText) => {
    const tag = documentRef.createElement('span');
    tag.className = 'about-topic-page';
    tag.dataset.accentKey = accentKey;
    tag.textContent = itemText;
    list.appendChild(tag);
  });

  block.append(label, list);
  return block;
};

export const createHelpPanelController = ({ root = document }) => {
  const documentRef = getDocumentRef(root);
  const mount = documentRef.getElementById('helpSurfaceMount');
  const surfaceCard = mount?.querySelector('.surface-card');
  const surfaceBody = mount?.querySelector('.surface-body');

  if (!mount || !surfaceCard || !surfaceBody) {
    return {
      sync() {},
      destroy() {},
    };
  }

  const render = (state) => {
    const pageDefinition = getSectionDefinition(state.ui.activePageId);
    const pageState = state.derived.pageStates.bySectionId[state.ui.activePageId] ?? null;
    const sectionProgress = state.derived.completionProgress?.bySectionId?.[state.ui.activePageId] ?? null;
    const contextTopicDefinition = pageDefinition?.contextTopicId
      ? getContentTopicDefinition(pageDefinition.contextTopicId)
      : null;
    const referenceTags = (pageDefinition?.referenceTopicIds ?? [])
      .map((topicId) => REFERENCE_DRAWER_BY_TOPIC_ID[topicId])
      .filter(Boolean)
      .map((drawer) => `${drawer.code} ${drawer.title}`);
    const infoTags = (pageDefinition?.aboutTopicIds ?? [])
      .map((topicId) => getContentTopicDefinition(topicId))
      .filter(Boolean)
      .map((topic) => topic.title);

    clearChildren(surfaceBody);
    surfaceCard.dataset.accentKey = pageDefinition?.accentKey ?? 'control';

    const shell = documentRef.createElement('div');
    shell.className = 'help-panel-shell';

    const currentSection = documentRef.createElement('section');
    const currentHeader = documentRef.createElement('div');
    const currentTitleBlock = documentRef.createElement('div');
    const currentKicker = documentRef.createElement('p');
    const currentTitle = documentRef.createElement('h2');
    const currentSummary = documentRef.createElement('p');
    const currentGrid = documentRef.createElement('dl');
    const titleTag = documentRef.createElement('span');

    currentSection.className = 'context-route-card';
    currentSection.dataset.accentKey = pageDefinition?.accentKey ?? 'control';
    currentHeader.className = 'context-route-header';
    currentTitleBlock.className = 'context-route-title-block';
    currentKicker.className = 'workspace-title';
    currentKicker.textContent = 'Current page';
    currentTitle.className = 'context-route-title';
    titleTag.className = 'context-route-code';
    titleTag.dataset.accentKey = pageDefinition?.accentKey ?? 'control';
    titleTag.textContent = pageDefinition?.pageCode ?? '—';
    currentTitle.append(titleTag, documentRef.createTextNode(` ${pageDefinition?.title ?? 'Questionnaire page'}`));
    currentSummary.className = 'about-topic-suggestion';
    currentSummary.textContent = PAGE_HELP_SUMMARIES[state.ui.activePageId]
      ?? contextTopicDefinition?.title
      ?? 'Use the page index, pager, and context surface together; section color marks location, state chips mark workflow and completion.';

    currentGrid.className = 'context-route-grid';
    currentGrid.append(
      createInfoRow(documentRef, 'Workflow', WORKFLOW_STATE_LABELS[pageState?.workflowState] ?? 'Unavailable'),
      createInfoRow(documentRef, 'Progress', formatProgressStateLabel(sectionProgress?.canonicalState)),
      createInfoRow(documentRef, 'Required', formatSectionProgressCompact(sectionProgress)),
      createInfoRow(documentRef, 'Completion group', getCompletionGroupLabel(pageDefinition?.completionGroupId, COMPLETION_GROUPS)),
      createInfoRow(documentRef, 'Context topic', contextTopicDefinition?.title ?? 'No registered context topic'),
    );

    currentTitleBlock.append(currentKicker, currentTitle, currentSummary);
    currentHeader.appendChild(currentTitleBlock);
    currentSection.append(currentHeader, currentGrid);

    const tagGroups = documentRef.createElement('div');
    tagGroups.className = 'context-link-groups';

    const referenceBlock = createTagListBlock({
      documentRef,
      labelText: 'Reference drawers',
      items: referenceTags,
      accentKey: pageDefinition?.accentKey ?? 'control',
    });
    if (referenceBlock) {
      tagGroups.appendChild(referenceBlock);
    }

    const infoBlock = createTagListBlock({
      documentRef,
      labelText: 'Info topics',
      items: infoTags,
      accentKey: pageDefinition?.accentKey ?? 'control',
    });
    if (infoBlock) {
      tagGroups.appendChild(infoBlock);
    }

    if (tagGroups.childElementCount > 0) {
      currentSection.appendChild(tagGroups);
    }

    const mapSection = documentRef.createElement('section');
    const mapKicker = documentRef.createElement('p');
    const mapSummary = documentRef.createElement('p');
    const map = documentRef.createElement('div');

    mapSection.className = 'help-panel-section';
    mapKicker.className = 'workspace-title';
    mapKicker.textContent = 'Section map';
    mapSummary.className = 'about-topic-suggestion';
    mapSummary.textContent = 'Section color marks context. Workflow and completion remain explicit in the compact status pills.';
    map.className = 'help-section-map';

    state.ui.pageOrder.forEach((pageId) => {
      const section = getSectionDefinition(pageId);
      const sectionPageState = state.derived.pageStates.bySectionId[pageId] ?? null;
      const sectionProgressState = state.derived.completionProgress?.bySectionId?.[pageId] ?? null;
      const item = documentRef.createElement('div');
      const swatch = documentRef.createElement('span');
      const code = documentRef.createElement('span');
      const content = documentRef.createElement('span');
      const label = documentRef.createElement('span');
      const meta = documentRef.createElement('span');
      const workflow = documentRef.createElement('span');
      const progress = documentRef.createElement('span');

      item.className = 'help-section-item';
      item.dataset.accentKey = section?.accentKey ?? 'control';
      item.classList.toggle('is-active', pageId === state.ui.activePageId);

      swatch.className = 'help-section-swatch';
      code.className = 'page-index-code';
      code.textContent = section?.pageCode ?? pageId;
      content.className = 'page-index-content';
      label.className = 'page-index-label';
      label.textContent = section?.title ?? pageId;
      meta.className = 'page-index-meta';

      workflow.className = 'page-index-state';
      workflow.dataset.workflowState = sectionPageState?.workflowState ?? '';
      workflow.textContent = WORKFLOW_STATE_LABELS[sectionPageState?.workflowState] ?? 'Unavailable';

      progress.className = 'page-index-status';
      progress.dataset.progressState = sectionProgressState?.canonicalState ?? PROGRESS_STATES.NOT_STARTED;
      progress.textContent = joinTokens([
        formatProgressStateLabel(sectionProgressState?.canonicalState),
        formatSectionProgressCompact(sectionProgressState),
      ]);

      meta.append(workflow, progress);
      content.append(label, meta);
      item.append(swatch, code, content);
      map.appendChild(item);
    });

    mapSection.append(mapKicker, mapSummary, map);

    const legendSection = documentRef.createElement('section');
    const legendKicker = documentRef.createElement('p');
    const legendGrid = documentRef.createElement('div');

    legendSection.className = 'help-panel-section';
    legendKicker.className = 'workspace-title';
    legendKicker.textContent = 'State legend';
    legendGrid.className = 'reference-cards';

    legendGrid.append(
      createLegendCard({
        documentRef,
        titleText: 'Section context',
        bodyText: 'Accent color answers “where am I?”. It follows the active page across chrome, sidebar markers, contextual docs, and the completion strip.',
        chips: [
          createChip(documentRef, pageDefinition?.pageCode ?? 'PAGE', { helpRole: 'context' }),
          createChip(documentRef, 'Info', { helpRole: 'info' }),
          createChip(documentRef, 'Help', { helpRole: 'help' }),
        ],
      }),
      createLegendCard({
        documentRef,
        titleText: 'Score scale',
        bodyText: 'Criterion scores stay local to score controls and legends. They no longer double as page or workflow colors.',
        chips: [
          createChip(documentRef, '0 Fails', { score: '0' }),
          createChip(documentRef, '1 Partial', { score: '1' }),
          createChip(documentRef, '2 Baseline', { score: '2' }),
          createChip(documentRef, '3 Strong', { score: '3' }),
        ],
      }),
      createLegendCard({
        documentRef,
        titleText: 'Workflow and progress',
        bodyText: 'Workflow tags show editability; progress tags show completion or attention state. They overlay section context rather than replacing it.',
        chips: [
          createChip(documentRef, 'Editable', { workflowState: 'editable' }),
          createChip(documentRef, 'Read-only', { workflowState: 'read_only' }),
          createChip(documentRef, 'Skipped', { workflowState: 'system_skipped' }),
        ],
      }),
      createLegendCard({
        documentRef,
        titleText: 'Judgment state',
        bodyText: 'Principle judgments are outcome states, not section colors. They stay contained inside their own controls and badges.',
        chips: [
          createChip(documentRef, 'Pass', { judgment: 'pass' }),
          createChip(documentRef, 'Conditional', { judgment: 'conditional_pass' }),
          createChip(documentRef, 'Fail', { judgment: 'fail' }),
        ],
      }),
      createLegendCard({
        documentRef,
        titleText: 'Recommendation state',
        bodyText: 'Recommendation colors now match the decision meaning: positive, caveated, provisional, restricted, negative, or neutral.',
        chips: [
          createChip(documentRef, 'Recommended', { recommendationState: 'recommended' }),
          createChip(documentRef, 'Caveats', { recommendationState: 'recommended_with_caveats' }),
          createChip(documentRef, 'Needs review', { recommendationState: 'needs_review_provisional' }),
          createChip(documentRef, 'Pilot only', { recommendationState: 'pilot_only' }),
          createChip(documentRef, 'Not recommended', { recommendationState: 'not_recommended' }),
          createChip(documentRef, 'Out of scope', { recommendationState: 'out_of_scope' }),
        ],
      }),
      createLegendCard({
        documentRef,
        titleText: 'Explicit help pattern',
        bodyText: 'Essential guidance now lives in visible Context, Info, and Help surfaces, with page codes shown directly in the completion strip instead of hover-only titles.',
        chips: [
          createChip(documentRef, 'Context surface', { helpRole: 'context' }),
          createChip(documentRef, 'Info surface', { helpRole: 'info' }),
          createChip(documentRef, 'Help surface', { helpRole: 'help' }),
        ],
      }),
    );

    legendSection.append(legendKicker, legendGrid);

    const usageSection = documentRef.createElement('section');
    const usageKicker = documentRef.createElement('p');
    const usageList = documentRef.createElement('ul');

    usageSection.className = 'help-panel-section';
    usageKicker.className = 'workspace-title';
    usageKicker.textContent = 'Usage notes';

    [
      'Use the page index for the authoritative full-questionnaire route; use TR/RE/UC/SE/TC as a fast quick-jump subset only.',
      'The completion strip now shows visible page codes; the page index and live progress summary carry the full readable status text.',
      'Context follows the active page and sub-anchor; on narrow screens it opens as a drawer, while Info carries stable background material such as scope and governance.',
      'Alt+1 through Alt+5 jump to TR, RE, UC, SE, and TC; Escape closes the active Context drawer, Info surface, or Help surface and returns focus to its trigger.',
      'If a status used to hide inside a hover title, it should now be visible here, in the page index, or in the context route card.',
    ].forEach((text) => {
      const item = documentRef.createElement('li');
      item.textContent = text;
      usageList.appendChild(item);
    });

    usageSection.append(usageKicker, usageList);

    /* Keyboard shortcuts section */
    const shortcutsSection = documentRef.createElement('section');
    const shortcutsKicker = documentRef.createElement('p');
    const shortcutsTable = documentRef.createElement('table');

    shortcutsSection.className = 'help-panel-section';
    shortcutsKicker.className = 'workspace-title';
    shortcutsKicker.textContent = 'Keyboard shortcuts';

    shortcutsTable.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--text-body);';
    shortcutsTable.setAttribute('role', 'table');

    const shortcutRows = [
      ['Alt + 1', 'Jump to Transparent (TR)'],
      ['Alt + 2', 'Jump to Responsible (RE)'],
      ['Alt + 3', 'Jump to Understandable (UC)'],
      ['Alt + 4', 'Jump to Sustainable (SE)'],
      ['Alt + 5', 'Jump to Trustworthy Computing (TC)'],
      ['Alt + t', 'Jump to page with code starting with T'],
      ['Alt + r', 'Jump to page with code starting with R'],
      ['Alt + u', 'Jump to page with code starting with U'],
      ['Alt + s', 'Jump to page with code starting with S'],
      ['Alt + c', 'Jump to page with code starting with C'],
      ['Escape', 'Close active surface or drawer'],
    ];

    shortcutRows.forEach(([key, action]) => {
      const row = documentRef.createElement('tr');
      row.style.cssText = 'border-bottom:1px solid var(--ut-border);';

      const keyCell = documentRef.createElement('td');
      keyCell.style.cssText = 'padding:6px 10px;white-space:nowrap;font-family:var(--ff-mono);font-size:var(--text-sm);font-weight:700;color:var(--ut-navy);vertical-align:top;';
      keyCell.textContent = key;

      const actionCell = documentRef.createElement('td');
      actionCell.style.cssText = 'padding:6px 10px;color:var(--ut-text);line-height:var(--lh-body);';
      actionCell.textContent = action;

      row.appendChild(keyCell);
      row.appendChild(actionCell);
      shortcutsTable.appendChild(row);
    });

    shortcutsSection.append(shortcutsKicker, shortcutsTable);

    shell.append(currentSection, mapSection, legendSection, usageSection, shortcutsSection);
    surfaceBody.appendChild(shell);
  };

  return {
    sync(state) {
      const surfaceEl = documentRef.querySelector('[data-surface="help"]');
      const isOpen = surfaceEl?.classList.contains('is-open') || surfaceEl?.getAttribute('aria-hidden') === 'false';
      if (!isOpen) return;
      render(state);
    },
    destroy() {},
  };
};
