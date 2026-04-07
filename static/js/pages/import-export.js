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

export const createImportExportViewModel = ({
  review,
  exports = [],
  imports = [],
  preferredTimeZone = 'UTC',
  exportState = null,
  importState = null,
} = {}) => ({
  review,
  exports: exports.map((entry) => ({
    ...entry,
    createdLabel: formatDateTime(entry.createdAt, preferredTimeZone),
    completedLabel: formatDateTime(entry.completedAt, preferredTimeZone),
    downloadUrl:
      entry.downloadUrl ??
      `/api/evaluations/${encodeURIComponent(String(review.id))}/exports/${encodeURIComponent(String(entry.jobId))}/download`,
  })),
  imports: imports.map((entry) => ({
    ...entry,
    createdLabel: formatDateTime(entry.createdAt, preferredTimeZone),
  })),
  preferredTimeZone,
  exportState,
  importState,
});
