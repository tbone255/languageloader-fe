/**
 * SRSReview Component
 *
 * Reviews SRS items from the new lesson schema.
 * Supports both flip cards and cloze deletion cards.
 */

import { useState, useEffect } from 'react';
import { Rating } from 'ts-fsrs';
import { srsItemService } from '../services/srsItemService';
import type { SRSItemCard } from '../services/srsItemService';
import { getAllLessons } from '../services/lessonService';
import { appendReviewEvent } from '../services/syncService';
import { gamificationService } from '../services/gamificationService';
import { trackEvent, trackReviewSessionComplete, trackSrsCardReviewed } from '../services/analyticsService';
import type { Sentence } from '../types/lesson';
import TokenizedText from './TokenizedText';
import AudioButton from './AudioButton';
import Mascot from './Mascot';

export default function SRSReview() {
  const [dueCards, setDueCards] = useState<SRSItemCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sentences, setSentences] = useState<Map<string, Sentence>>(new Map());
  // sentence_id → lesson_id, used to build AudioButton URLs on flip/cloze cards
  const [sentenceLesson, setSentenceLesson] = useState<Map<string, string>>(new Map());
  const [sessionComplete, setSessionComplete] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [sessionStartMs] = useState(() => Date.now());
  const [newCardStats, setNewCardStats] = useState({ limit: 10, seenToday: 0, remaining: 10 });

  useEffect(() => {
    loadCardsAndData();
  }, []);

  const loadCardsAndData = async () => {
    // Load card states from Dexie (falls back to localStorage automatically)
    await srsItemService.loadFromDexie();

    // Load all lessons to get SRS item definitions (content)
    // This only registers item data, doesn't create new cards
    const lessons = await getAllLessons();
    const sentenceMap = new Map<string, Sentence>();
    const sentenceLessonMap = new Map<string, string>();

    for (const lesson of lessons) {
      srsItemService.registerItemData(lesson.srs);
      lesson.sentences.forEach((s) => {
        sentenceMap.set(s.sentence_id, s);
        sentenceLessonMap.set(s.sentence_id, lesson.lesson_meta.lesson_id);
      });
    }

    setSentences(sentenceMap);
    setSentenceLesson(sentenceLessonMap);

    // Get due cards (only includes cards created when lessons were completed)
    // New cards are capped by daily limit based on goal tier
    const due = srsItemService.getDueCards();
    setDueCards(due);
    setNewCardStats(srsItemService.getNewCardStats());
    setIsLoaded(true);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
  };

  const handleGrade = (rating: Rating) => {
    const currentCard = dueCards[currentCardIndex];
    if (!currentCard) return;

    // Track analytics before grading (stability_before)
    trackSrsCardReviewed(
      currentCard.item.srs_type,
      rating,
      currentCard.card.stability,
      currentCard.card.lapses,
    );

    // Grade the card and log review event for cross-device sync
    srsItemService.gradeCard(currentCard.srs_id, rating);
    const ratingNum = ({ [Rating.Again]: 1, [Rating.Hard]: 2, [Rating.Good]: 3, [Rating.Easy]: 4 } as Record<number, 1|2|3|4>)[rating] ?? 3;
    appendReviewEvent(currentCard.srs_id, ratingNum).catch(() => {});

    // Move to next card
    if (currentCardIndex < dueCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
    } else {
      // Session complete — record XP and show completion screen
      const { xpEarned: earned } = gamificationService.recordReviewSession(dueCards.length);
      const durationMs = Date.now() - sessionStartMs;
      trackReviewSessionComplete(dueCards.length, earned, durationMs);
      trackEvent('streak_updated', { source: 'review' });
      setXpEarned(earned);
      setSessionComplete(true);
    }
  };

  if (!isLoaded) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-3 bg-base-300 rounded-full w-full" />
        <div className="card bg-base-100 shadow-lg min-h-[400px]">
          <div className="card-body flex flex-col items-center justify-center gap-6">
            <div className="h-4 bg-base-300 rounded w-20" />
            <div className="h-14 bg-base-300 rounded w-56" />
            <div className="h-4 bg-base-300 rounded w-40" />
            <div className="h-12 bg-base-300 rounded-xl w-48 mt-8" />
          </div>
        </div>
        <div className="h-20 bg-base-200 rounded-xl w-full" />
      </div>
    );
  }

  if (sessionComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <div className="flex justify-center mb-4">
              <Mascot expression="celebrating" size={100} />
            </div>
            <h2 className="card-title text-3xl justify-center mb-4">Review Complete!</h2>
            <div className="stats shadow mb-6">
              <div className="stat">
                <div className="stat-title">Reviewed</div>
                <div className="stat-value text-2xl">{dueCards.length}</div>
                <div className="stat-desc">cards</div>
              </div>
              <div className="stat">
                <div className="stat-title">XP Earned</div>
                <div className="stat-value text-2xl text-primary">+{xpEarned}</div>
                <div className="stat-desc">keep reviewing!</div>
              </div>
            </div>
            <p className="text-base-content/60 mb-4">Cards you rated Again will resurface sooner.</p>
            <div className="card-actions justify-center gap-3">
              <a href="/learn" className="btn btn-outline">Back to Lessons</a>
              <a href="/review/browse" className="btn btn-ghost btn-sm">Browse Cards</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (dueCards.length === 0) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <div className="flex justify-center mb-4">
              <Mascot expression="happy" size={100} />
            </div>
            <h2 className="card-title text-3xl justify-center mb-4">All Done!</h2>
            <p className="text-lg mb-6">You have no cards due for review right now.</p>
            {newCardStats.seenToday >= newCardStats.limit ? (
              <p className="text-base-content/60 text-sm">
                You've reached today's limit of {newCardStats.limit} new cards.
                Review cards will reappear tomorrow.
              </p>
            ) : (
              <p className="text-base-content/60">Complete more lessons to add new cards.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const currentCard = dueCards[currentCardIndex];
  const progress = ((currentCardIndex + 1) / dueCards.length) * 100;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>
            Card {currentCardIndex + 1} of {dueCards.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <progress className="progress progress-primary w-full" value={progress} max="100"></progress>
      </div>

      {/* Card */}
      <div className="card bg-base-100 shadow-lg min-h-[400px]">
        <div className="card-body flex flex-col justify-center items-center text-center">
          {currentCard.item.srs_type === 'flip' && renderFlipCard(currentCard, showAnswer, sentences, sentenceLesson)}
          {currentCard.item.srs_type === 'cloze' && renderClozeCard(currentCard, showAnswer, sentences, sentenceLesson)}
          {currentCard.item.srs_type === 'flip_reverse' && renderFlipReverseCard(currentCard, showAnswer)}
          {currentCard.item.srs_type === 'audio_to_text' && renderAudioToTextCard(currentCard, showAnswer)}
          {currentCard.item.srs_type === 'pattern_prompt' && renderPatternPromptCard(currentCard, showAnswer)}

          {/* Show Answer button */}
          {!showAnswer && (
            <button onClick={handleShowAnswer} className="btn btn-primary btn-wide mt-8">
              Show Answer
            </button>
          )}

          {/* Rating buttons */}
          {showAnswer && (
            <div className="mt-8 w-full">
              <p className="text-sm mb-4 opacity-60">How well did you remember?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <button onClick={() => handleGrade(Rating.Again)} className="btn btn-error">
                  Again
                </button>
                <button onClick={() => handleGrade(Rating.Hard)} className="btn btn-warning">
                  Hard
                </button>
                <button onClick={() => handleGrade(Rating.Good)} className="btn btn-success">
                  Good
                </button>
                <button onClick={() => handleGrade(Rating.Easy)} className="btn btn-info">
                  Easy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="stats shadow mt-6 w-full">
        <div className="stat">
          <div className="stat-title">Remaining</div>
          <div className="stat-value text-2xl">{dueCards.length - currentCardIndex - 1}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Reviewed</div>
          <div className="stat-value text-2xl">{currentCardIndex}</div>
        </div>
        <div className="stat">
          <div className="stat-title">New Today</div>
          <div className="stat-value text-2xl">{newCardStats.seenToday}/{newCardStats.limit}</div>
          <div className="stat-desc">daily limit</div>
        </div>
      </div>
    </div>
  );
}

function renderFlipCard(
  card: SRSItemCard,
  showAnswer: boolean,
  sentences: Map<string, Sentence>,
  sentenceLesson: Map<string, string>,
) {
  const flip = card.item.flip;
  if (!flip) return null;

  const sourceId = card.item.source_sentence_id;
  const sourceSentence = sourceId ? sentences.get(sourceId) : null;
  const lessonId = sourceId ? sentenceLesson.get(sourceId) : null;

  // Check if the front is a single word (vocab card) vs full sentence
  const isSingleWord = !flip.front.includes(' ');

  return (
    <div className="w-full">
      {/* Front */}
      <div className="mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <p className="text-sm uppercase opacity-60">Front</p>
          {lessonId && sourceId && (
            <AudioButton lessonId={lessonId} sentenceId={sourceId} size="sm" />
          )}
        </div>
        {isSingleWord ? (
          <p className="text-5xl" dir="rtl" lang="ps">
            {flip.front}
          </p>
        ) : sourceSentence ? (
          <TokenizedText sentence={sourceSentence} size="4xl" />
        ) : (
          <p className="text-4xl" dir="rtl" lang="ps">
            {flip.front}
          </p>
        )}
      </div>

      {/* Back */}
      {showAnswer && <div className="divider"></div>}
      {showAnswer && (
        <div>
          <p className="text-sm uppercase opacity-60 mb-2">Back</p>
          <p className="text-3xl mb-2">{flip.back.translation_en}</p>
          {flip.back.transliteration && (
            <p className="text-xl opacity-70 mb-1">{flip.back.transliteration}</p>
          )}
          {flip.back.ipa && (
            <p className="text-lg opacity-50">/{flip.back.ipa}/</p>
          )}
        </div>
      )}
    </div>
  );
}

function renderClozeCard(
  card: SRSItemCard,
  showAnswer: boolean,
  _sentences: Map<string, Sentence>,
  sentenceLesson: Map<string, string>,
) {
  const cloze = card.item.cloze;
  if (!cloze) return null;

  // Replace {{0}}, {{1}}, etc. with blanks or fills
  const renderTemplate = () => {
    let text = cloze.template;

    if (showAnswer) {
      // Show fills
      cloze.blanks.forEach((blank) => {
        text = text.replace(`{{${blank.blank_index}}}`, `[${blank.fill}]`);
      });
    } else {
      // Show blanks
      cloze.blanks.forEach((blank) => {
        text = text.replace(`{{${blank.blank_index}}}`, '___');
      });
    }

    return text;
  };

  const sourceId = card.item.source_sentence_id;
  const lessonId = sourceId ? sentenceLesson.get(sourceId) : null;

  return (
    <div className="w-full">
      <div className="mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <p className="text-sm uppercase opacity-60">Complete the sentence</p>
          {lessonId && sourceId && (
            <AudioButton lessonId={lessonId} sentenceId={sourceId} size="sm" />
          )}
        </div>
        <p className="text-4xl leading-relaxed" dir="rtl" lang="ps">
          {renderTemplate()}
        </p>
      </div>

      {showAnswer && (
        <div className="divider"></div>
      )}
      {showAnswer && (
        <div>
          <p className="text-sm uppercase opacity-60 mb-2">Translation</p>
          <p className="text-2xl">{cloze.translation_en}</p>
        </div>
      )}
    </div>
  );
}

/** Reverse flip: English prompt → recall Pashto. */
function renderFlipReverseCard(card: SRSItemCard, showAnswer: boolean) {
  const fr = card.item.flip_reverse;
  if (!fr) return null;

  return (
    <div className="w-full">
      {/* Front: English prompt */}
      <div className="mb-6">
        <p className="text-sm uppercase opacity-60 mb-2">Translate to Pashto</p>
        <p className="text-4xl font-semibold">{fr.front}</p>
      </div>

      {showAnswer && <div className="divider"></div>}
      {showAnswer && (
        <div>
          <p className="text-sm uppercase opacity-60 mb-2">Answer</p>
          <p className="text-5xl" dir="rtl" lang="ps">
            {fr.correct_target}
          </p>
          {fr.choices && fr.choices.length > 0 && (
            <p className="text-xs opacity-40 mt-3">
              Other options: {fr.choices.filter((c) => c !== fr.correct_target).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Audio → text: play audio, recall meaning. */
function renderAudioToTextCard(card: SRSItemCard, showAnswer: boolean) {
  const at = card.item.audio_to_text;
  if (!at) return null;

  return (
    <div className="w-full">
      {/* Prompt: audio play button */}
      <div className="mb-6">
        <p className="text-sm uppercase opacity-60 mb-4">Listen and recall</p>
        <div className="flex justify-center">
          <AudioButton lessonId={at.lesson_id} sentenceId={at.audio_sentence_id} size="lg" />
        </div>
        <p className="text-xs opacity-40 mt-3">Tap to play — what does it mean?</p>
      </div>

      {showAnswer && <div className="divider"></div>}
      {showAnswer && (
        <div className="space-y-3">
          <div>
            <p className="text-sm uppercase opacity-60 mb-1">Pashto</p>
            <p className="text-4xl" dir="rtl" lang="ps">
              {at.correct_text}
            </p>
          </div>
          <div>
            <p className="text-sm uppercase opacity-60 mb-1">English</p>
            <p className="text-2xl">{at.translation_en}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Pattern prompt: given instruction + source word, recall the target form. */
function renderPatternPromptCard(card: SRSItemCard, showAnswer: boolean) {
  const pp = card.item.pattern_prompt;
  if (!pp) return null;

  return (
    <div className="w-full">
      {/* Prompt */}
      <div className="mb-6">
        <p className="text-sm uppercase opacity-60 mb-2">{pp.instruction}</p>
        <p className="text-5xl" dir="rtl" lang="ps">
          {pp.source_word}
        </p>
        <p className="text-lg opacity-60 mt-2">{pp.source_translation}</p>
      </div>

      {showAnswer && <div className="divider"></div>}
      {showAnswer && (
        <div>
          <p className="text-sm uppercase opacity-60 mb-2">Answer</p>
          <p className="text-5xl font-bold" dir="rtl" lang="ps">
            {pp.correct_form}
          </p>
          {pp.choices && pp.choices.length > 0 && (
            <p className="text-xs opacity-40 mt-3">
              Other options: {pp.choices.filter((c) => c !== pp.correct_form).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
