import { describe, expect, it } from 'vitest';

import {
  QUEUE_STATUS,
  classifyQueueFailure,
  createQueueEntry,
  deriveAssetKind,
  deriveDefaultReviewIdFromUrl,
  normalizeAppOrigin,
  normalizePersistedQueue,
} from '../../../extension/background.js';

describe('extension background helpers', () => {
  it('normalizes app origins and review ids', () => {
    expect(normalizeAppOrigin('trust.example.edu')).toBe('https://trust.example.edu');
    expect(normalizeAppOrigin('https://trust.example.edu/reviews/42')).toBe(
      'https://trust.example.edu',
    );
    expect(normalizeAppOrigin('chrome://extensions')).toBe('');

    expect(
      deriveDefaultReviewIdFromUrl('https://trust.example.edu/reviews/42/workspace/transparent'),
    ).toBe('42');
    expect(deriveDefaultReviewIdFromUrl('https://example.test/')).toBe('');
  });

  it('derives asset kinds and failure classes for the persisted queue', () => {
    expect(deriveAssetKind({ includeScreenshot: true, selectionText: '' })).toBe('image');
    expect(deriveAssetKind({ includeScreenshot: false, selectionText: 'Quoted text' })).toBe(
      'selection',
    );
    expect(deriveAssetKind({ includeScreenshot: false, selectionText: '' })).toBe(
      'metadata_only',
    );

    expect(classifyQueueFailure({ statusCode: 401 })).toBe(QUEUE_STATUS.FAILED_AUTH);
    expect(classifyQueueFailure({ statusCode: 409 })).toBe(QUEUE_STATUS.FAILED_POLICY);
    expect(classifyQueueFailure({ statusCode: 503 })).toBe(QUEUE_STATUS.FAILED_RETRYABLE);
  });

  it('rehydrates interrupted queue entries as explicit retryable failures', () => {
    const queued = createQueueEntry({
      appOrigin: 'https://trust.example.edu',
      captureRequest: {
        reviewId: '42',
        scopeType: 'review_inbox',
        criterionCode: null,
        evidenceType: 'screenshot',
        note: 'Queue me.',
        includeScreenshot: true,
      },
      pageContext: {
        url: 'https://example.test/article',
        title: 'Article',
        selectionText: 'Selected text',
      },
      screenshotDataUrl: 'data:image/png;base64,AAAA',
    });
    const resumed = normalizePersistedQueue([
      {
        ...queued,
        status: QUEUE_STATUS.UPLOADING,
      },
    ]);

    expect(resumed[0].status).toBe(QUEUE_STATUS.FAILED_RETRYABLE);
    expect(resumed[0].errorMessage).toContain('Retry explicitly');
  });
});
