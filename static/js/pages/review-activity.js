import { CRITERIA } from '../config/questionnaire-schema.js';
import { SECTION_REGISTRY } from '../config/sections.js';

const formatDateTime = (value, timeZone = 'UTC') => {
  const timestamp = Date.parse(value ?? '');

  if (!Number.isFinite(timestamp)) {
    return '—';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(timestamp);
};

const formatScopeLabel = (entry) => {
  if (entry.scopeType === 'criterion') {
    return `${entry.criterionCode} · criterion`;
  }

  if (entry.scopeType === 'section') {
    return `${entry.sectionId} · section`;
  }

  return 'Review';
};

const mergeTimelineEntries = ({ comments = [], auditEvents = [], timeZone = 'UTC' } = {}) =>
  [...comments, ...auditEvents]
    .map((entry) => ({
      ...entry,
      dateLabel: formatDateTime(entry.createdAt, timeZone),
      scopeLabel: formatScopeLabel(entry),
    }))
    .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));

export const createReviewActivityViewModel = ({
  review,
  comments = [],
  auditEvents = [],
  preferredTimeZone = 'UTC',
  formState = null,
} = {}) => ({
  review,
  comments,
  auditEvents,
  timeline: mergeTimelineEntries({ comments, auditEvents, timeZone: preferredTimeZone }),
  preferredTimeZone,
  formState,
  scopeOptions: [
    { value: 'review', label: 'Review' },
    { value: 'section', label: 'Section' },
    { value: 'criterion', label: 'Criterion' },
  ],
  sectionOptions: SECTION_REGISTRY.map((section) => ({
    value: section.id,
    label: `${section.pageCode ?? section.id} · ${section.title}`,
  })),
  criterionOptions: CRITERIA.map((criterion) => ({
    value: criterion.code,
    label: `${criterion.code} · ${criterion.label}`,
  })),
});
