import { INTERFACE_LANGUAGES, type InterfaceLanguage } from '@matriq/types';

/** `matriq_mode=demo` marks a guest using the on-device demo. */
export const MODE_COOKIE = 'matriq_mode';
/** Last interface language, so the server can render the right `<html lang>`. */
export const LANG_COOKIE = 'matriq_lang';
/** Desktop sidebar preference (`collapsed` | `expanded`). */
export const SIDEBAR_COOKIE = 'matriq_sidebar';

const ONE_YEAR = 60 * 60 * 24 * 365;

export function parseLanguage(value: string | undefined | null): InterfaceLanguage {
  return (INTERFACE_LANGUAGES as readonly string[]).includes(value ?? '')
    ? (value as InterfaceLanguage)
    : 'en';
}

/** Client-side cookie write (non-sensitive UI preferences only). */
export function setClientCookie(name: string, value: string, maxAge = ONE_YEAR) {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function clearClientCookie(name: string) {
  setClientCookie(name, '', 0);
}

export function readClientCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  for (const part of document.cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return null;
}
