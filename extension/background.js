const extensionApi = globalThis.chrome ?? null;

export const STORAGE_KEYS = Object.freeze({
  APP_ORIGIN: 'trust.appOrigin',
  SESSION: 'trust.session',
  QUEUE: 'trust.queue',
});

export const QUEUE_STATUS = Object.freeze({
  QUEUED: 'queued',
  UPLOADING: 'uploading',
  AWAITING_FINALIZE: 'awaiting_finalize',
  COMPLETED: 'completed',
  FAILED_RETRYABLE: 'failed_retryable',
  FAILED_AUTH: 'failed_auth',
  FAILED_POLICY: 'failed_policy',
});

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

const CONTENT_SCRIPT_MESSAGE = 'trust:capture-context';
const ORIGIN_PERMISSION_SUFFIX = '/*';

const normalizeText = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
};

export const normalizeAppOrigin = (value) => {
  const normalized = normalizeText(value);

  if (!normalized) {
    return '';
  }

  try {
    const parsed = new URL(normalized.includes('://') ? normalized : `https://${normalized}`);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }

    return parsed.origin;
  } catch {
    return '';
  }
};

const buildOriginPermission = (origin) => {
  const normalizedOrigin = normalizeAppOrigin(origin);
  return normalizedOrigin ? `${normalizedOrigin}${ORIGIN_PERMISSION_SUFFIX}` : '';
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

const createQueueId = () =>
  typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const getManifestVersion = () => extensionApi?.runtime?.getManifest?.().version ?? '0.0.0';

const getBrowserVersion = () => {
  const userAgent = globalThis.navigator?.userAgent ?? '';
  const match = userAgent.match(/(?:Chrome|Chromium)\/(\d+(?:\.\d+)*)/i);
  return match?.[1] ?? 'unknown';
};

const dataUrlToByteSize = (dataUrl) => {
  const normalized = normalizeText(dataUrl);

  if (!normalized) {
    return 0;
  }

  const parts = normalized.split(',');
  const base64 = parts[1] ?? '';
  const trimmed = base64.replace(/\s+/g, '');

  return Math.floor((trimmed.length * 3) / 4) - (trimmed.endsWith('==') ? 2 : trimmed.endsWith('=') ? 1 : 0);
};

export const deriveAssetKind = ({ includeScreenshot = true, selectionText = '' } = {}) => {
  if (includeScreenshot) {
    return 'image';
  }

  return normalizeText(selectionText) ? 'selection' : 'metadata_only';
};

const buildCaptureFilename = ({ assetKind, capturedAtClient } = {}) => {
  const stamp = normalizeText(capturedAtClient).replaceAll(':', '-').replaceAll('.', '-');

  if (assetKind === 'image') {
    return `capture-${stamp}.png`;
  }

  if (assetKind === 'selection') {
    return `selection-${stamp}.txt`;
  }

  return `page-capture-${stamp}.json`;
};

export const classifyQueueFailure = (error) => {
  const statusCode = Number(error?.statusCode);

  if (statusCode === 401) {
    return QUEUE_STATUS.FAILED_AUTH;
  }

  if (statusCode === 400 || statusCode === 403 || statusCode === 404 || statusCode === 409) {
    return QUEUE_STATUS.FAILED_POLICY;
  }

  return QUEUE_STATUS.FAILED_RETRYABLE;
};

export const normalizePersistedQueue = (queue = []) =>
  (Array.isArray(queue) ? queue : []).map((entry) => {
    if (entry.status === QUEUE_STATUS.UPLOADING || entry.status === QUEUE_STATUS.AWAITING_FINALIZE) {
      return {
        ...entry,
        status: QUEUE_STATUS.FAILED_RETRYABLE,
        errorMessage: 'The background worker restarted before the capture completed. Retry explicitly.',
      };
    }

    return entry;
  });

export const createQueueEntry = ({
  appOrigin,
  captureRequest,
  pageContext,
  screenshotDataUrl = '',
} = {}) => ({
  id: createQueueId(),
  appOrigin,
  status: QUEUE_STATUS.QUEUED,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  errorMessage: '',
  attemptCount: 0,
  remoteCaptureId: '',
  remotePhase: 'queued',
  result: null,
  captureRequest,
  pageContext,
  screenshotDataUrl,
});

const hasExtensionRuntime = () =>
  Boolean(
    extensionApi?.runtime?.onMessage?.addListener &&
      extensionApi?.storage?.local &&
      extensionApi?.tabs &&
      extensionApi?.scripting,
  );

const readStorageState = async () => {
  const stored = await extensionApi.storage.local.get([
    STORAGE_KEYS.APP_ORIGIN,
    STORAGE_KEYS.SESSION,
    STORAGE_KEYS.QUEUE,
  ]);

  return {
    appOrigin: normalizeAppOrigin(stored[STORAGE_KEYS.APP_ORIGIN]),
    session: stored[STORAGE_KEYS.SESSION] ?? null,
    queue: normalizePersistedQueue(stored[STORAGE_KEYS.QUEUE] ?? []),
  };
};

const writeStorageState = async ({ appOrigin, session, queue } = {}) => {
  const nextState = {};

  if (appOrigin !== undefined) {
    nextState[STORAGE_KEYS.APP_ORIGIN] = appOrigin;
  }

  if (session !== undefined) {
    nextState[STORAGE_KEYS.SESSION] = session;
  }

  if (queue !== undefined) {
    nextState[STORAGE_KEYS.QUEUE] = queue;
  }

  await extensionApi.storage.local.set(nextState);
};

const updateQueueEntry = async (entryId, updater) => {
  const state = await readStorageState();
  const nextQueue = state.queue.map((entry) =>
    entry.id === entryId ? { ...entry, ...updater(entry), updatedAt: new Date().toISOString() } : entry,
  );

  await writeStorageState({ queue: nextQueue });
  return nextQueue.find((entry) => entry.id === entryId) ?? null;
};

const removeQueueEntry = async (entryId) => {
  const state = await readStorageState();
  const nextQueue = state.queue.filter((entry) => entry.id !== entryId);
  await writeStorageState({ queue: nextQueue });
};

const getActiveTab = async () => {
  const tabs = await extensionApi.tabs.query({ active: true, currentWindow: true });
  return tabs[0] ?? null;
};

const ensureAppOriginPermission = async (appOrigin) => {
  const originPermission = buildOriginPermission(appOrigin);

  if (!originPermission) {
    throw new Error('A valid application origin is required.');
  }

  const granted = await extensionApi.permissions.request({ origins: [originPermission] });

  if (!granted) {
    throw new Error('Permission to reach the selected TRUST application origin was not granted.');
  }
};

const removeAppOriginPermission = async (appOrigin) => {
  const originPermission = buildOriginPermission(appOrigin);

  if (!originPermission) {
    return;
  }

  await extensionApi.permissions.remove({ origins: [originPermission] }).catch(() => {});
};

const readJson = async (response) => {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const payload = await readJson(response);

  if (!response.ok) {
    const error = new Error(payload?.message || `Request failed with status ${response.status}.`);
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

const refreshStoredSession = async (state) => {
  if (!state.appOrigin || !state.session?.refreshToken) {
    const error = new Error('The paired extension session has expired. Pair again from the main app.');
    error.statusCode = 401;
    throw error;
  }

  const refreshed = await fetchJson(`${state.appOrigin}/api/extension/session/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      refreshToken: state.session.refreshToken,
    }),
  });
  const session = {
    ...state.session,
    sessionId: refreshed.session.sessionId,
    accessToken: refreshed.accessToken,
    accessExpiresAt: refreshed.accessExpiresAt,
    refreshToken: refreshed.refreshToken,
    refreshExpiresAt: refreshed.refreshExpiresAt,
    pairedAt: refreshed.session.pairedAt,
    clientName: refreshed.session.clientName,
    browserName: refreshed.session.browserName,
    browserVersion: refreshed.session.browserVersion,
    extensionVersion: refreshed.session.extensionVersion,
    scopes: refreshed.session.scopes,
  };

  await writeStorageState({ session });
  return session;
};

const authenticatedFetchJson = async (path, options = {}) => {
  const state = await readStorageState();

  if (!state.appOrigin || !state.session?.accessToken) {
    const error = new Error('The extension is not paired to a TRUST application.');
    error.statusCode = 401;
    throw error;
  }

  const makeRequest = async (accessToken) =>
    fetchJson(`${state.appOrigin}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
      },
    });

  try {
    return await makeRequest(state.session.accessToken);
  } catch (error) {
    if (error.statusCode !== 401) {
      throw error;
    }

    const refreshedSession = await refreshStoredSession(state);
  return makeRequest(refreshedSession.accessToken);
   }
 };

const injectContentScript = async (tabId) => {
  await extensionApi.scripting.executeScript({
    target: { tabId },
    files: ['content-script.js'],
  });
};

const collectPageContext = async (tab) => {
  if (!tab?.id) {
    throw new Error('An active tab is required for capture.');
  }

  await injectContentScript(tab.id);

  const response = await extensionApi.tabs.sendMessage(tab.id, {
    type: CONTENT_SCRIPT_MESSAGE,
  });

  return {
    url: response?.url ?? tab.url ?? '',
    title: response?.title ?? tab.title ?? '',
    selectionText: response?.selectionText ?? '',
    pageLanguage: response?.pageLanguage ?? '',
  };
};

const captureScreenshot = async (tab) => {
  if (!tab?.windowId) {
    return '';
  }

  return extensionApi.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
};

const buildCaptureEnvelope = ({ captureRequest, pageContext, screenshotDataUrl }) => {
  const capturedAtClient = new Date().toISOString();
  const selectionText = normalizeText(pageContext.selectionText);
  const includeScreenshot = Boolean(captureRequest.includeScreenshot);
  const assetKind = deriveAssetKind({
    includeScreenshot,
    selectionText,
  });

  return {
    evaluationId: Number(captureRequest.reviewId),
    scopeType: captureRequest.scopeType,
    criterionCode: captureRequest.criterionCode || null,
    evidenceType: captureRequest.evidenceType,
    note: captureRequest.note,
    assetKind,
    originalName: buildCaptureFilename({ assetKind, capturedAtClient }),
    mimeType: includeScreenshot ? 'image/png' : assetKind === 'selection' ? 'text/plain' : 'application/json',
    sizeBytes: includeScreenshot ? dataUrlToByteSize(screenshotDataUrl) : null,
    capturedAtClient,
    originUrl: pageContext.url,
    originTitle: pageContext.title,
    selectionText,
    browserName: 'Chromium',
    browserVersion: getBrowserVersion(),
    extensionVersion: getManifestVersion(),
    pageLanguage: pageContext.pageLanguage,
  };
};

const processQueueEntry = async (entryId) => {
  let queueEntry = await updateQueueEntry(entryId, (entry) => ({
    ...entry,
    status: QUEUE_STATUS.UPLOADING,
    errorMessage: '',
    attemptCount: (entry.attemptCount ?? 0) + 1,
  }));

  if (!queueEntry) {
    return null;
  }

  try {
    if (!queueEntry.remoteCaptureId) {
      const initialized = await authenticatedFetchJson('/api/captures/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          buildCaptureEnvelope({
            captureRequest: queueEntry.captureRequest,
            pageContext: queueEntry.pageContext,
            screenshotDataUrl: queueEntry.screenshotDataUrl,
          }),
        ),
      });

      queueEntry = await updateQueueEntry(entryId, () => ({
        remoteCaptureId: initialized.capture.captureId,
        remotePhase: 'initialized',
      }));
    }

    if (queueEntry?.remotePhase === 'initialized') {
      await authenticatedFetchJson(`/api/captures/${queueEntry.remoteCaptureId}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          queueEntry.screenshotDataUrl
            ? { dataUrl: queueEntry.screenshotDataUrl }
            : {},
        ),
      });

      queueEntry = await updateQueueEntry(entryId, () => ({
        status: QUEUE_STATUS.AWAITING_FINALIZE,
        remotePhase: 'uploaded',
      }));
    }

    if (queueEntry?.remotePhase === 'uploaded') {
      const finalized = await authenticatedFetchJson(`/api/captures/${queueEntry.remoteCaptureId}/finalize`, {
        method: 'POST',
      });

      queueEntry = await updateQueueEntry(entryId, () => ({
        status: QUEUE_STATUS.COMPLETED,
        remotePhase: 'finalized',
        result: {
          captureId: finalized.capture.captureId,
          assetId: finalized.asset?.assetId ?? '',
          linkId: finalized.link?.linkId ?? '',
          scopeType: finalized.link?.scopeType ?? '',
          criterionCode: finalized.link?.criterionCode ?? '',
        },
      }));
    }

    return queueEntry;
  } catch (error) {
    return updateQueueEntry(entryId, () => ({
      status: classifyQueueFailure(error),
      errorMessage: error.message,
    }));
  }
};

const loadReviewTargets = async (reviewId) =>
  authenticatedFetchJson(`/api/captures/reviews/${encodeURIComponent(String(reviewId))}/targets`);

const getPopupState = async () => {
  const state = await readStorageState();
  const activeTab = await getActiveTab();
  const currentTabReviewId = deriveDefaultReviewIdFromUrl(activeTab?.url ?? '');
  let context = {
    user: null,
    reviews: [],
  };

  if (state.appOrigin && state.session?.accessToken) {
    try {
      context = await authenticatedFetchJson('/api/captures/reviews');
    } catch (error) {
      if (classifyQueueFailure(error) === QUEUE_STATUS.FAILED_AUTH) {
        context = {
          user: null,
          reviews: [],
          errorMessage: error.message,
        };
      } else {
        throw error;
      }
    }
  }

  return {
    appOrigin: state.appOrigin,
    session: state.session,
    queue: state.queue,
    currentTab: {
      id: activeTab?.id ?? null,
      url: activeTab?.url ?? '',
      title: activeTab?.title ?? '',
      reviewId: currentTabReviewId,
    },
    user: context.user ?? null,
    reviews: context.reviews ?? [],
    errorMessage: context.errorMessage ?? '',
  };
};

const pairExtension = async ({ appOrigin, pairingCode } = {}) => {
  const normalizedOrigin = normalizeAppOrigin(appOrigin);
  const normalizedPairingCode = normalizeText(pairingCode);

  if (!normalizedOrigin || !normalizedPairingCode) {
    throw new Error('Both application origin and pairing code are required.');
  }

  await ensureAppOriginPermission(normalizedOrigin);

  const exchanged = await fetchJson(`${normalizedOrigin}/api/extension/pair/exchange`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      pairingCode: normalizedPairingCode,
      clientName: 'Chromium pilot capture client',
      browserName: 'Chromium',
      browserVersion: getBrowserVersion(),
      extensionVersion: getManifestVersion(),
    }),
  });
  const session = {
    sessionId: exchanged.session.sessionId,
    pairedAt: exchanged.session.pairedAt,
    clientName: exchanged.session.clientName,
    browserName: exchanged.session.browserName,
    browserVersion: exchanged.session.browserVersion,
    extensionVersion: exchanged.session.extensionVersion,
    scopes: exchanged.session.scopes,
    accessToken: exchanged.accessToken,
    accessExpiresAt: exchanged.accessExpiresAt,
    refreshToken: exchanged.refreshToken,
    refreshExpiresAt: exchanged.refreshExpiresAt,
  };

  await writeStorageState({
    appOrigin: normalizedOrigin,
    session,
  });

  return getPopupState();
};

const revokeSession = async () => {
  const state = await readStorageState();

  if (state.session?.accessToken && state.appOrigin) {
    await fetch(`${state.appOrigin}/api/extension/session/current`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${state.session.accessToken}`,
      },
    }).catch(() => {});
  }

  await removeAppOriginPermission(state.appOrigin);
  await writeStorageState({
    appOrigin: '',
    session: null,
    queue: [],
  });

  return getPopupState();
};

