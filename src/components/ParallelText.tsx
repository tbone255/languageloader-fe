/**
 * ParallelText Component
 *
 * Displays a Pashto sentence with interlinear word-by-word gloss below each token.
 * Used in story_comprehension, reading exercises, and the lesson intro.
 *
 * Layout:
 *   [word1]   [word2]   [word3]       ← RTL Pashto
 *   [gloss1]  [gloss2]  [gloss3]      ← LTR English gloss
 *   ─────────────────────────────────
 *   Full English translation
 */

import type { Sentence } from '../types/lesson';

interface ParallelTextProps {
  sentence: Sentence;
  showTranslation?: boolean;
  size?: 'sm' | 'base' | 'lg' | 'xl';
}

const TOKEN_SIZES = {
  sm: 'text-lg',
  base: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
};

const GLOSS_SIZES = {
  sm: 'text-xs',
  base: 'text-xs',
  lg: 'text-sm',
  xl: 'text-base',
};

export default function ParallelText({
  sentence,
  showTranslation = true,
  size = 'lg',
}: ParallelTextProps) {
  return (
    <div className="space-y-3">
      {/* Interlinear display — tokens flow RTL, but we reverse for flex layout */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-end" dir="rtl">
        {sentence.tokens.map((token) => {
          const gloss = sentence.gloss_word_by_word[token.id];
          return (
            <div key={token.id} className="flex flex-col items-center">
              <span className={`${TOKEN_SIZES[size]} font-bold`} lang="ps">{token.text}</span>
              {gloss && (
                <span className={`${GLOSS_SIZES[size]} opacity-60 text-center leading-tight mt-0.5`} dir="ltr">
                  {gloss}
                </span>
              )}
              {token.transliteration && (
                <span className={`${GLOSS_SIZES[size]} opacity-40 italic text-center`} dir="ltr">
                  {token.transliteration}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Full translation */}
      {showTranslation && sentence.translation_en && (
        <p className="text-sm text-base-content/60 italic border-t border-base-300 pt-2" dir="ltr">
          "{sentence.translation_en}"
        </p>
      )}
    </div>
  );
}
