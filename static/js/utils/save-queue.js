export const REVIEW_SAVE_STATES = Object.freeze({
  CLEAN: 'clean',
  DIRTY: 'dirty',
  SAVING: 'saving',
  SAVED: 'saved',
  SAVE_FAILED: 'save_failed',
  CONFLICT: 'conflict',
  OFFLINE_UNSAVED: 'offline_unsaved',
});

export const REVIEW_SAVE_REASONS = Object.freeze({
  AUTOSAVE: 'autosave',
  MANUAL_SAVE: 'manual_save',
  ROUTE_LEAVE_FLUSH: 'route_leave_flush',
  VISIBILITY_FLUSH: 'visibility_flush',
  CONFLICT_RECOVERY_SAVE: 'conflict_recovery_save',
});

const DEFAULT_TIMINGS = Object.freeze({
  idleMs: 10000,
  maxDirtyMs: 60000,
  savedStateMs: 2500,
});

const SAVE_REASON_PRIORITY = Object.freeze({
  autosave: 0,
  visibility_flush: 1,
  route_leave_flush: 2,
  manual_save: 3,
  conflict_recovery_save: 4,
});

const resolveReason = (currentReason, nextReason) => {
  if (!currentReason) {
    return nextReason;
  }

  if (!nextReason) {
    return currentReason;
  }

  return (SAVE_REASON_PRIORITY[nextReason] ?? 0) >= (SAVE_REASON_PRIORITY[currentReason] ?? 0)
    ? nextReason
    : currentReason;
};

const cloneReviewEnvelope = (review, cloneSnapshot) => {
  if (!review) {
    return null;
  }

  return {
    ...review,
    currentState: cloneSnapshot(review.currentState),
  };
};

