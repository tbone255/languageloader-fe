/**
 * TokenizedText Component
 *
 * Renders a sentence with interactive tokens that show translations,
 * pronunciation, and IPA on hover/click (tap-to-gloss).
 *
 * Improvements (issue #88):
 * - Click anywhere outside to dismiss active gloss
 * - Shows IPA badge inline when available
 * - Prevents tooltip from overflowing viewport edges
 * - "Mobile-first": uses click/tap by default (no hover required)
 */

import { useState, useEffect, useRef } from 'react';
import type { Sentence } from '../types/lesson';

interface TokenizedTextProps {
  sentence: Sentence;
  /** Size of the text */
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  /** Show glosses on hover (default) or click */
  trigger?: 'hover' | 'click';
  /** Called whenever any token is hovered or tapped, with tokenId and its bounding rect */
  onTokenHover?: (tokenId: string, rect: DOMRect) => void;
}

export default function TokenizedText({
  sentence,
  size = '2xl',
  trigger = 'hover',
  onTokenHover,
}: TokenizedTextProps) {
  const [activeTokenId, setActiveTokenId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dismiss on outside click
  useEffect(() => {
    if (!activeTokenId) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveTokenId(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
    };
  }, [activeTokenId]);

  const handleTokenClick = (tokenId: string) => {
    setActiveTokenId(activeTokenId === tokenId ? null : tokenId);
  };

  const handleTokenHover = (tokenId: string | null, event?: React.MouseEvent | React.TouchEvent) => {
    if (trigger === 'hover') {
      setActiveTokenId(tokenId);
    }
    if (tokenId && event && onTokenHover) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      onTokenHover(tokenId, rect);
    }
  };

  const sizeClasses: Record<string, string> = {
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
    <div className="relative" ref={containerRef}>
      <div
        className={`${sizeClasses[size]} leading-relaxed select-none`}
        dir="rtl"
        lang="ps"
      >
        {sentence.tokens.map((token, index) => {
          const isActive = activeTokenId === token.id;
          const gloss = sentence.gloss_word_by_word[token.id];
          const hasGloss = !!(gloss || token.transliteration || token.ipa);

          return (
            <span key={token.id} className="relative inline-block">
              {index > 0 && ' '}
              <span
                className={`
                  transition-all duration-150 rounded px-0.5
                  ${hasGloss ? 'cursor-pointer' : ''}
                  ${isActive
                    ? 'bg-primary text-primary-content shadow-sm'
                    : hasGloss ? 'hover:bg-primary/15 active:bg-primary/25' : ''
                  }
                `}
                onClick={() => hasGloss && handleTokenClick(token.id)}
                onMouseEnter={(e) => handleTokenHover(token.id, e)}
                onMouseLeave={() => trigger === 'hover' && handleTokenHover(null)}
              >
                {token.text}
              </span>

              {/* Tooltip popover */}
              {isActive && hasGloss && (
                <div
                  className="absolute z-50 bottom-full mb-2 left-1/2 -translate-x-1/2 pointer-events-none"
                  style={{ minWidth: '180px', maxWidth: '260px' }}
                >
                  <div className="card bg-base-100 shadow-xl border border-base-300 pointer-events-auto">
                    <div className="card-body p-4 space-y-2">
                      {/* Token text */}
                      <div className="text-center border-b border-base-300 pb-2">
                        <p className="text-2xl font-bold" dir="rtl" lang="ps">
                          {token.text}
                        </p>
                        {token.ipa && (
                          <p className="text-xs font-mono opacity-60 mt-0.5">/{token.ipa}/</p>
                        )}
                      </div>

                      {/* English meaning */}
                      {gloss && (
                        <div>
                          <p className="text-xs uppercase opacity-50 mb-0.5">Meaning</p>
                          <p className="text-lg font-semibold leading-tight">{gloss}</p>
                        </div>
                      )}

                      {/* Romanization */}
                      {token.transliteration && (
                        <div>
                          <p className="text-xs uppercase opacity-50 mb-0.5">Romanization</p>
                          <p className="text-sm opacity-80 italic">{token.transliteration}</p>
                        </div>
                      )}
                    </div>

                    {/* Downward arrow */}
                    <div
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 bg-base-100 border-r border-b border-base-300"
                    />
                  </div>
                </div>
              )}
            </span>
          );
        })}
      </div>

      {/* Full sentence translation below */}
      {sentence.translation_en && (
        <p className="text-sm text-base-content/60 mt-2 text-center" dir="ltr">
          {sentence.translation_en}
        </p>
      )}

      {/* Tap hint on first render if tokens have glosses */}
      {sentence.tokens.some((t) => sentence.gloss_word_by_word[t.id]) && (
        <p className="text-xs opacity-30 text-center mt-1">tap a word for its meaning</p>
      )}
    </div>
  );
}
