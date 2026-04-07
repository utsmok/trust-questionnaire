import { SECTION_REGISTRY } from '../config/sections.js';
import {
  GUIDANCE_TOPIC_REGISTRY,
  HELP_LEGEND_CARD_REGISTRY,
  HELP_SURFACE_SECTIONS,
} from '../content/guidance-topics.js';
import { REFERENCE_TOPIC_REGISTRY } from '../content/reference-topics.js';
import { ABOUT_TOPIC_REGISTRY } from '../content/about-topics.js';
import { GLOBAL_SHORTCUTS } from '../config/shortcut-registry.js';

const formatShortcutCombo = (combo) => {
  const parts = [];

  if (combo.ctrlKey) parts.push('Ctrl');
  if (combo.altKey) parts.push('Alt');
  if (combo.shiftKey) parts.push('Shift');
  if (combo.metaKey) parts.push('Meta');

  const key = combo.key.length === 1 ? combo.key.toUpperCase() : combo.key;
  parts.push(key);
  return parts.join(' + ');
};

const getPageSummariesForTopic = (topic) =>
  SECTION_REGISTRY.filter((section) => (topic.pageIds ?? []).includes(section.id)).map(
    (section) => ({
      id: section.id,
      pageCode: section.pageCode,
      title: section.title,
      accentKey: section.accentKey,
    }),
  );

export const createHelpViewModel = ({ route = null } = {}) => ({
  route,
  title: 'Help, reference, and framework topics',
  description:
    'Shared Help, Reference, and About material is rendered from structured registries and reused between the app shell and the review workspace. Page-local guidance stays in the workspace Guidance tab.',
  overviewSections: HELP_SURFACE_SECTIONS,
  legendCards: HELP_LEGEND_CARD_REGISTRY,
  shortcuts: GLOBAL_SHORTCUTS.map((shortcut) => ({
    commandId: shortcut.commandId,
    description: shortcut.description,
    scope: shortcut.scope,
    combos: shortcut.combos.map(formatShortcutCombo),
  })),
  guidanceTopics: GUIDANCE_TOPIC_REGISTRY.map((topic) => ({
    ...topic,
    relatedPages: getPageSummariesForTopic(topic),
  })),
  referenceTopics: REFERENCE_TOPIC_REGISTRY,
  aboutTopics: ABOUT_TOPIC_REGISTRY,
});
