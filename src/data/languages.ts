/**
 * Language catalog.
 *
 * The static list of courses the product presents. Exactly one is
 * `available` today (Pashto — the only language with real lesson content);
 * the rest are `coming_soon` placeholders so the app reads as multi-language.
 *
 * `code` is our internal language id (matches lesson_id prefixes, e.g. the
 * `pus` in `pus-001`). `flag` is an ISO 3166-1 alpha-2 country code consumed
 * by flag-icons (see FlagIcon). A language is not a country, so `flag` is a
 * best-effort visual, not a claim.
 */

export type LanguageStatus = 'available' | 'coming_soon';

export interface LanguageMeta {
  code: string;        // internal language id, e.g. 'pus'
  name: string;        // English name
  nativeName: string;  // endonym
  flag: string;        // ISO 3166-1 alpha-2 for flag-icons, e.g. 'af'
  dialect?: string;
  status: LanguageStatus;
  rtl?: boolean;
}

export const DEFAULT_LANGUAGE = 'pus';

export const LANGUAGE_CATALOG: LanguageMeta[] = [
  { code: 'pus', name: 'Pashto',  nativeName: 'پښتو',     flag: 'af', dialect: 'Kandahari', status: 'available',   rtl: true },
  { code: 'fas', name: 'Persian', nativeName: 'فارسی',    flag: 'ir',                        status: 'coming_soon', rtl: true },
  { code: 'urd', name: 'Urdu',    nativeName: 'اردو',     flag: 'pk',                        status: 'coming_soon', rtl: true },
  { code: 'ara', name: 'Arabic',  nativeName: 'العربية',  flag: 'sa',                        status: 'coming_soon', rtl: true },
  { code: 'tur', name: 'Turkish', nativeName: 'Türkçe',   flag: 'tr',                        status: 'coming_soon' },
  { code: 'hin', name: 'Hindi',   nativeName: 'हिन्दी',    flag: 'in',                        status: 'coming_soon' },
  { code: 'spa', name: 'Spanish', nativeName: 'Español',  flag: 'es',                        status: 'coming_soon' },
  { code: 'fra', name: 'French',  nativeName: 'Français', flag: 'fr',                        status: 'coming_soon' },
];

const BY_CODE = new Map(LANGUAGE_CATALOG.map((l) => [l.code, l]));

export function getLanguage(code: string): LanguageMeta | undefined {
  return BY_CODE.get(code);
}

export function availableLanguages(): LanguageMeta[] {
  return LANGUAGE_CATALOG.filter((l) => l.status === 'available');
}

export function isAvailable(code: string): boolean {
  return getLanguage(code)?.status === 'available';
}
