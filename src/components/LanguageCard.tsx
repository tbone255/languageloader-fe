/**
 * LanguageCard — a course tile. Two modes:
 * - enrolled + available: flag, name, Anki-style stat chips, a Continue CTA
 * - catalog: flag, name, and either a Start CTA (available) or a
 *   "Coming soon" badge (not yet built)
 *
 * Stats are Anki's three buckets: New (unseen), Learning (lapsed/relearning,
 * i.e. "again"), Review (graduated, i.e. "good"). Only languages with real
 * cards pass stats; everything else renders without them.
 */

import FlagIcon from './FlagIcon';
import type { LanguageMeta } from '../data/languages';

export interface CardStats {
  new: number;
  learning: number;
  review: number;
}

interface LanguageCardProps {
  language: LanguageMeta;
  stats?: CardStats;
  ctaLabel?: string;
  onCta?: () => void;
}

function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center px-2">
      <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide opacity-60">{label}</span>
    </div>
  );
}

export default function LanguageCard({ language, stats, ctaLabel, onCta }: LanguageCardProps) {
  const comingSoon = language.status === 'coming_soon';

  return (
    <div
      className={`card bg-base-100 shadow-sm border border-base-300 transition-all ${
        comingSoon ? 'opacity-60' : 'hover:shadow-md'
      }`}
    >
      <div className="card-body p-4">
        <div className="flex items-center gap-3">
          <FlagIcon code={language.flag} className="w-10 h-10 rounded-full shadow-sm shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold leading-tight">{language.name}</p>
              {comingSoon && <span className="badge badge-ghost badge-sm">Coming soon</span>}
            </div>
            <p className="text-sm opacity-60" dir={language.rtl ? 'rtl' : undefined}>
              {language.nativeName}
              {language.dialect && <span className="opacity-70"> · {language.dialect}</span>}
            </p>
          </div>

          {!comingSoon && ctaLabel && (
            <button className="btn btn-primary btn-sm shrink-0" onClick={onCta}>
              {ctaLabel}
            </button>
          )}
        </div>

        {stats && !comingSoon && (
          <div className="flex items-center justify-start gap-1 mt-3 pt-3 border-t border-base-200">
            <StatChip label="New" value={stats.new} color="text-info" />
            <StatChip label="Learning" value={stats.learning} color="text-warning" />
            <StatChip label="Review" value={stats.review} color="text-success" />
          </div>
        )}
      </div>
    </div>
  );
}
