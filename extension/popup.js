const extensionApi = globalThis.chrome ?? null;

const MESSAGE_TYPES = Object.freeze({
  GET_POPUP_STATE: 'trust:get-popup-state',
  PAIR_EXTENSION: 'trust:pair-extension',
  REFRESH_CONTEXT: 'trust:refresh-context',
  GET_REVIEW_TARGETS: 'trust:get-review-targets',
  CAPTURE_CURRENT_TAB: 'trust:capture-current-tab',
  RETRY_QUEUE_ENTRY: 'trust:retry-queue-entry',
  REMOVE_QUEUE_ENTRY: 'trust:remove-queue-entry',
  REVOKE_SESSION: 'trust:revoke-session',
});

const EVIDENCE_TYPE_OPTIONS = Object.freeze([
  { value: 'screenshot', label: 'Screenshot' },
  { value: 'export', label: 'Tool export' },
  { value: 'document', label: 'Document / PDF' },
  { value: 'policy', label: 'Policy / terms' },
  { value: 'benchmark', label: 'Benchmark / source' },
  { value: 'other', label: 'Other' },
]);

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

const normalizeOrigin = (value) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return '';
  }

  try {
    const parsed = new URL(normalized.includes('://') ? normalized : `https://${normalized}`);
    return parsed.origin;
  } catch {
    return '';
  }
};

export const deriveDefaultReviewIdFromUrl = (value) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return '';
  }

  try {
    const parsed = new URL(normalized);
    const match = parsed.pathname.match(/^\/reviews\/([^/]+)(?:\/|$)/);
    return match?.[1] ? decodeURIComponent(match[1]) : '';
  } catch {
    return '';
  }
};

