import {
  COMPLETION_GROUPS,
  SECTION_WORKFLOW_STATES,
  getContentTopicDefinition,
  getSectionDefinition,
} from '../config/sections.js';
import { PROGRESS_STATES } from '../state/derive.js';
import {
  getDocumentRef,
  clearChildren,
  joinTokens,
  formatProgressStateLabel,
  formatSectionProgressCompact,
  createInfoRow,
  getCompletionGroupLabel,
} from '../utils/shared.js';
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

const createChip = (documentRef, text, dataset = {}) => {
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

export const createHelpPanelController = ({ root = document }) => {
  const documentRef = getDocumentRef(root);
  const mount = documentRef.getElementById('helpLegendMount');

  if (!mount) {
    return {
      sync() {},
      destroy() {},
    };
  }

  const render = (state) => {
    const pageDefinition = getSectionDefinition(state.ui.activePageId);
    const pageState = state.derived.pageStates.bySectionId[state.ui.activePageId] ?? null;
    const sectionProgress =
      state.derived.completionProgress?.bySectionId?.[state.ui.activePageId] ?? null;
    const contextTopicDefinition = pageDefinition?.contextTopicId
      ? getContentTopicDefinition(pageDefinition.contextTopicId)
      : null;

    clearChildren(mount);

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
    currentTitle.append(
      titleTag,
      documentRef.createTextNode(` ${pageDefinition?.title ?? 'Questionnaire page'}`),
    );
    currentSummary.className = 'about-topic-suggestion';
    currentSummary.textContent =
      PAGE_HELP_SUMMARIES[state.ui.activePageId] ??
      contextTopicDefinition?.title ??
      'Use the page index, pager, and context surface together; section color marks location, state chips mark workflow and completion.';

    currentGrid.className = 'context-route-grid';
    currentGrid.append(
      createInfoRow(
        documentRef,
        'Workflow',
        WORKFLOW_STATE_LABELS[pageState?.workflowState] ?? 'Unavailable',
      ),
      createInfoRow(
        documentRef,
        'Progress',
        formatProgressStateLabel(sectionProgress?.canonicalState),
      ),
      createInfoRow(documentRef, 'Required', formatSectionProgressCompact(sectionProgress)),
      createInfoRow(
        documentRef,
        'Completion group',
        getCompletionGroupLabel(pageDefinition?.completionGroupId, COMPLETION_GROUPS),
      ),
      createInfoRow(
        documentRef,
        'Context topic',
        contextTopicDefinition?.title ?? 'No registered context topic',
      ),
    );

    currentTitleBlock.append(currentKicker, currentTitle, currentSummary);
    currentHeader.appendChild(currentTitleBlock);
    currentSection.append(currentHeader, currentGrid);

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
        bodyText:
          'Accent color answers "where am I?". It follows the active page across chrome, sidebar markers, contextual docs, and the completion strip.',
        chips: [
          createChip(documentRef, pageDefinition?.pageCode ?? 'PAGE', { helpRole: 'context' }),
          createChip(documentRef, 'Reference', { helpRole: 'info' }),
          createChip(documentRef, 'About', { helpRole: 'info' }),
        ],
      }),
      createLegendCard({
        documentRef,
        titleText: 'Score scale',
        bodyText:
          'Criterion scores stay local to score controls and legends. They no longer double as page or workflow colors.',
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
        bodyText:
          'Workflow tags show editability; progress tags show completion or attention state. They overlay section context rather than replacing it.',
        chips: [
          createChip(documentRef, 'Editable', { workflowState: 'editable' }),
          createChip(documentRef, 'Read-only', { workflowState: 'read_only' }),
          createChip(documentRef, 'Skipped', { workflowState: 'system_skipped' }),
        ],
      }),
      createLegendCard({
        documentRef,
        titleText: 'Judgment state',
        bodyText:
          'Principle judgments are outcome states, not section colors. They stay contained inside their own controls and badges.',
        chips: [
          createChip(documentRef, 'Pass', { judgment: 'pass' }),
          createChip(documentRef, 'Conditional', { judgment: 'conditional_pass' }),
          createChip(documentRef, 'Fail', { judgment: 'fail' }),
        ],
      }),
      createLegendCard({
        documentRef,
        titleText: 'Recommendation state',
        bodyText:
          'Recommendation colors now match the decision meaning: positive, caveated, provisional, restricted, negative, or neutral.',
        chips: [
          createChip(documentRef, 'Recommended', { recommendationState: 'recommended' }),
          createChip(documentRef, 'Caveats', { recommendationState: 'recommended_with_caveats' }),
          createChip(documentRef, 'Needs review', {
            recommendationState: 'needs_review_provisional',
          }),
          createChip(documentRef, 'Pilot only', { recommendationState: 'pilot_only' }),
          createChip(documentRef, 'Not recommended', { recommendationState: 'not_recommended' }),
          createChip(documentRef, 'Out of scope', { recommendationState: 'out_of_scope' }),
        ],
      }),
    );

    legendSection.append(legendKicker, legendGrid);

    const shortcutsSection = documentRef.createElement('section');
    const shortcutsKicker = documentRef.createElement('p');
    const shortcutsTable = documentRef.createElement('table');

    shortcutsSection.className = 'help-panel-section';
    shortcutsKicker.className = 'workspace-title';
    shortcutsKicker.textContent = 'Keyboard shortcuts';

    shortcutsTable.style.cssText =
      'width:100%;border-collapse:collapse;font-size:var(--text-body);';
    shortcutsTable.setAttribute('role', 'table');

    const shortcutRows = [
      ['Alt + 1', 'Jump to Transparent (TR)'],
      ['Alt + 2', 'Jump to Reliable (RE)'],
      ['Alt + 3', 'Jump to User-centric (UC)'],
      ['Alt + 4', 'Jump to Secure (SE)'],
      ['Alt + 5', 'Jump to Traceable (TC)'],
      ['Alt + t', 'Jump to first page with code starting with T'],
      ['Alt + r', 'Jump to first page with code starting with R'],
      ['Alt + u', 'Jump to first page with code starting with U'],
      ['Alt + s', 'Jump to first page with code starting with S'],
      ['Alt + c', 'Jump to first page with code starting with C'],
      ['Escape', 'Close sidebar drawer'],
    ];

    shortcutRows.forEach(([key, action]) => {
      const row = documentRef.createElement('tr');
      row.style.cssText = 'border-bottom:1px solid var(--ut-border);';

      const keyCell = documentRef.createElement('td');
      keyCell.style.cssText =
        'padding:6px 10px;white-space:nowrap;font-family:var(--ff-mono);font-size:var(--text-sm);font-weight:700;color:var(--ut-navy);vertical-align:top;';
      keyCell.textContent = key;

      const actionCell = documentRef.createElement('td');
      actionCell.style.cssText =
        'padding:6px 10px;color:var(--ut-text);line-height:var(--lh-body);';
      actionCell.textContent = action;

      row.appendChild(keyCell);
      row.appendChild(actionCell);
      shortcutsTable.appendChild(row);
    });

    shortcutsSection.append(shortcutsKicker, shortcutsTable);

    const shell = documentRef.createElement('div');
    shell.className = 'help-panel-shell';
    shell.append(currentSection, legendSection, shortcutsSection);
    mount.appendChild(shell);
  };

  return {
    sync(state) {
      render(state);
    },
    destroy() {},
  };
};
