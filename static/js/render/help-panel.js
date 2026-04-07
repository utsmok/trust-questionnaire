import {
  COMPLETION_GROUPS,
  SECTION_WORKFLOW_STATES,
  getContentTopicDefinition,
  getSectionDefinition,
} from '../config/sections.js';
import { GLOBAL_SHORTCUTS } from '../config/shortcut-registry.js';
import {
  HELP_LEGEND_CARD_REGISTRY,
  HELP_SURFACE_SECTIONS,
  getGuidanceTopicDefinition,
} from '../content/guidance-topics.js';
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

const formatShortcutCombo = (combo) => {
  const parts = [];

  if (combo.ctrlKey) parts.push('Ctrl');
  if (combo.altKey) parts.push('Alt');
  if (combo.shiftKey) parts.push('Shift');
  if (combo.metaKey) parts.push('Meta');

  parts.push(combo.key.length === 1 ? combo.key.toUpperCase() : combo.key);
  return parts.join(' + ');
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
    const guidanceTopic = pageDefinition?.contextTopicId
      ? getGuidanceTopicDefinition(pageDefinition.contextTopicId)
      : null;
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
      guidanceTopic?.summary ??
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
      ...HELP_LEGEND_CARD_REGISTRY.map((card) =>
        createLegendCard({
          documentRef,
          titleText: card.title,
          bodyText: card.body,
          chips: card.chips.map((chip) => createChip(documentRef, chip.label, chip.dataset)),
        }),
      ),
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

    const shortcutRows = GLOBAL_SHORTCUTS.map((shortcut) => [
      shortcut.combos.map(formatShortcutCombo).join(' / '),
      shortcut.description,
    ]);

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

    const overviewSection = documentRef.createElement('section');
    overviewSection.className = 'help-panel-section';
    const overviewKicker = documentRef.createElement('p');
    overviewKicker.className = 'workspace-title';
    overviewKicker.textContent = 'Shared help route';
    overviewSection.appendChild(overviewKicker);

    HELP_SURFACE_SECTIONS.forEach((topic) => {
      const paragraph = documentRef.createElement('p');
      paragraph.textContent = topic.paragraphs?.[0] ?? topic.summary ?? topic.title;
      overviewSection.appendChild(paragraph);
    });

    const shell = documentRef.createElement('div');
    shell.className = 'help-panel-shell';
    shell.append(currentSection, legendSection, shortcutsSection, overviewSection);
    mount.appendChild(shell);
  };

  return {
    sync(state) {
      render(state);
    },
    destroy() {},
  };
};