export const createReviewSaveQueue = ({
  review,
  cloneSnapshot,
  areSnapshotsEqual,
  saveSnapshot,
  onStateChange = () => {},
  onReviewAccepted = () => {},
  windowRef = window,
  documentRef = windowRef?.document ?? document,
  timings = {},
} = {}) => {
  const resolvedTimings = {
    ...DEFAULT_TIMINGS,
    ...Object.fromEntries(
      Object.entries(timings ?? {}).filter(([, value]) => Number.isFinite(value) && value >= 0),
    ),
  };

  let latestSnapshot = cloneSnapshot(review.currentState);
  let authoritativeSnapshot = cloneSnapshot(review.currentState);
  let currentEtag = review.etag;
  let currentRevisionNumber = review.currentRevisionNumber;
  let lastSavedAt = review.updatedAt || review.createdAt || null;
  let status = REVIEW_SAVE_STATES.CLEAN;
  let dirtySince = null;
  let errorMessage = '';
  let conflictReview = null;
  let inFlight = false;
  let queuedSaveReason = null;
  let drainPromise = null;
  let idleTimer = null;
  let maxDirtyTimer = null;
  let savedIndicatorTimer = null;
  let destroyed = false;

  const hasUnsavedChanges = () => !areSnapshotsEqual(latestSnapshot, authoritativeSnapshot);

  const clearTimer = (timerId) => {
    if (timerId !== null) {
      windowRef.clearTimeout(timerId);
    }

    return null;
  };

  const clearScheduledSaves = () => {
    idleTimer = clearTimer(idleTimer);
    maxDirtyTimer = clearTimer(maxDirtyTimer);
  };

  const clearSavedIndicatorTimer = () => {
    savedIndicatorTimer = clearTimer(savedIndicatorTimer);
  };

  const buildState = () => ({
    status,
    etag: currentEtag,
    revisionNumber: currentRevisionNumber,
    lastSavedAt,
    dirtySince,
    hasUnsavedChanges: hasUnsavedChanges(),
    isSaving: inFlight,
    errorMessage,
    conflictReview: cloneReviewEnvelope(conflictReview, cloneSnapshot),
  });

  const emitStateChange = () => {
    onStateChange(buildState());
  };

  const setStatus = (nextStatus, { preserveError = false } = {}) => {
    status = nextStatus;

    if (
      !preserveError &&
      nextStatus !== REVIEW_SAVE_STATES.SAVE_FAILED &&
      nextStatus !== REVIEW_SAVE_STATES.OFFLINE_UNSAVED
    ) {
      errorMessage = '';
    }

    emitStateChange();
  };

  const scheduleCleanIndicator = () => {
    clearSavedIndicatorTimer();
    savedIndicatorTimer = windowRef.setTimeout(() => {
      savedIndicatorTimer = null;

      if (destroyed || status !== REVIEW_SAVE_STATES.SAVED || hasUnsavedChanges()) {
        return;
      }

      setStatus(REVIEW_SAVE_STATES.CLEAN);
    }, resolvedTimings.savedStateMs);
  };

  const scheduleAutosave = () => {
    clearScheduledSaves();

    if (destroyed || inFlight || status === REVIEW_SAVE_STATES.CONFLICT || !hasUnsavedChanges()) {
      return;
    }

    if (dirtySince === null) {
      dirtySince = Date.now();
    }

    idleTimer = windowRef.setTimeout(() => {
      idleTimer = null;
      void flush({ saveReason: REVIEW_SAVE_REASONS.AUTOSAVE });
    }, resolvedTimings.idleMs);

    const dirtyAge = Math.max(Date.now() - dirtySince, 0);
    maxDirtyTimer = windowRef.setTimeout(
      () => {
        maxDirtyTimer = null;
        void flush({ saveReason: REVIEW_SAVE_REASONS.AUTOSAVE });
      },
      Math.max(resolvedTimings.maxDirtyMs - dirtyAge, 0),
    );
  };

  const classifyFailureStatus = (error) => {
    const isOffline =
      windowRef.navigator?.onLine === false ||
      error?.statusCode === 0 ||
      error?.name === 'TypeError';

    return isOffline ? REVIEW_SAVE_STATES.OFFLINE_UNSAVED : REVIEW_SAVE_STATES.SAVE_FAILED;
  };

  const performSave = async (saveReason) => {
    if (destroyed || status === REVIEW_SAVE_STATES.CONFLICT || !hasUnsavedChanges()) {
      return { kind: 'noop' };
    }

    inFlight = true;
    clearScheduledSaves();
    clearSavedIndicatorTimer();
    setStatus(REVIEW_SAVE_STATES.SAVING);

    try {
      const payload = await saveSnapshot(cloneSnapshot(latestSnapshot), {
        etag: currentEtag,
        saveReason,
      });
      const acceptedReview = payload.review;

      authoritativeSnapshot = cloneSnapshot(acceptedReview.currentState);
      currentEtag = acceptedReview.etag;
      currentRevisionNumber = acceptedReview.currentRevisionNumber;
      lastSavedAt = acceptedReview.updatedAt || acceptedReview.createdAt || lastSavedAt;
      conflictReview = null;
      errorMessage = '';
      onReviewAccepted(cloneReviewEnvelope(acceptedReview, cloneSnapshot), { source: 'save' });

      inFlight = false;

      if (hasUnsavedChanges()) {
        setStatus(REVIEW_SAVE_STATES.DIRTY);
        scheduleAutosave();
        return { kind: 'updated', review: acceptedReview, pendingChanges: true };
      }

      dirtySince = null;
      setStatus(REVIEW_SAVE_STATES.SAVED);
      scheduleCleanIndicator();
      return { kind: 'updated', review: acceptedReview, pendingChanges: false };
    } catch (error) {
      inFlight = false;

      if (error?.statusCode === 412 && error?.payload?.review) {
        conflictReview = cloneReviewEnvelope(error.payload.review, cloneSnapshot);
        errorMessage = error.message;
        setStatus(REVIEW_SAVE_STATES.CONFLICT, { preserveError: true });
        return { kind: 'conflict', review: conflictReview };
      }

      errorMessage = error?.message ?? 'Save failed.';
      const nextStatus = classifyFailureStatus(error);
      setStatus(nextStatus, { preserveError: true });

      if (nextStatus === REVIEW_SAVE_STATES.OFFLINE_UNSAVED) {
        scheduleAutosave();
      }

      return { kind: 'error', error };
    }
  };

  const takeQueuedSaveReason = () => {
    const nextReason = queuedSaveReason;
    queuedSaveReason = null;
    return nextReason;
  };

  const drainQueue = async () => {
    if (drainPromise) {
      return drainPromise;
    }

    drainPromise = (async () => {
      while (!destroyed) {
        if (status === REVIEW_SAVE_STATES.CONFLICT) {
          return { kind: 'conflict' };
        }

        const nextReason = takeQueuedSaveReason();

        if (!nextReason && !hasUnsavedChanges()) {
          return { kind: 'noop' };
        }

        const result = await performSave(nextReason ?? REVIEW_SAVE_REASONS.AUTOSAVE);

        if (result.kind !== 'updated' || !hasUnsavedChanges()) {
          return result;
        }

        queuedSaveReason = resolveReason(queuedSaveReason, REVIEW_SAVE_REASONS.AUTOSAVE);
      }

      return { kind: 'stopped' };
    })().finally(() => {
      drainPromise = null;
    });

    return drainPromise;
  };

  const flush = async ({ saveReason = REVIEW_SAVE_REASONS.MANUAL_SAVE } = {}) => {
    if (destroyed || status === REVIEW_SAVE_STATES.CONFLICT) {
      return { kind: 'conflict' };
    }

    if (!hasUnsavedChanges() && !inFlight) {
      return { kind: 'noop' };
    }

    queuedSaveReason = resolveReason(queuedSaveReason, saveReason);
    clearScheduledSaves();
    return drainQueue();
  };

  const observeSnapshot = (snapshot) => {
    if (destroyed) {
      return;
    }

    latestSnapshot = cloneSnapshot(snapshot);
    clearSavedIndicatorTimer();

    if (!hasUnsavedChanges()) {
      clearScheduledSaves();
      dirtySince = null;

      if (!inFlight && status !== REVIEW_SAVE_STATES.CONFLICT) {
        setStatus(REVIEW_SAVE_STATES.CLEAN);
      }
      return;
    }

    if (dirtySince === null) {
      dirtySince = Date.now();
    }

    if (!inFlight && status !== REVIEW_SAVE_STATES.CONFLICT) {
      setStatus(REVIEW_SAVE_STATES.DIRTY);
    }

    if (inFlight) {
      queuedSaveReason = resolveReason(queuedSaveReason, REVIEW_SAVE_REASONS.AUTOSAVE);
      emitStateChange();
      return;
    }

    if (status === REVIEW_SAVE_STATES.CONFLICT) {
      emitStateChange();
      return;
    }

    scheduleAutosave();
  };

  const applyAuthoritativeReview = (nextReview, source = 'reset') => {
    authoritativeSnapshot = cloneSnapshot(nextReview.currentState);
    latestSnapshot = cloneSnapshot(nextReview.currentState);
    currentEtag = nextReview.etag;
    currentRevisionNumber = nextReview.currentRevisionNumber;
    lastSavedAt = nextReview.updatedAt || nextReview.createdAt || lastSavedAt;
    dirtySince = null;
    errorMessage = '';
    conflictReview = null;
    clearScheduledSaves();
    clearSavedIndicatorTimer();
    setStatus(REVIEW_SAVE_STATES.CLEAN);
    onReviewAccepted(cloneReviewEnvelope(nextReview, cloneSnapshot), { source });
    return cloneReviewEnvelope(nextReview, cloneSnapshot);
  };

  const reloadFromConflict = () => {
    if (!conflictReview) {
      return null;
    }

    return applyAuthoritativeReview(conflictReview, 'conflict_reload');
  };

  const handleVisibilityChange = () => {
    if (documentRef.visibilityState === 'hidden') {
      void flush({ saveReason: REVIEW_SAVE_REASONS.VISIBILITY_FLUSH });
    }
  };

  const handlePageHide = () => {
    void flush({ saveReason: REVIEW_SAVE_REASONS.VISIBILITY_FLUSH });
  };

  const handleOnline = () => {
    if (status === REVIEW_SAVE_STATES.OFFLINE_UNSAVED && hasUnsavedChanges()) {
      void flush({ saveReason: REVIEW_SAVE_REASONS.AUTOSAVE });
    }
  };

  if (typeof documentRef?.addEventListener === 'function') {
    documentRef.addEventListener('visibilitychange', handleVisibilityChange);
  }

  if (typeof windowRef?.addEventListener === 'function') {
    windowRef.addEventListener('pagehide', handlePageHide);
    windowRef.addEventListener('online', handleOnline);
  }

  emitStateChange();

  return {
    getState: buildState,
    hasUnsavedChanges,
    observeSnapshot,
    flush,
    reloadFromConflict,
    resetToReview(nextReview) {
      return applyAuthoritativeReview(nextReview, 'reset');
    },
    destroy() {
      destroyed = true;
      clearScheduledSaves();
      clearSavedIndicatorTimer();

      if (typeof documentRef?.removeEventListener === 'function') {
        documentRef.removeEventListener('visibilitychange', handleVisibilityChange);
      }

      if (typeof windowRef?.removeEventListener === 'function') {
        windowRef.removeEventListener('pagehide', handlePageHide);
        windowRef.removeEventListener('online', handleOnline);
      }
    },
  };
};
