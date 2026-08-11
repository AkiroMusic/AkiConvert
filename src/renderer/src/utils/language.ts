/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * First-run language resolution.
 *
 * AkiConvert supports exactly two locales (en-US, zh-CN). The persisted
 * `languageSet` flag distinguishes "the user never chose a language" from
 * "the user explicitly picked one", so a fresh install can auto-detect the
 * OS language instead of defaulting to a hardcoded locale for everyone.
 */

/** Map a `navigator.language` string to the closest supported locale. */
export function detectLanguage(navigatorLang: string): string {
  if (navigatorLang.startsWith('zh')) return 'zh-CN'
  return 'en-US'
}

/**
 * Pick the startup language: an explicit user choice (languageSet === true)
 * always wins; on first run (languageSet === false) fall back to OS-language
 * auto-detection, defaulting to en-US for unknown/empty navigator languages.
 */
export function resolveInitialLanguage(
  storedLanguage: string,
  languageSet: boolean,
  navigatorLang: string
): string {
  if (languageSet) return storedLanguage
  return detectLanguage(navigatorLang)
}
