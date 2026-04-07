export const SETTINGS_SURFACE_NAMES = Object.freeze({
  PROFILE: 'settings-profile',
  APPLICATION: 'settings-application',
  CAPTURE: 'settings-capture',
});

const SETTINGS_TAB_OPTIONS = Object.freeze([
  { value: 'guidance', label: 'Guidance' },
  { value: 'reference', label: 'Reference' },
  { value: 'about', label: 'About' },
]);

const DENSITY_OPTIONS = Object.freeze([
  { value: 'compact', label: 'Compact' },
  { value: 'comfortable', label: 'Comfortable' },
]);

const TIME_ZONE_OPTIONS = Object.freeze([
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam' },
]);

export const createSettingsViewModel = ({
  session,
  route,
  saveState = null,
  extensionState = null,
} = {}) => {
  const preferences = session?.preferences ?? {};
  const isProfile = route?.name === SETTINGS_SURFACE_NAMES.PROFILE;
  const isCapture = route?.name === SETTINGS_SURFACE_NAMES.CAPTURE;
  const routeName = isProfile
    ? SETTINGS_SURFACE_NAMES.PROFILE
    : isCapture
      ? SETTINGS_SURFACE_NAMES.CAPTURE
      : SETTINGS_SURFACE_NAMES.APPLICATION;

  return {
    routeName,
    title: isProfile
      ? 'Profile defaults'
      : isCapture
        ? 'Browser capture pairing'
        : 'Application settings',
    description: isProfile
      ? 'Profile defaults prepare new review drafts without mutating existing saved questionnaire content.'
      : isCapture
        ? 'Pair the Chromium capture pilot through short-lived, revocable sessions that can only write into existing review evidence targets.'
        : 'Application settings change shell behavior and display defaults without becoming review data.',
    tabs: [
      {
        name: SETTINGS_SURFACE_NAMES.PROFILE,
        href: '/settings/profile',
        label: 'Profile',
        active: routeName === SETTINGS_SURFACE_NAMES.PROFILE,
      },
      {
        name: SETTINGS_SURFACE_NAMES.APPLICATION,
        href: '/settings/application',
        label: 'Application',
        active: routeName === SETTINGS_SURFACE_NAMES.APPLICATION,
      },
      {
        name: SETTINGS_SURFACE_NAMES.CAPTURE,
        href: '/settings/capture',
        label: 'Capture',
        active: routeName === SETTINGS_SURFACE_NAMES.CAPTURE,
      },
    ],
    user: session?.user ?? null,
    preferences: {
      defaultAffiliationText: preferences.defaultAffiliationText ?? '',
      defaultReviewerSignature: preferences.defaultReviewerSignature ?? '',
      preferredDensity: preferences.preferredDensity ?? 'compact',
      preferredTimeZone: preferences.preferredTimeZone ?? 'UTC',
      defaultSidebarTab: SETTINGS_TAB_OPTIONS.some(
        (entry) => entry.value === preferences.defaultSidebarTab,
      )
        ? preferences.defaultSidebarTab
        : 'guidance',
      keyboardShortcutsCollapsed: Boolean(preferences.keyboardShortcutsCollapsed),
    },
    options: {
      density: DENSITY_OPTIONS,
      timeZones: TIME_ZONE_OPTIONS,
      sidebarTabs: SETTINGS_TAB_OPTIONS,
    },
    extension: {
      sessions: Array.isArray(extensionState?.sessions) ? extensionState.sessions : [],
      loading: Boolean(extensionState?.loading),
      pairing: extensionState?.pairing ?? null,
    },
    saveState,
  };
};

export const createSettingsPatchFromForm = ({ formData, surface }) => {
  if (!(formData instanceof FormData)) {
    return {};
  }

  if (surface === SETTINGS_SURFACE_NAMES.PROFILE) {
    return {
      defaultAffiliationText: String(formData.get('defaultAffiliationText') ?? ''),
      defaultReviewerSignature: String(formData.get('defaultReviewerSignature') ?? ''),
    };
  }

  if (surface === SETTINGS_SURFACE_NAMES.CAPTURE) {
    return {};
  }

  return {
    preferredDensity: String(formData.get('preferredDensity') ?? 'compact'),
    preferredTimeZone: String(formData.get('preferredTimeZone') ?? 'UTC'),
    defaultSidebarTab: String(formData.get('defaultSidebarTab') ?? 'guidance'),
    keyboardShortcutsCollapsed: formData.get('keyboardShortcutsCollapsed') === 'true',
  };
};
