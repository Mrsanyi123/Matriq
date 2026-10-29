import type { en } from './en';

export type MessageKey = keyof typeof en;
/** A locale may omit keys; they fall back to English. */
export type Messages = Partial<Record<MessageKey, string>>;
