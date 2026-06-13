/**
 * OnboardingPage
 *
 * Shown on first visit. Collects motivation, experience level.
 * Includes a lesson preview to set expectations.
 * User can proceed as guest or take placement quiz.
 *
 * Issue #73: Added motivation step + lesson preview.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeOnboarding } from '../services/onboardingService';
import { addLanguage, setActiveLanguage } from '../services/userLanguagesService';
import { DEFAULT_LANGUAGE } from '../data/languages';
import { gamificationService } from '../services/gamificationService';
import type { DailyGoalTier } from '../services/gamificationService';

type Step = 'welcome' | 'motivation' | 'goal' | 'experience' | 'preview' | 'done';
type ExperienceLevel = 'none' | 'some' | 'intermediate';
type Motivation = 'heritage' | 'travel' | 'work' | 'culture' | 'challenge';

interface MotivationOption {
  value: Motivation;
  emoji: string;
  label: string;
  sub: string;
}

const MOTIVATIONS: MotivationOption[] = [
  { value: 'heritage', emoji: '🏠', label: 'Heritage connection', sub: 'Learning my ancestral language' },
  { value: 'travel',   emoji: '✈️', label: 'Travel & exploration', sub: 'Planning to visit the region' },
  { value: 'work',     emoji: '💼', label: 'Work or research',    sub: 'Professional or academic need' },
  { value: 'culture',  emoji: '🎭', label: 'Culture & media',     sub: 'Pashto music, films, and literature' },
  { value: 'challenge', emoji: '🧠', label: 'Personal challenge', sub: 'I love learning languages' },
];

const GOAL_OPTIONS: { tier: DailyGoalTier; label: string; xp: number; approx: string }[] = [
  { tier: 'casual',  label: 'Casual',  xp: 50,  approx: '~5–10 min/day' },
  { tier: 'regular', label: 'Regular', xp: 100, approx: '~15 min/day' },
  { tier: 'serious', label: 'Serious', xp: 200, approx: '~30 min/day' },
];

// Sample sentences from lesson 1 for the preview
const PREVIEW_SENTENCES = [
  { ps: 'دا اسپه ده', en: 'This is a mare.' },
  { ps: 'هغه سپی دی', en: 'That is a dog.' },
  { ps: 'دا ګل دی', en: 'This is a flower.' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [motivation, setMotivation] = useState<Motivation>('challenge');
  const [dailyGoalTier, setDailyGoalTier] = useState<DailyGoalTier>('regular');
  const [experience, setExperience] = useState<ExperienceLevel>('none');

  const handleFinish = async () => {
    await completeOnboarding({ daily_goal_minutes: 15, experience_level: experience });
    gamificationService.setDailyGoal(dailyGoalTier);
    localStorage.setItem('languageloader_motivation', motivation);

    // Enroll the one available language so it appears under "My languages".
    await addLanguage(DEFAULT_LANGUAGE);
    await setActiveLanguage(DEFAULT_LANGUAGE);

    if (experience === 'intermediate') {
      navigate('/placement');
    } else {
      navigate('/languages');
    }
  };

  if (step === 'welcome') {
    return (
      <div className="max-w-md mx-auto mt-8 text-center space-y-6 px-4">
        <div className="text-7xl">🌍</div>
        <h1 className="text-4xl font-bold">Learn Pashto.</h1>
        <p className="text-xl opacity-70 leading-relaxed">
          15 minutes a day.<br />
          Science-backed spaced repetition.<br />
          No filler, no ads.
        </p>
        <div className="space-y-2">
          <p className="text-sm opacity-50">Kandahari dialect · A1 → B1+</p>
          <div className="flex justify-center gap-4 text-sm opacity-60">
            <span>📚 100 lessons</span>
            <span>🔄 FSRS algorithm</span>
            <span>📱 Works offline</span>
          </div>
        </div>
        <button className="btn btn-primary btn-lg btn-wide" onClick={() => setStep('motivation')}>
          Get Started — it's free
        </button>
      </div>
    );
  }

  if (step === 'motivation') {
    return (
      <div className="max-w-md mx-auto mt-8 px-4 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">💬</div>
          <h2 className="text-3xl font-bold mb-2">Why are you learning?</h2>
          <p className="opacity-60 text-sm">Helps us personalize your experience</p>
        </div>
        <div className="space-y-2">
          {MOTIVATIONS.map(({ value, emoji, label, sub }) => (
            <button
              key={value}
              onClick={() => setMotivation(value)}
              className={`btn w-full h-auto py-3 flex gap-4 items-center text-left justify-start
                ${motivation === value ? 'btn-primary' : 'btn-outline'}`}
            >
              <span className="text-2xl">{emoji}</span>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-xs opacity-60 font-normal">{sub}</p>
              </div>
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-wide" onClick={() => setStep('goal')}>
          Continue
        </button>
      </div>
    );
  }

  if (step === 'goal') {
    return (
      <div className="max-w-md mx-auto mt-8 px-4 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">🎯</div>
          <h2 className="text-3xl font-bold mb-2">Set a daily goal</h2>
          <p className="opacity-60 text-sm">You can change this anytime in Settings</p>
        </div>
        <div className="space-y-3">
          {GOAL_OPTIONS.map(({ tier, label, xp, approx }) => (
            <button
              key={tier}
              onClick={() => setDailyGoalTier(tier)}
              className={`btn w-full h-auto py-4 flex items-center justify-between text-left
                ${dailyGoalTier === tier ? 'btn-primary' : 'btn-outline'}`}
            >
              <div>
                <p className="font-semibold">{label}</p>
                <p className="text-xs opacity-60 font-normal">{approx}</p>
              </div>
              <span className={`badge ${dailyGoalTier === tier ? 'badge-primary-content' : 'badge-ghost'}`}>
                {xp} XP/day
              </span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-wide" onClick={() => setStep('experience')}>
          Continue
        </button>
      </div>
    );
  }

  if (step === 'experience') {
    return (
      <div className="max-w-md mx-auto mt-8 px-4 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <h2 className="text-3xl font-bold mb-2">Your Pashto level?</h2>
          <p className="opacity-60 text-sm">We'll place you correctly</p>
        </div>
        <div className="space-y-3">
          {([
            { value: 'none',         label: "Complete beginner",       sub: "I don't know any Pashto" },
            { value: 'some',         label: "I know a few words",       sub: "Greetings, numbers, basics" },
            { value: 'intermediate', label: "I've studied before",      sub: "Take a placement quiz to find your level" },
          ] as { value: ExperienceLevel; label: string; sub: string }[]).map(({ value, label, sub }) => (
            <button
              key={value}
              onClick={() => setExperience(value)}
              className={`btn w-full h-auto py-4 flex-col gap-1 justify-start items-start text-left
                ${experience === value ? 'btn-primary' : 'btn-outline'}`}
            >
              <span className="font-semibold">{label}</span>
              <span className="text-xs opacity-60 font-normal">{sub}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-wide" onClick={() => setStep('preview')}>
          Continue
        </button>
      </div>
    );
  }

  if (step === 'preview') {
    return (
      <div className="max-w-md mx-auto mt-8 px-4 space-y-6">
        <div className="text-center">
          <div className="text-4xl mb-3">👀</div>
          <h2 className="text-3xl font-bold mb-2">A sneak peek</h2>
          <p className="opacity-60 text-sm">You'll learn sentences like these in Lesson 1</p>
        </div>

        <div className="card bg-base-100 shadow-md">
          <div className="card-body space-y-4">
            {PREVIEW_SENTENCES.map((s, i) => (
              <div key={i} className="border-b border-base-300 last:border-0 pb-3 last:pb-0">
                <p className="text-2xl font-bold" dir="rtl" lang="ps">{s.ps}</p>
                <p className="text-sm opacity-60 mt-0.5">{s.en}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-base-200 rounded-lg p-4">
          <p className="text-sm font-medium mb-1">How it works:</p>
          <ul className="text-sm space-y-1.5 opacity-70">
            <li>✅ Complete exercises to earn XP and cards</li>
            <li>🔄 Review cards using spaced repetition (FSRS)</li>
            <li>🔥 Build a daily streak to stay consistent</li>
          </ul>
        </div>

        <button className="btn btn-primary btn-wide btn-lg" onClick={() => setStep('done')}>
          I'm ready!
        </button>
      </div>
    );
  }

  // done step
  return (
    <div className="max-w-md mx-auto mt-8 text-center px-4 space-y-6">
      <div className="text-6xl">🚀</div>
      <h2 className="text-3xl font-bold">Let's go!</h2>
      <div className="card bg-base-100 shadow-md">
        <div className="card-body">
          <div className="flex justify-between items-center py-1">
            <span className="opacity-60">Daily goal</span>
            <span className="font-semibold capitalize">{dailyGoalTier}</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="opacity-60">Starting level</span>
            <span className="font-semibold capitalize">
              {experience === 'intermediate' ? 'Placement quiz' : experience === 'some' ? 'Lesson 1' : 'Absolute beginner'}
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <button className="btn btn-primary btn-lg btn-wide" onClick={handleFinish}>
          {experience === 'intermediate' ? 'Take Placement Quiz' : 'Start Learning'}
        </button>
        <p className="text-xs opacity-50">
          Progress saved locally. Sign in anytime to sync across devices.
        </p>
      </div>
    </div>
  );
}
