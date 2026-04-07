import { describe, expect, it } from 'vitest';

import {
  buildCaptureCommand,
  deriveDefaultReviewIdFromUrl,
  parseTargetValue,
} from '../../../extension/popup.js';

describe('extension popup helpers', () => {
  it('parses routed review ids and capture targets', () => {
    expect(
      deriveDefaultReviewIdFromUrl('https://trust.example.edu/reviews/17/review-inbox'),
    ).toBe('17');
    expect(parseTargetValue('evaluation')).toEqual({
      scopeType: 'evaluation',
      criterionCode: null,
    });
    expect(parseTargetValue('review_inbox')).toEqual({
      scopeType: 'review_inbox',
      criterionCode: null,
    });
    expect(parseTargetValue('criterion:TR1')).toEqual({
      scopeType: 'criterion',
      criterionCode: 'TR1',
    });
    expect(parseTargetValue('')).toBeNull();
  });

  it('builds capture commands only when explicit required fields are present', () => {
    expect(
      buildCaptureCommand({
        reviewId: '17',
        targetValue: 'criterion:TR1',
        evidenceType: 'screenshot',
        note: 'Capture this evidence.',
        includeScreenshot: true,
      }),
    ).toEqual({
      reviewId: '17',
      scopeType: 'criterion',
      criterionCode: 'TR1',
      evidenceType: 'screenshot',
      note: 'Capture this evidence.',
      includeScreenshot: true,
    });

    expect(
      buildCaptureCommand({
        reviewId: '',
        targetValue: 'evaluation',
        evidenceType: 'screenshot',
        note: 'Missing review id',
        includeScreenshot: false,
      }),
    ).toBeNull();
  });
});