export const parseTargetValue = (value) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return null;
  }

  if (normalized === 'evaluation' || normalized === 'review_inbox') {
    return {
      scopeType: normalized,
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

export const buildCaptureCommand = ({
  reviewId,
  targetValue,
  evidenceType,
  note,
  includeScreenshot,
} = {}) => {
  const target = parseTargetValue(targetValue);

  if (!reviewId || !target || !normalizeText(evidenceType) || !normalizeText(note)) {
    return null;
  }

  return {
    reviewId,
    scopeType: target.scopeType,
    criterionCode: target.criterionCode,
    evidenceType: normalizeText(evidenceType),
    note: normalizeText(note),
    includeScreenshot: Boolean(includeScreenshot),
  };
};

const sendMessage = async (message) => {
  if (!extensionApi?.runtime?.sendMessage) {
    throw new Error('Chromium extension runtime is not available.');
  }

  const response = await extensionApi.runtime.sendMessage(message);

  if (!response?.ok) {
    const error = new Error(response?.error?.message || 'Extension request failed.');
    error.statusCode = response?.error?.statusCode ?? null;
    throw error;
  }

  return response.result;
};

const state = {
  popupState: null,
  reviewTargets: [],
  selectedReviewId: '',
  selectedTargetValue: '',
  banner: '',
  tone: 'info',
};

const resolveDefaultOrigin = (popupState) =>
  normalizeOrigin(popupState?.appOrigin || popupState?.currentTab?.url || '');

const resolveDefaultReviewId = (popupState) => {
  const currentTabReviewId = popupState?.currentTab?.reviewId ?? '';
  const reviewIds = new Set((popupState?.reviews ?? []).map((review) => String(review.id)));

  if (currentTabReviewId && reviewIds.has(String(currentTabReviewId))) {
    return String(currentTabReviewId);
  }

  return popupState?.reviews?.[0]?.id ? String(popupState.reviews[0].id) : '';
};

const renderQueueItems = (queue) => {
  if (!Array.isArray(queue) || queue.length === 0) {
    return '<div class="empty-state">No queued or completed captures yet.</div>';
  }

  return queue
    .map(
      (entry) => `
        <article class="queue-card" data-queue-entry="${escapeHtml(entry.id)}">
          <div class="row space-between align-start">
            <div>
              <div class="code">${escapeHtml(entry.captureRequest?.reviewId || 'review')}</div>
              <div class="meta">${escapeHtml(entry.pageContext?.title || entry.pageContext?.url || 'Captured page')}</div>
            </div>
            <span class="badge" data-status="${escapeHtml(entry.status)}">${escapeHtml(entry.status)}</span>
          </div>
          <div class="meta">${escapeHtml(entry.captureRequest?.scopeType || 'evaluation')} · ${escapeHtml(entry.captureRequest?.evidenceType || 'other')}</div>
          ${entry.errorMessage ? `<div class="notice error">${escapeHtml(entry.errorMessage)}</div>` : ''}
          <div class="row gap-sm">
            ${
              entry.status === 'failed_retryable' || entry.status === 'failed_auth'
                ? `<button type="button" class="button secondary" data-action="retry" data-entry-id="${escapeHtml(entry.id)}">Retry</button>`
                : ''
            }
            ${
              entry.status === 'completed' || entry.status.startsWith('failed_')
                ? `<button type="button" class="button secondary" data-action="remove" data-entry-id="${escapeHtml(entry.id)}">Remove</button>`
                : ''
            }
          </div>
        </article>
      `,
    )
    .join('');
};

const renderTargetOptions = (targets, selectedValue) => {
  const options = targets.map((target) => {
    const value =
      target.scopeType === 'criterion'
        ? `criterion:${target.criterionCode}`
        : target.scopeType;

    return `
      <option value="${escapeHtml(value)}" ${value === selectedValue ? 'selected' : ''}>
        ${escapeHtml(target.label)}
      </option>
    `;
  });

  return [`<option value="">Select destination</option>`, ...options].join('');
};

const renderReviewOptions = (reviews, selectedReviewId) =>
  reviews
    .map(
      (review) => `
        <option value="${escapeHtml(review.id)}" ${String(review.id) === String(selectedReviewId) ? 'selected' : ''}>
          ${escapeHtml(review.publicId || `R${review.id}`)} · ${escapeHtml(review.titleSnapshot || 'Untitled review')}
        </option>
      `,
    )
    .join('');

const renderEvidenceTypeOptions = (selectedValue) =>
  EVIDENCE_TYPE_OPTIONS.map(
    (option) => `
      <option value="${escapeHtml(option.value)}" ${option.value === selectedValue ? 'selected' : ''}>${escapeHtml(option.label)}</option>
    `,
  ).join('');

const render = () => {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.getElementById('popupRoot');

  if (!(root instanceof HTMLElement)) {
    return;
  }

  const popupState = state.popupState ?? {
    currentTab: { url: '', title: '', reviewId: '' },
    reviews: [],
    queue: [],
  };
  const paired = Boolean(popupState.session?.accessToken && popupState.appOrigin);
  const selectedReviewId = state.selectedReviewId;
  const selectedTargetValue = state.selectedTargetValue;

  root.innerHTML = `
    <section class="panel">
      <div class="panel-header">
        <div>
          <div class="kicker">Chromium pilot</div>
          <h1 class="title">TRUST capture</h1>
        </div>
        ${paired ? '<span class="badge" data-status="paired">paired</span>' : '<span class="badge" data-status="idle">unpaired</span>'}
      </div>
      ${state.banner ? `<div class="notice ${escapeHtml(state.tone)}">${escapeHtml(state.banner)}</div>` : ''}
      <div class="meta-block">
        <div><strong>Current tab</strong><br />${escapeHtml(popupState.currentTab?.title || 'Active tab')}</div>
        <div class="meta">${escapeHtml(popupState.currentTab?.url || '—')}</div>
      </div>
    </section>

    <section class="panel">
      <div class="section-title">Pairing</div>
      <form id="pairForm" class="stack">
        <label class="field">
          <span>App origin</span>
          <input type="url" name="appOrigin" value="${escapeHtml(resolveDefaultOrigin(popupState))}" placeholder="https://trust.example.edu" />
        </label>
        <label class="field">
          <span>Pairing code</span>
          <input type="text" name="pairingCode" placeholder="pair_..." />
        </label>
        <div class="row gap-sm">
          <button type="submit" class="button">Pair extension</button>
          ${paired ? '<button type="button" class="button secondary" id="revokeButton">Revoke</button>' : ''}
          ${paired ? '<button type="button" class="button secondary" id="refreshButton">Refresh</button>' : ''}
        </div>
      </form>
      ${
        paired
          ? `<div class="meta-block">
              <div><strong>User</strong><br />${escapeHtml(popupState.user?.displayName || popupState.user?.email || 'Paired user')}</div>
              <div class="meta">${escapeHtml(popupState.appOrigin)}</div>
            </div>`
          : '<div class="meta">Pair from the TRUST settings page using a one-time code. Host permission is requested for the chosen app origin only.</div>'
      }
    </section>

    <section class="panel">
      <div class="section-title">Capture</div>
      <form id="captureForm" class="stack">
        <label class="field">
          <span>Review</span>
          <select name="reviewId" ${paired ? '' : 'disabled'}>
            <option value="">Select review</option>
            ${renderReviewOptions(popupState.reviews ?? [], selectedReviewId)}
          </select>
        </label>
        <label class="field">
          <span>Destination</span>
          <select name="targetValue" ${paired ? '' : 'disabled'}>
            ${renderTargetOptions(state.reviewTargets, selectedTargetValue)}
          </select>
        </label>
        <label class="field">
          <span>Evidence type</span>
          <select name="evidenceType" ${paired ? '' : 'disabled'}>
            ${renderEvidenceTypeOptions('screenshot')}
          </select>
        </label>
        <label class="field">
          <span>Note</span>
          <textarea name="note" rows="3" ${paired ? '' : 'disabled'} placeholder="Explain why this capture matters."></textarea>
        </label>
        <label class="checkbox-row">
          <input type="checkbox" name="includeScreenshot" checked ${paired ? '' : 'disabled'} />
          <span>Include visible-tab screenshot</span>
        </label>
        <button type="submit" class="button" ${paired ? '' : 'disabled'}>Capture into selected review</button>
      </form>
      <div class="meta">Capture remains explicit, user-triggered, and limited to URL/title, selected text, note, and an optional visible-tab screenshot.</div>
    </section>

    <section class="panel">
      <div class="section-title">Queue</div>
      <div class="stack">${renderQueueItems(popupState.queue)}</div>
    </section>
  `;

  const pairForm = document.getElementById('pairForm');
  const captureForm = document.getElementById('captureForm');
  const revokeButton = document.getElementById('revokeButton');
  const refreshButton = document.getElementById('refreshButton');

  pairForm?.addEventListener('submit', handlePairSubmit);
  captureForm?.addEventListener('submit', handleCaptureSubmit);
  revokeButton?.addEventListener('click', handleRevokeClick);
  refreshButton?.addEventListener('click', handleRefreshClick);
  root.querySelectorAll('[data-action="retry"]').forEach((button) =>
    button.addEventListener('click', handleRetryClick),
  );
  root.querySelectorAll('[data-action="remove"]').forEach((button) =>
    button.addEventListener('click', handleRemoveClick),
  );
  captureForm
    ?.querySelector('select[name="reviewId"]')
    ?.addEventListener('change', handleReviewChange);
};

const refreshTargetsForSelection = async () => {
  if (!state.selectedReviewId) {
    state.reviewTargets = [];
    state.selectedTargetValue = '';
    render();
    return;
  }

  const payload = await sendMessage({
    type: MESSAGE_TYPES.GET_REVIEW_TARGETS,
    reviewId: state.selectedReviewId,
  });

  state.reviewTargets = payload.targets ?? [];
  state.selectedTargetValue = state.reviewTargets[0]
    ? state.reviewTargets[0].scopeType === 'criterion'
      ? `criterion:${state.reviewTargets[0].criterionCode}`
      : state.reviewTargets[0].scopeType
    : '';
  render();
};

const syncPopupState = async () => {
  state.popupState = await sendMessage({ type: MESSAGE_TYPES.GET_POPUP_STATE });
  state.selectedReviewId = resolveDefaultReviewId(state.popupState);
  await refreshTargetsForSelection();
};

const setBanner = (message, tone = 'info') => {
  state.banner = message;
  state.tone = tone;
};

async function handlePairSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);

  try {
    state.popupState = await sendMessage({
      type: MESSAGE_TYPES.PAIR_EXTENSION,
      payload: {
        appOrigin: String(formData.get('appOrigin') ?? ''),
        pairingCode: String(formData.get('pairingCode') ?? ''),
      },
    });
    state.selectedReviewId = resolveDefaultReviewId(state.popupState);
    setBanner('Extension paired successfully.', 'success');
    await refreshTargetsForSelection();
  } catch (error) {
    setBanner(error.message, 'error');
    render();
  }
}

