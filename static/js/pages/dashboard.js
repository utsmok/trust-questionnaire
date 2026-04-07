const REVIEW_LIFECYCLE_BUCKETS = Object.freeze([
  'nomination_draft',
  'primary_in_progress',
  'primary_handoff_ready',
  'second_review_in_progress',
  'decision_pending',
  'published',
  'archived',
]);

const normalizeSearchValue = (value) =>
  String(value ?? '')
    .trim()
    .toLowerCase();

const toSearchHaystack = (review) =>
  [
    review.publicId,
    review.titleSnapshot,
    review.workflowMode,
    review.lifecycleState,
    review.currentRevisionNumber,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const sortReviewsByUpdatedAt = (reviews) =>
  [...reviews].sort((left, right) => {
    const leftTime = Date.parse(left.updatedAt ?? left.createdAt ?? 0);
    const rightTime = Date.parse(right.updatedAt ?? right.createdAt ?? 0);
    return rightTime - leftTime;
  });

const filterReviews = (reviews, filters) => {
  const search = normalizeSearchValue(filters.search);
  const workflowFilter = filters.workflowFilter ?? 'all';
  const lifecycleFilter = filters.lifecycleFilter ?? 'all';

  return reviews.filter((review) => {
    if (workflowFilter !== 'all' && review.workflowMode !== workflowFilter) {
      return false;
    }

    if (lifecycleFilter !== 'all' && review.lifecycleState !== lifecycleFilter) {
      return false;
    }

    if (search && !toSearchHaystack(review).includes(search)) {
      return false;
    }

    return true;
  });
};

const buildSummary = (reviews) => {
  const total = reviews.length;
  const primaryInProgress = reviews.filter(
    (review) => review.lifecycleState === 'primary_in_progress',
  ).length;
  const awaitingSecondReview = reviews.filter((review) =>
    ['primary_handoff_ready', 'second_review_assigned', 'second_review_in_progress'].includes(
      review.lifecycleState,
    ),
  ).length;
  const awaitingDecision = reviews.filter(
    (review) => review.lifecycleState === 'decision_pending',
  ).length;
  const published = reviews.filter((review) => review.lifecycleState === 'published').length;

  return [
    { id: 'total', label: 'Total reviews', value: total },
    { id: 'primary', label: 'Primary in progress', value: primaryInProgress },
    { id: 'second', label: 'Awaiting second review', value: awaitingSecondReview },
    { id: 'decision', label: 'Awaiting decision', value: awaitingDecision },
    { id: 'published', label: 'Published', value: published },
  ];
};

export const createDashboardViewModel = ({
  surface = 'dashboard',
  reviews = [],
  filters = {},
  createDraftTitle = '',
  loading = false,
  errorMessage = '',
} = {}) => {
  const orderedReviews = sortReviewsByUpdatedAt(reviews);
  const filteredReviews = filterReviews(orderedReviews, filters);
  const workflowOptions = ['all', ...new Set(orderedReviews.map((review) => review.workflowMode))];
  const lifecycleOptions = [
    'all',
    ...REVIEW_LIFECYCLE_BUCKETS.filter((value) =>
      orderedReviews.some((review) => review.lifecycleState === value),
    ),
  ];

  return {
    surface,
    title: surface === 'review-list' ? 'Review list' : 'Dashboard',
    description:
      surface === 'review-list'
        ? 'Explicit queue view for saved review records.'
        : 'Authenticated entry surface for saved review creation, search, and continuation.',
    loading,
    errorMessage,
    reviews: orderedReviews,
    filteredReviews,
    filters: {
      search: filters.search ?? '',
      workflowFilter: filters.workflowFilter ?? 'all',
      lifecycleFilter: filters.lifecycleFilter ?? 'all',
    },
    createDraftTitle,
    workflowOptions,
    lifecycleOptions,
    summary: buildSummary(orderedReviews),
    hasFiltersApplied:
      Boolean(filters.search) ||
      (filters.workflowFilter && filters.workflowFilter !== 'all') ||
      (filters.lifecycleFilter && filters.lifecycleFilter !== 'all'),
  };
};
