/**
 * Deterministic UUIDs for demo records, so the SQL seed and on-device demo
 * mode refer to the same rows. Format: 00000000-0000-4000-8000-GGNNNNNNNNNN
 * where GG is the record group and N the sequence number (both hex).
 */
export const ID_GROUP = {
  grade: 0x01,
  stream: 0x02,
  subject: 0x03,
  edition: 0x04,
  unit: 0x05,
  chapter: 0x06,
  lesson: 0x07,
  section: 0x08,
  question: 0x09,
  option: 0x0a,
  card: 0x0b,
  source: 0x0c,
  achievement: 0x0d,
} as const;

export function demoId(group: keyof typeof ID_GROUP, n: number): string {
  const g = ID_GROUP[group].toString(16).padStart(2, '0');
  return `00000000-0000-4000-8000-${g}${n.toString(16).padStart(10, '0')}`;
}
