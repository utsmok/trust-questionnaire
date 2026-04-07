import {
  CANONICAL_PAGE_SEQUENCE,
  SECTION_REGISTRY,
  SECTION_WORKFLOW_STATES,
  getSectionDefinition,
} from '../config/sections.js';

const COMPATIBILITY_DOCUMENT_PATH = '/trust-framework.html';
const DASHBOARD_PATH = '/dashboard';
const REVIEW_LIST_PATH = '/reviews';
const HELP_PATH = '/help';
const TOOLING_PATH = '/tooling';
const SETTINGS_PROFILE_PATH = '/settings/profile';
const SETTINGS_APPLICATION_PATH = '/settings/application';
const SETTINGS_CAPTURE_PATH = '/settings/capture';

const WORKSPACE_ROUTE_PREFIX = ['reviews'];

export const REVIEW_SHELL_SUBVIEWS = Object.freeze({
  OVERVIEW: 'overview',
  WORKSPACE: 'workspace',
  ACTIVITY: 'activity',
  IMPORT_EXPORT: 'import-export',
  REVIEW_INBOX: 'review-inbox',
});

const SECTION_ID_BY_SLUG = new Map(
  SECTION_REGISTRY.flatMap((section) => {
    const values = [section.slug, section.id, section.pageCode].filter(Boolean);
    return values.map((value) => [String(value).trim().toLowerCase(), section.id]);
  }),
);

const normalizePathname = (pathname = '/') => {
  const nextPath = typeof pathname === 'string' && pathname.trim() ? pathname.trim() : '/';

  if (nextPath === '/') {
    return '/';
  }

  return nextPath.endsWith('/') ? nextPath.slice(0, -1) : nextPath;
};

const toSegments = (pathname) => normalizePathname(pathname).split('/').filter(Boolean);

export const resolvePageIdFromRouteSegment = (segment) => {
  if (typeof segment !== 'string' || !segment.trim()) {
    return null;
  }

  return SECTION_ID_BY_SLUG.get(segment.trim().toLowerCase()) ?? null;
};

export const resolveSectionSlugFromPageId = (pageId) =>
  getSectionDefinition(pageId)?.slug ?? String(pageId ?? '').toLowerCase();

export const resolveDefaultWorkspacePageId = (workflowMode) => {
  const editablePageId = CANONICAL_PAGE_SEQUENCE.find((pageId) => {
    const definition = getSectionDefinition(pageId);
    return definition?.workflowStates?.[workflowMode] === SECTION_WORKFLOW_STATES.EDITABLE;
  });

  return editablePageId ?? CANONICAL_PAGE_SEQUENCE[0] ?? null;
};

export const buildDashboardPath = () => DASHBOARD_PATH;
export const buildReviewListPath = () => REVIEW_LIST_PATH;
export const buildCompatibilityPath = () => COMPATIBILITY_DOCUMENT_PATH;
export const buildHelpPath = () => HELP_PATH;
export const buildToolingPath = () => TOOLING_PATH;
export const buildToolingTestSetPath = (testSetId) =>
  `/tooling/test-sets/${encodeURIComponent(String(testSetId))}`;
export const buildSettingsProfilePath = () => SETTINGS_PROFILE_PATH;
export const buildSettingsApplicationPath = () => SETTINGS_APPLICATION_PATH;
export const buildSettingsCapturePath = () => SETTINGS_CAPTURE_PATH;
export const buildReviewOverviewPath = (reviewId) =>
  `/reviews/${encodeURIComponent(String(reviewId))}/overview`;
export const buildReviewActivityPath = (reviewId) =>
  `/reviews/${encodeURIComponent(String(reviewId))}/activity`;
export const buildReviewImportExportPath = (reviewId) =>
  `/reviews/${encodeURIComponent(String(reviewId))}/import-export`;
export const buildReviewInboxPath = (reviewId) =>
  `/reviews/${encodeURIComponent(String(reviewId))}/review-inbox`;
export const buildReviewWorkspacePath = (reviewId, pageId) => {
  const sectionSlug = resolveSectionSlugFromPageId(pageId);
  return `/reviews/${encodeURIComponent(String(reviewId))}/workspace/${encodeURIComponent(sectionSlug)}`;
};

export const isCompatibilityRoute = (route) => route?.name === 'compatibility';
export const isDashboardRoute = (route) =>
  route?.name === 'dashboard' || route?.name === 'review-list';
export const isHelpRoute = (route) => route?.name === 'help';
export const isToolingRoute = (route) => route?.name === 'tooling';
export const isSettingsRoute = (route) =>
  route?.name === 'settings-profile' ||
  route?.name === 'settings-application' ||
  route?.name === 'settings-capture';