const enqueueCaptureFromActiveTab = async (payload = {}) => {
  const activeTab = await getActiveTab();

  if (!activeTab?.id) {
    throw new Error('No active tab is available for capture.');
  }

  const pageContext = await collectPageContext(activeTab);
  const screenshotDataUrl = payload.includeScreenshot ? await captureScreenshot(activeTab) : '';
  const state = await readStorageState();
  const queueEntry = createQueueEntry({
    appOrigin: state.appOrigin,
    captureRequest: payload,
    pageContext,
    screenshotDataUrl,
  });
  const nextQueue = [...state.queue, queueEntry];

  await writeStorageState({ queue: nextQueue });
  await processQueueEntry(queueEntry.id);
   return getPopupState();
 };

const handleMessage = async (message) => {
  switch (message?.type) {
    case MESSAGE_TYPES.GET_POPUP_STATE:
      return getPopupState();
    case MESSAGE_TYPES.PAIR_EXTENSION:
      return pairExtension(message.payload ?? {});
    case MESSAGE_TYPES.REFRESH_CONTEXT:
      return getPopupState();
    case MESSAGE_TYPES.GET_REVIEW_TARGETS:
      return loadReviewTargets(message.reviewId);
    case MESSAGE_TYPES.CAPTURE_CURRENT_TAB:
      return enqueueCaptureFromActiveTab(message.payload ?? {});
    case MESSAGE_TYPES.RETRY_QUEUE_ENTRY:
      await processQueueEntry(message.entryId);
      return getPopupState();
    case MESSAGE_TYPES.REMOVE_QUEUE_ENTRY:
      await removeQueueEntry(message.entryId);
      return getPopupState();
    case MESSAGE_TYPES.REVOKE_SESSION:
      return revokeSession();
    default:
      return null;
  }
};

if (hasExtensionRuntime()) {
  extensionApi.runtime.onMessage.addListener((message, sender, sendResponse) => {
    void sender;
    handleMessage(message)
      .then((result) => sendResponse({ ok: true, result }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: {
            message: error.message,
            statusCode: error.statusCode ?? null,
          },
        }),
      );

    return true;
  });
}
