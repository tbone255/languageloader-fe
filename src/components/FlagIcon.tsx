/**
 * FlagIcon — SVG country flag via the flag-icons CSS package.
 *
 * Emoji flags (🇦🇫) render as bare letter pairs on Windows/Chrome-on-Windows,
 * so we use flag-icons' SVG-backed CSS classes instead — identical on every
 * OS. `code` is an ISO 3166-1 alpha-2 country code (see LanguageMeta.flag).
 */

import 'flag-icons/css/flag-icons.min.css';

interface FlagIconProps {
  code: string;
  /** Square aspect (default). Set false for the native 4:3 ratio. */
  square?: boolean;
  className?: string;
}

export default function FlagIcon({ code, square = true, className = '' }: FlagIconProps) {
  return (
    <span
      className={`fi fi-${code} ${square ? 'fis' : ''} ${className}`.trim()}
      role="img"
      aria-label={`${code} flag`}
    />
  );
}
