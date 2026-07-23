export const UNTITLED_PROJECT_NAME = "Untitled painting";

const LEGACY_DATED_NAME = /\s[·•]\s.*\d{1,2}:\d{2}/u;

/** Older Huely projects were automatically named with a date and time. */
export function displayProjectName(name: string): string {
  const trimmed = name.trim();
  return !trimmed || LEGACY_DATED_NAME.test(trimmed) ? UNTITLED_PROJECT_NAME : trimmed;
}
