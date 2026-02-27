/**
 * GrammarHintCard
 *
 * Shown after a wrong answer when the exercise carries a grammar_hint.
 * Dismissible overlay that explains the relevant grammar rule before
 * the user moves on to the next exercise.
 */

import type { GrammarHint } from '../../types/lesson';

interface GrammarHintCardProps {
  hint: GrammarHint;
  onDismiss: () => void;
}

export default function GrammarHintCard({ hint, onDismiss }: GrammarHintCardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="card bg-base-100 shadow-2xl w-full max-w-lg animate-slideUp">
        <div className="card-body">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-lg">Grammar tip</h3>
              <p className="text-base-content/70 text-sm">Let's review this rule before continuing</p>
            </div>
          </div>

          <div className="bg-base-200 rounded-lg p-4 mb-4">
            <p className="text-base leading-relaxed">{hint.rule}</p>
          </div>

          {hint.example_target && (
            <div className="border border-base-300 rounded-lg p-3 mb-4">
              <p className="text-sm opacity-60 mb-1">Example</p>
              <p className="text-xl font-medium" dir="rtl" lang="ps">{hint.example_target}</p>
              <p className="text-sm opacity-70 mt-1">{hint.example_en}</p>
            </div>
          )}

          <div className="card-actions justify-end">
            <button onClick={onDismiss} className="btn btn-primary btn-wide">
              Got it — continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
