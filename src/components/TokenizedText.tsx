/**
 * TokenizedText Component
 *
 * Renders a sentence with interactive tokens that show translations and pronunciation on hover/click.
 * Implements the "token-level awareness" philosophy.
 */

import { useState } from 'react';
import type { Token, Sentence } from '../types/lesson';

interface TokenizedTextProps {
  sentence: Sentence;
  /** Size of the text */
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  /** Show glosses on hover (default) or click */
  trigger?: 'hover' | 'click';
}

export default function TokenizedText({
  sentence,
  size = '2xl',
  trigger = 'hover'
}: TokenizedTextProps) {
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);

  const handleTokenClick = (tokenId: string) => {
    if (trigger === 'click') {
      setActiveTokenId(activeTokenId === tokenId ? null : tokenId);
    }
  };

  const handleTokenHover = (tokenId: string | null) => {
    if (trigger === 'hover') {
      setActiveTokenId(tokenId);
    }
  };

  const sizeClasses = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
    '5xl': 'text-5xl',
  };

  return (
    <div className="relative inline-block">
      <div
        className={`${sizeClasses[size]} leading-relaxed select-none`}
        dir="rtl"
        lang="ps"
      >
        {sentence.tokens.map((token, index) => {
          const isActive = activeTokenId === token.id;
          const gloss = sentence.gloss_word_by_word[token.id];

          return (
            <span key={token.id} className="relative inline-block">
              {index > 0 && ' '}
              <span
                className={`
                  cursor-pointer transition-all duration-150 rounded px-1
                  ${isActive
                    ? 'bg-primary text-primary-content shadow-md'
                    : 'hover:bg-primary/20'
                  }
                `}
                onClick={() => handleTokenClick(token.id)}
                onMouseEnter={() => handleTokenHover(token.id)}
                onMouseLeave={() => handleTokenHover(null)}
              >
                {token.text}
              </span>

              {/* Tooltip popover */}
              {isActive && (
                <div
                  className="absolute z-50 mt-2 -translate-x-1/2 left-1/2"
                  style={{ minWidth: '200px' }}
                >
                  <div className="card bg-base-100 shadow-xl border border-base-300">
                    <div className="card-body p-4 space-y-2">
                      {/* Original text */}
                      <div className="text-center border-b border-base-300 pb-2">
                        <p className="text-2xl font-bold" dir="rtl" lang="ps">
                          {token.text}
                        </p>
                      </div>

                      {/* Translation */}
                      {gloss && (
                        <div>
                          <p className="text-xs uppercase opacity-60 mb-1">Meaning</p>
                          <p className="text-lg font-semibold">{gloss}</p>
                        </div>
                      )}

                      {/* Transliteration */}
                      {token.transliteration && (
                        <div>
                          <p className="text-xs uppercase opacity-60 mb-1">Romanization</p>
                          <p className="text-base opacity-80">{token.transliteration}</p>
                        </div>
                      )}

                      {/* IPA */}
                      {token.ipa && (
                        <div>
                          <p className="text-xs uppercase opacity-60 mb-1">Pronunciation</p>
                          <p className="text-base opacity-70 font-mono">/{token.ipa}/</p>
                        </div>
                      )}
                    </div>

                    {/* Arrow pointer */}
                    <div
                      className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-base-100 border-l border-t border-base-300"
                    ></div>
                  </div>
                </div>
              )}
            </span>
          );
        })}
      </div>

      {/* Full sentence translation below */}
      {sentence.meaning_en && (
        <p className="text-base text-base-content/70 mt-3 text-center">
          {sentence.meaning_en}
        </p>
      )}
    </div>
  );
}
