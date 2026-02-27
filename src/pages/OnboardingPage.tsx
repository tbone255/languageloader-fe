/**
 * OnboardingPage
 *
 * Shown on first visit. Collects goal, experience level, motivation.
 * User can proceed as guest or sign up.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { completeOnboarding } from '../services/onboardingService';

type Step = 'welcome' | 'goal' | 'experience' | 'done';
type ExperienceLevel = 'none' | 'some' | 'intermediate';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [goalMinutes, setGoalMinutes] = useState(10);
  const [experience, setExperience] = useState<ExperienceLevel>('none');

  const handleFinish = async () => {
    await completeOnboarding({ daily_goal_minutes: goalMinutes, experience_level: experience });
    // Store goal for StreakBar (sync, fast)
    localStorage.setItem('languageloader_onboarding_goal', String(goalMinutes));
    navigate('/learn');
  };

  if (step === 'welcome') {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-8 px-4">
        <div className="text-6xl">🌍</div>
        <h1 className="text-4xl font-bold">Learn Pashto.</h1>
        <p className="text-lg opacity-70">15 minutes a day. Science-backed. No filler.</p>
        <button className="btn btn-primary btn-lg btn-wide" onClick={() => setStep('goal')}>
          Get Started
        </button>
      </div>
    );
  }

  if (step === 'goal') {
    return (
      <div className="max-w-md mx-auto mt-12 px-4 space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-4">🎯</div>
          <h2 className="text-3xl font-bold mb-2">Set a daily goal</h2>
          <p className="opacity-60">How long do you want to study each day?</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[5, 10, 15, 20].map((mins) => (
            <button
              key={mins}
              onClick={() => setGoalMinutes(mins)}
              className={`btn btn-lg h-auto py-6 flex-col gap-1 ${goalMinutes === mins ? 'btn-primary' : 'btn-outline'}`}
            >
              <span className="text-2xl font-bold">{mins}</span>
              <span className="text-xs opacity-70">min / day</span>
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
      <div className="max-w-md mx-auto mt-12 px-4 space-y-8">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className="text-3xl font-bold mb-2">Your Pashto level?</h2>
          <p className="opacity-60">We'll start you at the right place.</p>
        </div>
        <div className="space-y-3">
          {([
            { value: 'none',         label: "I'm a complete beginner",        sub: "Start from lesson 1" },
            { value: 'some',         label: "I know a few words",              sub: "Start from lesson 1 with a quick review" },
            { value: 'intermediate', label: "I've studied Pashto before",      sub: "Start from lesson 1 (placement assessment coming soon)" },
          ] as { value: ExperienceLevel; label: string; sub: string }[]).map(({ value, label, sub }) => (
            <button
              key={value}
              onClick={() => setExperience(value)}
              className={`btn btn-lg h-auto py-4 flex-col gap-1 w-full justify-start text-left ${experience === value ? 'btn-primary' : 'btn-outline'}`}
            >
              <span className="font-semibold">{label}</span>
              <span className="text-xs opacity-60 font-normal">{sub}</span>
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-wide" onClick={() => setStep('done')}>
          Continue
        </button>
      </div>
    );
  }

  // done step
  return (
    <div className="max-w-md mx-auto mt-12 text-center px-4 space-y-8">
      <div className="text-6xl">✅</div>
      <h2 className="text-3xl font-bold">You're all set!</h2>
      <p className="opacity-70">
        Goal: <strong>{goalMinutes} min/day</strong>.<br />
        Let's start your first lesson.
      </p>
      <div className="space-y-3">
        <button className="btn btn-primary btn-lg btn-wide" onClick={handleFinish}>
          Start Learning
        </button>
        <p className="text-xs opacity-50">
          Your progress is saved locally. Sign up anytime to sync across devices.
        </p>
      </div>
    </div>
  );
}
