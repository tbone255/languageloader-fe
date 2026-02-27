/**
 * DrillPage — Adaptive drill mode
 *
 * Targets the user's weakest SRS cards (low stability or high difficulty)
 * in a focused 10-card review session. No new content — pure reinforcement.
 *
 * Design decision: "weak" = stability < 5 (card hasn't stabilised in memory yet)
 * OR lapses > 2 (repeatedly forgotten). We sort by stability ascending so the
 * most fragile cards come first.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Rating } from 'ts-fsrs';
import { srsItemService } from '../services/srsItemService';
import type { SRSItemCard } from '../services/srsItemService';
import { getAllLessons } from '../services/lessonService';
import { appendReviewEvent } from '../services/syncService';
import { trackEvent } from '../services/analyticsService';

const DRILL_SIZE = 10;
const WEAK_STABILITY_THRESHOLD = 5;

interface DrillCard {
  card: SRSItemCard;
  showAnswer: boolean;
  rated: boolean;
}

type DrillState = 'loading' | 'empty' | 'drilling' | 'done';

export default function DrillPage() {
  const [drillState, setDrillState] = useState<DrillState>('loading');
  const [drillCards, setDrillCards] = useState<DrillCard[]>([]);
  const [pos, setPos] = useState(0);
  const [againCount, setAgainCount] = useState(0);

  useEffect(() => {
    loadDrillCards();
  }, []);

  const loadDrillCards = async () => {
    await srsItemService.loadFromDexie();

    const lessons = await getAllLessons();
    for (const lesson of lessons) {
      srsItemService.registerItemData(lesson.srs);
    }

    // Pull weak cards: low stability OR repeated lapses, excluding brand-new (state=0)
    const allCards = srsItemService.getAllCards();
    const weak = allCards
      .filter((c) => c.card.state > 0) // exclude new cards
      .filter((c) => c.card.stability < WEAK_STABILITY_THRESHOLD || c.card.lapses > 2)
      .sort((a, b) => a.card.stability - b.card.stability) // weakest first
      .slice(0, DRILL_SIZE);

    if (weak.length === 0) {
      setDrillState('empty');
      return;
    }

    setDrillCards(weak.map((card) => ({ card, showAnswer: false, rated: false })));
    setPos(0);
    setDrillState('drilling');
    trackEvent('drill_started', { card_count: weak.length });
  };

  const handleShowAnswer = () => {
    setDrillCards((cards) =>
      cards.map((c, i) => (i === pos ? { ...c, showAnswer: true } : c))
    );
  };

  const handleGrade = (rating: Rating) => {
    const current = drillCards[pos];
    if (!current || current.rated) return;

    srsItemService.gradeCard(current.card.srs_id, rating);
    const ratingNum = (
      { [Rating.Again]: 1, [Rating.Hard]: 2, [Rating.Good]: 3, [Rating.Easy]: 4 } as Record<number, 1 | 2 | 3 | 4>
    )[rating] ?? 3;
    appendReviewEvent(current.card.srs_id, ratingNum).catch(() => {});

    if (rating === Rating.Again) setAgainCount((n) => n + 1);

    setDrillCards((cards) =>
      cards.map((c, i) => (i === pos ? { ...c, rated: true } : c))
    );

    if (pos + 1 >= drillCards.length) {
      trackEvent('drill_completed', {
        card_count: drillCards.length,
        again_count: againCount + (rating === Rating.Again ? 1 : 0),
      });
      setDrillState('done');
    } else {
      setPos((p) => p + 1);
    }
  };

  if (drillState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (drillState === 'empty') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">💪</div>
            <h2 className="card-title text-3xl justify-center mb-4">No weak cards!</h2>
            <p className="text-lg mb-2">All your cards have stability ≥ {WEAK_STABILITY_THRESHOLD}.</p>
            <p className="text-base-content/60 mb-6">
              Keep completing lessons to build a bigger deck, then come back to drill.
            </p>
            <div className="card-actions justify-center">
              <Link to="/learn" className="btn btn-primary">Go to Lessons</Link>
              <Link to="/review" className="btn btn-outline">Regular Review</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (drillState === 'done') {
    const goodCount = drillCards.length - againCount;
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="card-title text-3xl justify-center mb-4">Drill complete!</h2>

            <div className="stats shadow mb-6">
              <div className="stat">
                <div className="stat-title">Drilled</div>
                <div className="stat-value text-2xl">{drillCards.length}</div>
                <div className="stat-desc">weak cards</div>
              </div>
              <div className="stat">
                <div className="stat-title">Remembered</div>
                <div className="stat-value text-2xl text-success">{goodCount}</div>
                <div className="stat-desc">Hard / Good / Easy</div>
              </div>
              <div className="stat">
                <div className="stat-title">Forgotten</div>
                <div className="stat-value text-2xl text-error">{againCount}</div>
                <div className="stat-desc">Again</div>
              </div>
            </div>

            <p className="text-base-content/60 mb-6">
              Cards you rated "Again" will resurface sooner for more practice.
            </p>

            <div className="card-actions justify-center gap-4">
              <Link to="/learn" className="btn btn-outline">Back to Lessons</Link>
              <Link to="/review" className="btn btn-primary">Full Review</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Drilling state
  const current = drillCards[pos];
  const progress = (pos / drillCards.length) * 100;
  const card = current.card;
  const isFlip = card.item.srs_type === 'flip';
  const isCloze = card.item.srs_type === 'cloze';

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-lg">Adaptive Drill</h2>
          <p className="text-sm opacity-60">Targeting your {drillCards.length} weakest cards</p>
        </div>
        <Link to="/learn" className="btn btn-ghost btn-sm">Exit</Link>
      </div>

      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>{pos + 1} of {drillCards.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <progress className="progress progress-accent w-full" value={progress} max="100"></progress>
      </div>

      {/* Stability badge */}
      <div className="flex gap-2 mb-4">
        <div className="badge badge-outline badge-sm">
          Stability: {card.card.stability.toFixed(1)}d
        </div>
        {card.card.lapses > 0 && (
          <div className="badge badge-error badge-outline badge-sm">
            Lapses: {card.card.lapses}
          </div>
        )}
      </div>

      {/* Card */}
      <div className="card bg-base-100 shadow-lg min-h-[300px]">
        <div className="card-body flex flex-col justify-center items-center text-center">
          {/* Front */}
          <div className="w-full mb-4">
            {isFlip && card.item.flip && (
              <>
                <p className="text-sm uppercase opacity-60 mb-2">Front</p>
                <p className="text-4xl" dir="rtl" lang="ps">{card.item.flip.front}</p>
              </>
            )}
            {isCloze && card.item.cloze && (
              <>
                <p className="text-sm uppercase opacity-60 mb-2">Complete the sentence</p>
                <p className="text-3xl leading-relaxed" dir="rtl" lang="ps">
                  {card.item.cloze.template.replace(/\{\{\d+\}\}/g, '___')}
                </p>
              </>
            )}
          </div>

          {/* Answer */}
          {current.showAnswer && (
            <>
              <div className="divider w-full"></div>
              <div className="w-full">
                {isFlip && card.item.flip && (
                  <>
                    <p className="text-sm uppercase opacity-60 mb-2">Back</p>
                    <p className="text-2xl mb-1">{card.item.flip.back.translation_en}</p>
                    {card.item.flip.back.transliteration && (
                      <p className="text-lg opacity-70">{card.item.flip.back.transliteration}</p>
                    )}
                    {card.item.flip.back.ipa && (
                      <p className="text-base opacity-50">/{card.item.flip.back.ipa}/</p>
                    )}
                  </>
                )}
                {isCloze && card.item.cloze && (
                  <>
                    <p className="text-sm uppercase opacity-60 mb-2">Answer</p>
                    <p className="text-2xl" dir="rtl" lang="ps">
                      {card.item.cloze.blanks.map((b) => b.fill).join(' / ')}
                    </p>
                    <p className="text-base opacity-70 mt-1">{card.item.cloze.translation_en}</p>
                  </>
                )}
              </div>
            </>
          )}

          {/* Show Answer */}
          {!current.showAnswer && (
            <button onClick={handleShowAnswer} className="btn btn-primary btn-wide mt-8">
              Show Answer
            </button>
          )}

          {/* Rating */}
          {current.showAnswer && !current.rated && (
            <div className="mt-6 w-full">
              <p className="text-sm mb-3 opacity-60">How well did you remember?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button onClick={() => handleGrade(Rating.Again)} className="btn btn-error btn-sm">Again</button>
                <button onClick={() => handleGrade(Rating.Hard)} className="btn btn-warning btn-sm">Hard</button>
                <button onClick={() => handleGrade(Rating.Good)} className="btn btn-success btn-sm">Good</button>
                <button onClick={() => handleGrade(Rating.Easy)} className="btn btn-info btn-sm">Easy</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
