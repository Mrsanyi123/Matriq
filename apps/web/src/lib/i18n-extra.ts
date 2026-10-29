/**
 * Web-only interface strings. Empty: shared strings live in `@matriq/i18n`
 * (packages/i18n/src/locales). Add a key here only if it can never apply to
 * the mobile app, and translate it in the shared package when possible.
 */
export const extraMessages = {} as const satisfies Record<string, string>;

export type ExtraMessageKey = keyof typeof extraMessages;
