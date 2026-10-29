/**
 * Mobile-only interface strings. Empty: shared strings live in `@matriq/i18n`
 * (packages/i18n/src/locales). Add a key here only if it can never apply to
 * the web app.
 */
export const mobileStrings = {} as const satisfies Record<string, string>;

export type MobileMessageKey = keyof typeof mobileStrings;