async function handleCaptureSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const command = buildCaptureCommand({
    reviewId: String(formData.get('reviewId') ?? ''),
    targetValue: String(formData.get('targetValue') ?? ''),
    evidenceType: String(formData.get('evidenceType') ?? 'screenshot'),
    note: String(formData.get('note') ?? ''),
    includeScreenshot: formData.get('includeScreenshot') === 'on',
  });

  if (!command) {
    setBanner('Review, destination, evidence type, and note are all required.', 'error');
    render();
    return;
  }

  try {
    state.popupState = await sendMessage({
      type: MESSAGE_TYPES.CAPTURE_CURRENT_TAB,
      payload: command,
    });
    setBanner('Capture queued and processed through the shared backend.', 'success');
    state.selectedReviewId = command.reviewId;
    await refreshTargetsForSelection();
  } catch (error) {
    setBanner(error.message, 'error');
    render();
  }
}

async function handleReviewChange(event) {
  state.selectedReviewId = String(event.currentTarget.value ?? '');

  try {
    await refreshTargetsForSelection();
  } catch (error) {
    setBanner(error.message, 'error');
    render();
  }
}

async function handleRetryClick(event) {
  const entryId = event.currentTarget.dataset.entryId;

  try {
    state.popupState = await sendMessage({
      type: MESSAGE_TYPES.RETRY_QUEUE_ENTRY,
      entryId,
    });
    setBanner('Capture retry requested.', 'info');
    render();
  } catch (error) {
    setBanner(error.message, 'error');
    render();
  }
}

