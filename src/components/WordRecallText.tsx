import React, { useRef, useState, useEffect, useCallback } from 'react';
import './WordRecallText.css';

export type WordItem = {
  word: string;
  translation: string;
  pronounciation: string;
};

interface WordRecallTextProps {
  items: WordItem[];
  className?: string;
}

interface HighlightState {
  indices: number[];
  rects: DOMRect[];
}

export const WordRecallText: React.FC<WordRecallTextProps> = ({ items, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [highlightState, setHighlightState] = useState<HighlightState>({ indices: [], rects: [] });
  const [hoveredIndices, setHoveredIndices] = useState<number[]>([]);
  const [isClickActive, setIsClickActive] = useState(false);

  // Compute continuous highlight boxes from highlighted word indices
  const computeHighlightRects = useCallback((indices: number[]): DOMRect[] => {
    if (indices.length === 0 || !containerRef.current) return [];

    const containerRect = containerRef.current.getBoundingClientRect();
    const sortedIndices = [...indices].sort((a, b) => a - b);

    // Group words by line (based on their y position)
    const lineGroups: Map<number, number[]> = new Map();

    sortedIndices.forEach(idx => {
      const wordEl = wordRefs.current[idx];
      if (!wordEl) return;

      const rect = wordEl.getBoundingClientRect();
      const y = Math.round(rect.top);

      if (!lineGroups.has(y)) {
        lineGroups.set(y, []);
      }
      lineGroups.get(y)!.push(idx);
    });

    // Create one continuous rect per line
    const rects: DOMRect[] = [];
    lineGroups.forEach(lineIndices => {
      const lineWordEls = lineIndices
        .map(idx => wordRefs.current[idx])
        .filter(el => el !== null);

      if (lineWordEls.length === 0) return;

      const lineRects = lineWordEls.map(el => el!.getBoundingClientRect());
      const left = Math.min(...lineRects.map(r => r.left));
      const right = Math.max(...lineRects.map(r => r.right));
      const top = Math.min(...lineRects.map(r => r.top));
      const bottom = Math.max(...lineRects.map(r => r.bottom));

      rects.push(new DOMRect(
        left - containerRect.left,
        top - containerRect.top,
        right - left,
        bottom - top
      ));
    });

    return rects;
  }, []);

  // Compute rects for single word hover/click
  const computeSingleWordRects = useCallback((index: number): DOMRect[] => {
    const wordEl = wordRefs.current[index];
    if (!wordEl || !containerRef.current) return [];

    const wordRect = wordEl.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    return [new DOMRect(
      wordRect.left - containerRect.left,
      wordRect.top - containerRect.top,
      wordRect.width,
      wordRect.height
    )];
  }, []);

  // Get indices of words intersecting current selection
  const getSelectedWordIndices = useCallback((): number[] => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [];

    const range = selection.getRangeAt(0);
    if (range.collapsed) return [];

    const indices: number[] = [];

    wordRefs.current.forEach((span, idx) => {
      if (!span) return;

      const wordRange = document.createRange();
      wordRange.selectNodeContents(span);

      // Check if ranges intersect
      if (
        range.compareBoundaryPoints(Range.START_TO_END, wordRange) > 0 &&
        range.compareBoundaryPoints(Range.END_TO_START, wordRange) < 0
      ) {
        indices.push(idx);
      }
    });

    return indices;
  }, []);

  // Handle selection change
  const handleSelectionChange = useCallback(() => {
    const indices = getSelectedWordIndices();
    if (indices.length > 0) {
      const rects = computeHighlightRects(indices);
      setHighlightState({ indices, rects });
      setIsClickActive(true);
      setHoveredIndices([]);
    }
  }, [getSelectedWordIndices, computeHighlightRects]);

  // Handle hover
  const handleWordMouseEnter = useCallback((index: number) => {
    if (!isClickActive) {
      const rects = computeSingleWordRects(index);
      setHoveredIndices([index]);
      setHighlightState({ indices: [index], rects });
    }
  }, [isClickActive, computeSingleWordRects]);

  const handleWordMouseLeave = useCallback(() => {
    if (!isClickActive) {
      setHoveredIndices([]);
      setHighlightState({ indices: [], rects: [] });
    }
  }, [isClickActive]);

  // Handle click
  const handleWordClick = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    const rects = computeSingleWordRects(index);
    setHighlightState({ indices: [index], rects });
    setIsClickActive(true);
    setHoveredIndices([]);
  }, [computeSingleWordRects]);

  // Handle click outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setHighlightState({ indices: [], rects: [] });
      setIsClickActive(false);
      setHoveredIndices([]);
      window.getSelection()?.removeAllRanges();
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleSelectionChange, handleClickOutside]);

  // Handle mouseup for drag selection
  const handleMouseUp = useCallback(() => {
    const indices = getSelectedWordIndices();
    if (indices.length > 0) {
      const rects = computeHighlightRects(indices);
      setHighlightState({ indices, rects });
      setIsClickActive(true);
    }
  }, [getSelectedWordIndices, computeHighlightRects]);

  // Get highlighted words data
  const getHighlightedWords = (): WordItem[] => {
    const activeIndices = highlightState.indices;
    if (activeIndices.length === 0) return [];

    const sortedIndices = [...activeIndices].sort((a, b) => a - b);
    return sortedIndices.map(idx => items[idx]);
  };

  // Compute tooltip content
  const renderTooltipContent = () => {
    const words = getHighlightedWords();
    if (words.length === 0) return null;

    return words.map((item, idx) => {
      return (
        <div key={idx} className='tooltip-item'>
          <div className="tooltip-translation">{item.translation}</div>
          <div className="tooltip-pronunciation">{item.pronounciation}</div>
        </div>
      );
    });
  };

  const showTooltip = highlightState.indices.length > 0 && highlightState.rects.length > 0;

  // Calculate tooltip position - centered above the first rect
  const getTooltipPosition = () => {
    if (highlightState.rects.length === 0) return { left: 0, top: 0 };
    const firstRect = highlightState.rects[0];
    const lastRect = highlightState.rects[highlightState.rects.length-1];
    return {
      left: firstRect.x + (lastRect.x + lastRect.width - firstRect.x) / 2,
      top: firstRect.y - 8  // Position above with some spacing
    };
  };

  return (
    <div
      ref={containerRef}
      className={`word-recall-container ${className}`}
      onMouseUp={handleMouseUp}
    >
      {/* Continuous highlight background - multiple rects for multi-line */}
      {highlightState.rects.map((rect, idx) => (
        <div
          key={idx}
          className="continuous-highlight"
          style={{
            left: `${rect.x}px`,
            top: `${rect.y}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
          }}
        />
      ))}

      {/* Words */}
      <div className="words-content">
        {items.map((item, idx) => (
          <React.Fragment key={idx}>
            <span
              ref={el => { wordRefs.current[idx] = el; }}
              className={`word ${highlightState.indices.includes(idx) ? 'highlighted' : ''}`}
              onMouseEnter={() => handleWordMouseEnter(idx)}
              onMouseLeave={handleWordMouseLeave}
              onClick={(e) => handleWordClick(idx, e)}
            >
              {item.word}
            </span>
            {idx < items.length - 1 && ' '}
          </React.Fragment>
        ))}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="tooltip"
          role="tooltip"
          style={{
            left: `${getTooltipPosition().left}px`,
            top: `${getTooltipPosition().top}px`,
          }}
        >
          {renderTooltipContent()}
        </div>
      )}
    </div>
  );
};