export const isReviewShellRoute = (route) =>
  route?.name === 'review-overview' ||
  route?.name === 'review-workspace' ||
  route?.name === 'review-activity' ||
  route?.name === 'review-import-export' ||
  route?.name === 'review-inbox';
export const isWorkspaceRoute = (route) => route?.name === 'review-workspace';
export const resolveReviewShellSubview = (route) => route?.subview ?? null;

export const parseAppRoute = ({ pathname = '/', hash = '' } = {}) => {
  const normalizedPath = normalizePathname(pathname);

  if (normalizedPath === COMPATIBILITY_DOCUMENT_PATH) {
    return {
      name: 'compatibility',
      pathname: normalizedPath,
      canonicalPath: COMPATIBILITY_DOCUMENT_PATH,
      key: 'compatibility',
    };
  }

  const segments = toSegments(normalizedPath);

  if (segments.length === 0 || normalizedPath === DASHBOARD_PATH) {
    return {
      name: 'dashboard',
      pathname: normalizedPath,
      canonicalPath: DASHBOARD_PATH,
      key: 'dashboard',
      needsCanonicalReplace: normalizedPath !== DASHBOARD_PATH,
    };
  }

  if (normalizedPath === REVIEW_LIST_PATH) {
    return {
      name: 'review-list',
      pathname: normalizedPath,
      canonicalPath: REVIEW_LIST_PATH,
      key: 'review-list',
    };
  }

  if (normalizedPath === HELP_PATH) {
    return {
      name: 'help',
      pathname: normalizedPath,
      canonicalPath: HELP_PATH,
      key: 'help',
    };
  }

  if (segments[0] === 'tooling') {
    if (segments.length === 1) {
      return {
        name: 'tooling',
        pathname: normalizedPath,
        canonicalPath: TOOLING_PATH,
        key: 'tooling',
      };
    }

    if (segments[1] === 'test-sets' && segments[2]) {
      const testSetId = decodeURIComponent(segments[2]);

      return {
        name: 'tooling',
        pathname: normalizedPath,
        canonicalPath: buildToolingTestSetPath(testSetId),
        key: `tooling:${testSetId}`,
        testSetId,
      };
    }

    return {
      name: 'tooling',
      pathname: normalizedPath,
      canonicalPath: TOOLING_PATH,
      key: 'tooling',
      needsCanonicalReplace: true,
    };
  }

  if (segments[0] === 'settings') {
    if (segments.length === 1) {
      return {
        name: 'settings-profile',
        pathname: normalizedPath,
        canonicalPath: SETTINGS_PROFILE_PATH,
        key: 'settings-profile',
        needsCanonicalReplace: true,
      };
    }

    if (segments[1] === 'profile') {
      return {
        name: 'settings-profile',
        pathname: normalizedPath,
        canonicalPath: SETTINGS_PROFILE_PATH,
        key: 'settings-profile',
      };
    }

    if (segments[1] === 'application') {
      return {
        name: 'settings-application',
        pathname: normalizedPath,
        canonicalPath: SETTINGS_APPLICATION_PATH,
        key: 'settings-application',
      };
    }

    if (segments[1] === 'capture') {
      return {
        name: 'settings-capture',
        pathname: normalizedPath,
        canonicalPath: SETTINGS_CAPTURE_PATH,
        key: 'settings-capture',
      };
    }
  }

  if (segments[0] === WORKSPACE_ROUTE_PREFIX[0] && segments[1]) {
    const reviewId = decodeURIComponent(segments[1]);

    if (segments.length === 2) {
      return {
        name: 'review-overview',
        subview: REVIEW_SHELL_SUBVIEWS.OVERVIEW,
        pathname: normalizedPath,
        reviewId,
        canonicalPath: buildReviewOverviewPath(reviewId),
        key: `review-overview:${reviewId}`,
        needsCanonicalReplace: normalizedPath !== buildReviewOverviewPath(reviewId),
      };
    }

    if (segments[2] === 'overview') {
      return {
        name: 'review-overview',
        subview: REVIEW_SHELL_SUBVIEWS.OVERVIEW,
        pathname: normalizedPath,
        reviewId,
        canonicalPath: buildReviewOverviewPath(reviewId),
        key: `review-overview:${reviewId}`,
      };
    }

    if (segments[2] === 'activity') {
      return {
        name: 'review-activity',
        subview: REVIEW_SHELL_SUBVIEWS.ACTIVITY,
        pathname: normalizedPath,
        reviewId,
        canonicalPath: buildReviewActivityPath(reviewId),
        key: `review-activity:${reviewId}`,
      };
    }

    if (segments[2] === 'import-export') {
      return {
        name: 'review-import-export',
        subview: REVIEW_SHELL_SUBVIEWS.IMPORT_EXPORT,
        pathname: normalizedPath,
        reviewId,
        canonicalPath: buildReviewImportExportPath(reviewId),
        key: `review-import-export:${reviewId}`,
      };
    }

    if (segments[2] === 'review-inbox') {
      return {
        name: 'review-inbox',
        subview: REVIEW_SHELL_SUBVIEWS.REVIEW_INBOX,
        pathname: normalizedPath,
        reviewId,
        canonicalPath: buildReviewInboxPath(reviewId),
        key: `review-inbox:${reviewId}`,
      };
    }

    if (segments[2] === 'workspace') {
      const rawSection = segments[3] ? decodeURIComponent(segments[3]) : '';
      const hashSection = typeof hash === 'string' ? hash.replace(/^#/, '').trim() : '';
      const pageId = resolvePageIdFromRouteSegment(rawSection || hashSection);

      return {
        name: 'review-workspace',
        subview: REVIEW_SHELL_SUBVIEWS.WORKSPACE,
        pathname: normalizedPath,
        reviewId,
        pageId,
        rawSection: rawSection || null,
        canonicalPath: pageId ? buildReviewWorkspacePath(reviewId, pageId) : normalizedPath,
        key: `review-workspace:${reviewId}:${pageId ?? 'pending'}`,
        needsCanonicalReplace: Boolean(
          pageId && normalizedPath !== buildReviewWorkspacePath(reviewId, pageId),
        ),
      };
    }
  }

  return {
    name: 'dashboard',
    pathname: normalizedPath,
    canonicalPath: DASHBOARD_PATH,
    key: 'dashboard',
    invalidPath: true,
    needsCanonicalReplace: true,
  };
};

const readCurrentRoute = (windowRef) =>
  parseAppRoute({
    pathname: windowRef.location.pathname,
    hash: windowRef.location.hash,
  });

export const createAppRouter = ({ windowRef = window, onChange = () => {} } = {}) => {
  const cleanup = [];
  let currentRoute = readCurrentRoute(windowRef);

  const syncBrowserPath = (route, { replace = false } = {}) => {
    if (!route?.canonicalPath) {
      return;
    }

    const currentPath = `${windowRef.location.pathname}${windowRef.location.search}`;

    if (currentPath === route.canonicalPath) {
      return;
    }

    windowRef.history?.[replace ? 'replaceState' : 'pushState']?.({}, '', route.canonicalPath);
  };

  const notifyRouteChange = (nextRoute, previousRoute) => {
    currentRoute = nextRoute;
    onChange(nextRoute, previousRoute);
  };

  const refreshFromLocation = ({ replace = true, force = false } = {}) => {
    const nextRoute = readCurrentRoute(windowRef);

    if (replace && nextRoute.needsCanonicalReplace) {
      syncBrowserPath(nextRoute, { replace: true });
    }

    if (!force && nextRoute.key === currentRoute.key && !nextRoute.invalidPath) {
      currentRoute = nextRoute;
      return currentRoute;
    }

    const previousRoute = currentRoute;
    notifyRouteChange(nextRoute, previousRoute);
    return nextRoute;
  };

  const handlePopState = () => {
    refreshFromLocation({ replace: true });
  };

  windowRef.addEventListener('popstate', handlePopState);
  cleanup.push(() => windowRef.removeEventListener('popstate', handlePopState));

  if (currentRoute.needsCanonicalReplace) {
    syncBrowserPath(currentRoute, { replace: true });
    currentRoute = readCurrentRoute(windowRef);
  }

  return {
    getCurrentRoute() {
      return currentRoute;
    },
    navigate(routeOrPath, { replace = false } = {}) {
      const nextRoute =
        typeof routeOrPath === 'string'
          ? parseAppRoute({ pathname: routeOrPath })
          : { ...routeOrPath, canonicalPath: routeOrPath.canonicalPath ?? routeOrPath.pathname };

      syncBrowserPath(nextRoute, { replace });
      const previousRoute = currentRoute;
      notifyRouteChange(nextRoute, previousRoute);
      return nextRoute;
    },
    replace(routeOrPath) {
      return this.navigate(routeOrPath, { replace: true });
    },
    refresh(options) {
      return refreshFromLocation(options);
    },
    destroy() {
      cleanup.splice(0).forEach((dispose) => dispose());
    },
  };
};