async function handleRemoveClick(event) {
  const entryId = event.currentTarget.dataset.entryId;

  try {
    state.popupState = await sendMessage({
      type: MESSAGE_TYPES.REMOVE_QUEUE_ENTRY,
      entryId,
    });
    setBanner('Queue entry removed.', 'info');
    render();
  } catch (error) {
    setBanner(error.message, 'error');
    render();
  }
}

async function handleRevokeClick() {
  try {
    state.popupState = await sendMessage({ type: MESSAGE_TYPES.REVOKE_SESSION });
    state.reviewTargets = [];
    state.selectedReviewId = '';
    state.selectedTargetValue = '';
    setBanner('Extension session revoked and host permission removed.', 'success');
    render();
  } catch (error) {
    setBanner(error.message, 'error');
    render();
  }
}

async function handleRefreshClick() {
  try {
    state.popupState = await sendMessage({ type: MESSAGE_TYPES.REFRESH_CONTEXT });
    state.selectedReviewId = resolveDefaultReviewId(state.popupState);
    setBanner('Popup context refreshed.', 'info');
    await refreshTargetsForSelection();
  } catch (error) {
    setBanner(error.message, 'error');
    render();
  }
}

const bootPopup = async () => {
  try {
    await syncPopupState();
    render();
  } catch (error) {
    setBanner(error.message, 'error');
    render();
  }
};

if (typeof document !== 'undefined') {
  void bootPopup();
}
