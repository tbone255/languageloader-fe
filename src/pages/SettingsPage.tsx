/**
 * SettingsPage
 *
 * User preferences: dyslexia mode, session mode, daily goal, grammar hints.
 * Also data management (reset progress).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { srsItemService } from '../services/srsItemService';
import { gamificationService, DAILY_GOAL_XP } from '../services/gamificationService';
import type { DailyGoalTier, SessionMode } from '../services/gamificationService';

const DYSLEXIA_KEY = 'languageloader_dyslexia_mode';
const GRAMMAR_HINTS_KEY = 'languageloader_grammar_hints_enabled';

function getDyslexiaMode(): boolean {
  return localStorage.getItem(DYSLEXIA_KEY) === 'true';
}

function getGrammarHints(): boolean {
  // Default: enabled
  return localStorage.getItem(GRAMMAR_HINTS_KEY) !== 'false';
}

function applyDyslexiaMode(enabled: boolean): void {
  if (enabled) {
    document.documentElement.setAttribute('data-dyslexia', 'true');
  } else {
    document.documentElement.removeAttribute('data-dyslexia');
  }
  localStorage.setItem(DYSLEXIA_KEY, String(enabled));
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [dyslexia, setDyslexia] = useState(getDyslexiaMode);
  const [grammarHints, setGrammarHints] = useState(getGrammarHints);
  const [sessionMode, setSessionModeState] = useState<SessionMode>(
    () => gamificationService.getSessionMode()
  );
  const [dailyGoal, setDailyGoalState] = useState<DailyGoalTier>(
    () => gamificationService.getState().dailyGoal
  );

  // Apply dyslexia mode on mount (in case page was refreshed)
  useEffect(() => {
    applyDyslexiaMode(dyslexia);
  }, []);

  const handleDyslexiaToggle = () => {
    const next = !dyslexia;
    setDyslexia(next);
    applyDyslexiaMode(next);
  };

  const handleGrammarHintsToggle = () => {
    const next = !grammarHints;
    setGrammarHints(next);
    localStorage.setItem(GRAMMAR_HINTS_KEY, String(next));
  };

  const handleSessionMode = (mode: SessionMode) => {
    setSessionModeState(mode);
    gamificationService.setSessionMode(mode);
  };

  const handleDailyGoal = (goal: DailyGoalTier) => {
    setDailyGoalState(goal);
    gamificationService.setDailyGoal(goal);
  };

  const handleResetProgress = () => {
    localStorage.clear();
    srsItemService.clear();
    setShowConfirm(false);
    navigate('/learn');
    window.location.reload();
  };

  const SESSION_LABELS: Record<SessionMode, { label: string; desc: string }> = {
    quick: { label: 'Quick (5 min)', desc: 'Up to 5 exercises per session' },
    standard: { label: 'Standard (10 min)', desc: 'All exercises in the lesson' },
    extended: { label: 'Extended (20+ min)', desc: 'All exercises + bonus drill cards' },
  };

  const GOAL_LABELS: Record<DailyGoalTier, { label: string; xp: number }> = {
    casual: { label: 'Casual', xp: DAILY_GOAL_XP.casual },
    regular: { label: 'Regular', xp: DAILY_GOAL_XP.regular },
    serious: { label: 'Serious', xp: DAILY_GOAL_XP.serious },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Settings</h1>
        <p className="text-base-content/70">Manage your preferences and data</p>
      </div>

      {/* Daily Goal */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Daily Goal</h2>
          <div className="space-y-2">
            {(Object.keys(GOAL_LABELS) as DailyGoalTier[]).map((tier) => {
              const { label, xp } = GOAL_LABELS[tier];
              return (
                <label key={tier} className="flex items-center gap-3 p-3 rounded-lg bg-base-200 cursor-pointer">
                  <input
                    type="radio"
                    name="dailyGoal"
                    className="radio radio-primary"
                    checked={dailyGoal === tier}
                    onChange={() => handleDailyGoal(tier)}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{label}</span>
                    <span className="text-sm opacity-60 ml-2">— {xp} XP/day</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Session Mode */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Session Length</h2>
          <div className="space-y-2">
            {(Object.keys(SESSION_LABELS) as SessionMode[]).map((mode) => {
              const { label, desc } = SESSION_LABELS[mode];
              return (
                <label key={mode} className="flex items-center gap-3 p-3 rounded-lg bg-base-200 cursor-pointer">
                  <input
                    type="radio"
                    name="sessionMode"
                    className="radio radio-primary"
                    checked={sessionMode === mode}
                    onChange={() => handleSessionMode(mode)}
                  />
                  <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm opacity-60">{desc}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accessibility */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Accessibility</h2>
          <div className="space-y-4">
            {/* Dyslexia mode */}
            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div>
                <p className="font-medium">Dyslexia-friendly mode</p>
                <p className="text-sm opacity-60">Uses Lexend font, larger spacing, increased line height</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={dyslexia}
                onChange={handleDyslexiaToggle}
              />
            </div>

            {/* Grammar hints */}
            <div className="flex items-center justify-between p-3 bg-base-200 rounded-lg">
              <div>
                <p className="font-medium">Grammar hints after wrong answers</p>
                <p className="text-sm opacity-60">Show grammar tips when you make a mistake</p>
              </div>
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={grammarHints}
                onChange={handleGrammarHintsToggle}
              />
            </div>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">About</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="opacity-60">App version</span>
              <span className="font-mono">0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">SRS algorithm</span>
              <span>FSRS v5</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-60">Language</span>
              <span>Pashto (Kandahari dialect)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <h2 className="card-title text-lg mb-4">Data Management</h2>
          <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
            <div>
              <h3 className="font-semibold mb-1">Reset All Progress</h3>
              <p className="text-sm text-base-content/70">
                Clear all lesson progress and SRS cards. This cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowConfirm(true)}
              className="btn btn-error btn-outline"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">Reset All Progress?</h3>
            <p className="mb-4">This will permanently delete:</p>
            <ul className="list-disc list-inside mb-6 space-y-1">
              <li>All lesson completion progress</li>
              <li>All SRS cards and review history</li>
              <li>Streak, XP, and gems</li>
            </ul>
            <p className="text-error font-semibold mb-6">This action cannot be undone.</p>
            <div className="modal-action">
              <button onClick={() => setShowConfirm(false)} className="btn btn-ghost">Cancel</button>
              <button onClick={handleResetProgress} className="btn btn-error">Reset Everything</button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowConfirm(false)}></div>
        </div>
      )}
    </div>
  );
}
