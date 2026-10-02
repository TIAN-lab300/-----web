const THEME_PREFERENCES = ["system", "light", "dark"];

export function resolveTheme(preference, systemPrefersDark) {
  const normalized = THEME_PREFERENCES.includes(preference)
    ? preference
    : "system";

  if (normalized === "system") {
    return systemPrefersDark ? "dark" : "light";
  }

  return normalized;
}

export function getNextThemePreference(preference) {
  const index = THEME_PREFERENCES.indexOf(preference);
  const currentIndex = index === -1 ? 0 : index;
  return THEME_PREFERENCES[(currentIndex + 1) % THEME_PREFERENCES.length];
}

