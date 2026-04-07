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

const buildTargetValue = (target) =>
  target?.scopeType === 'criterion'
    ? `criterion:${target.criterionCode}`
    : target?.scopeType === 'evaluation'
      ? 'evaluation'
      : '';

export const parseReviewInboxTargetValue = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : '';

  if (!normalized) {
    return null;
  }

  if (normalized === 'evaluation') {
    return {
      scopeType: 'evaluation',
      criterionCode: null,
    };
  }

  if (normalized.startsWith('criterion:')) {
    const criterionCode = normalized.slice('criterion:'.length).trim();

    if (!criterionCode) {
      return null;
    }

    return {
      scopeType: 'criterion',
      criterionCode,
    };
  }

  return null;
};

export const createReviewInboxViewModel = ({
  review,
  inbox,
  preferredTimeZone = 'UTC',
  feedbackState = null,
} = {}) => {
  const availableTargets = Array.isArray(inbox?.availableTargets) ? inbox.availableTargets : [];
  const targetOptions = availableTargets.map((target) => ({
    ...target,
    value: buildTargetValue(target),
  }));
  const defaultTargetValue = targetOptions[0]?.value ?? '';

  return {
    review,
    preferredTimeZone,
    feedbackState,
    summary: {
      itemCount: inbox?.summary?.itemCount ?? 0,
      targetCount: targetOptions.length,
    },
    items: (Array.isArray(inbox?.items) ? inbox.items : []).map((entry) => ({
      linkId: entry.link?.linkId,
      assetId: entry.link?.assetId,
      name:
        entry.asset?.originalName ??
        entry.asset?.sanitizedName ??
        entry.link?.assetId ??
        'Captured evidence',
      evidenceType: entry.link?.evidenceType ?? 'other',
      note: entry.link?.note ?? '',
      selectionText: entry.capture?.selectionText ?? '',
      originUrl: entry.capture?.originUrl ?? entry.asset?.originUrl ?? '',
      originTitle: entry.capture?.originTitle ?? entry.asset?.originTitle ?? '',
      capturedLabel: formatDateTime(
        entry.capture?.capturedAtClient ?? entry.asset?.capturedAtClient ?? entry.link?.linkedAt,
        preferredTimeZone,
      ),
      linkedLabel: formatDateTime(entry.link?.linkedAt, preferredTimeZone),
      browserLabel: [entry.capture?.browserName, entry.capture?.browserVersion]
        .filter(Boolean)
        .join(' '),
      extensionVersion: entry.capture?.extensionVersion ?? '',
      downloadUrl: entry.asset?.downloadUrl ?? '',
      targetOptions,
      defaultTargetValue,
    })),
  };
};
