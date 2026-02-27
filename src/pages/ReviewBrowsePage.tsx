/**
 * ReviewBrowsePage — Vocabulary Browser
 *
 * Browse all SRS cards with filters by state (Due / Learning / Review / All),
 * search by Pashto text, and tap to preview front/back.
 */

import { useEffect, useState } from 'react';
import { srsItemService } from '../services/srsItemService';
import type { SRSItemCard } from '../services/srsItemService';
import { getAllLessons } from '../services/lessonService';

type FilterMode = 'all' | 'due' | 'new' | 'review';

const STATE_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'New', color: 'badge-ghost' },
  1: { label: 'Learning', color: 'badge-warning' },
  2: { label: 'Review', color: 'badge-success' },
  3: { label: 'Relearning', color: 'badge-error' },
};

export default function ReviewBrowsePage() {
  const [cards, setCards] = useState<SRSItemCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      await srsItemService.loadFromDexie();
      const lessons = await getAllLessons();
      for (const l of lessons) srsItemService.registerItemData(l.srs);
      setCards(srsItemService.getAllCards());
      setLoading(false);
    }
    load();
  }, []);

  const now = new Date();

  const filtered = cards.filter((c) => {
    // Filter by state
    if (filter === 'due') {
      const due = new Date(c.card.due) <= now;
      if (!due) return false;
    } else if (filter === 'new') {
      if (c.card.state !== 0) return false;
    } else if (filter === 'review') {
      if (c.card.state !== 2) return false;
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const frontText = c.item.flip?.front ?? c.item.cloze?.template ?? '';
      const backText = c.item.flip?.back?.translation_en ?? c.item.cloze?.translation_en ?? '';
      if (!frontText.toLowerCase().includes(q) && !backText.toLowerCase().includes(q)) return false;
    }

    return true;
  });

  const dueCount = cards.filter((c) => new Date(c.card.due) <= now).length;
  const newCount = cards.filter((c) => c.card.state === 0).length;
  const reviewCount = cards.filter((c) => c.card.state === 2).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1">Vocabulary Browser</h1>
        <p className="text-base-content/70">Browse and search all your SRS cards</p>
      </div>

      {/* Filter tabs */}
      <div className="tabs tabs-bordered mb-4">
        <button
          className={`tab ${filter === 'all' ? 'tab-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All <span className="ml-1 badge badge-sm">{cards.length}</span>
        </button>
        <button
          className={`tab ${filter === 'due' ? 'tab-active' : ''}`}
          onClick={() => setFilter('due')}
        >
          Due <span className={`ml-1 badge badge-sm ${dueCount > 0 ? 'badge-error' : ''}`}>{dueCount}</span>
        </button>
        <button
          className={`tab ${filter === 'new' ? 'tab-active' : ''}`}
          onClick={() => setFilter('new')}
        >
          New <span className="ml-1 badge badge-sm">{newCount}</span>
        </button>
        <button
          className={`tab ${filter === 'review' ? 'tab-active' : ''}`}
          onClick={() => setFilter('review')}
        >
          Mature <span className="ml-1 badge badge-sm badge-success">{reviewCount}</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search Pashto or English..."
          className="input input-bordered w-full"
        />
      </div>

      {/* Results count */}
      <p className="text-sm opacity-60 mb-3">{filtered.length} card{filtered.length !== 1 ? 's' : ''}</p>

      {/* Cards list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 opacity-50">
          <p className="text-lg">No cards found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => {
            const isFlip = c.item.srs_type === 'flip';
            const isCloze = c.item.srs_type === 'cloze';
            const isExpanded = expanded === c.srs_id;
            const isDue = new Date(c.card.due) <= now;
            const stateInfo = STATE_LABELS[c.card.state] ?? { label: 'Unknown', color: 'badge-ghost' };
            const daysUntilDue = Math.ceil((new Date(c.card.due).getTime() - now.getTime()) / 86400000);

            const frontText = isFlip ? c.item.flip?.front : c.item.cloze?.template.replace(/\{\{\d+\}\}/g, '___');
            const backText = isFlip ? c.item.flip?.back?.translation_en : c.item.cloze?.translation_en;

            return (
              <div
                key={c.srs_id}
                className={`card bg-base-100 shadow-sm border cursor-pointer transition-all
                  ${isExpanded ? 'border-primary shadow-md' : 'border-base-300 hover:border-base-content/20'}
                  ${isDue ? 'border-l-4 border-l-error' : ''}`}
                onClick={() => setExpanded(isExpanded ? null : c.srs_id)}
              >
                <div className="card-body py-3 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-lg font-medium truncate"
                        dir={isFlip || isCloze ? 'rtl' : 'ltr'}
                        lang={isFlip || isCloze ? 'ps' : undefined}
                      >
                        {frontText}
                      </p>
                      {!isExpanded && (
                        <p className="text-sm opacity-60 truncate">{backText}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`badge badge-sm ${stateInfo.color}`}>{stateInfo.label}</span>
                      {isDue && <span className="badge badge-error badge-sm">Due</span>}
                      {!isDue && c.card.state > 0 && (
                        <span className="text-xs opacity-50">
                          {daysUntilDue > 1 ? `in ${daysUntilDue}d` : 'tomorrow'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded view */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-base-300">
                      <div className="grid grid-cols-2 gap-4 mb-3">
                        <div>
                          <p className="text-xs opacity-50 mb-1">Back / Answer</p>
                          <p className="font-medium">{backText}</p>
                          {isFlip && c.item.flip?.back?.transliteration && (
                            <p className="text-sm opacity-60 italic">{c.item.flip.back.transliteration}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs opacity-50 mb-1">Memory stats</p>
                          <p className="text-sm">Stability: <strong>{c.card.stability.toFixed(1)}d</strong></p>
                          <p className="text-sm">Reps: <strong>{c.card.reps}</strong></p>
                          {c.card.lapses > 0 && (
                            <p className="text-sm text-error">Lapses: <strong>{c.card.lapses}</strong></p>
                          )}
                        </div>
                      </div>
                      <p className="text-xs opacity-40">
                        Card type: {c.item.srs_type} | ID: {c.srs_id.slice(0, 8)}…
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
