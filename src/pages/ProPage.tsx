/**
 * ProPage — Pro Tier Feature Showcase
 *
 * Displays the full feature list for a potential Pro subscription.
 * No payment flow yet — collects email interest for future launch.
 *
 * Design decision: don't lock any existing features. Pro is purely additive.
 * Gate hooks are placed here so the conversion trigger can be added later.
 */

import { useState } from 'react';

const FREE_FEATURES = [
  { icon: '📚', label: 'All lessons (lessons 1–100)' },
  { icon: '🔄', label: 'Spaced repetition (FSRS)' },
  { icon: '🔥', label: 'Daily streaks and XP' },
  { icon: '🎯', label: 'Adaptive drill mode' },
  { icon: '📱', label: 'Works offline (PWA)' },
  { icon: '☁️', label: 'Progress sync across devices' },
];

const PRO_FEATURES = [
  { icon: '🎙️', label: 'Speaking exercises + pronunciation feedback', soon: false },
  { icon: '🤖', label: 'AI conversation partner', soon: false },
  { icon: '🖼️', label: 'AI-generated imagery for every word', soon: false },
  { icon: '🔊', label: 'Native speaker audio for all sentences', soon: false },
  { icon: '📊', label: 'Advanced analytics + weak-point reports', soon: false },
  { icon: '🗓️', label: 'Custom study schedules', soon: false },
  { icon: '🛡️', label: 'Unlimited streak freezes', soon: false },
  { icon: '💬', label: 'Community forums + tutor access', soon: false },
  { icon: '📖', label: 'Downloadable PDF lesson books', soon: false },
  { icon: '🏆', label: 'Certificates of completion', soon: false },
];

export default function ProPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleInterest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    // Store locally for now — will connect to a server waitlist table later
    const list: string[] = JSON.parse(localStorage.getItem('ll_pro_waitlist') ?? '[]');
    if (!list.includes(email)) list.push(email);
    localStorage.setItem('ll_pro_waitlist', JSON.stringify(list));
    setSubmitted(true);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10">
      {/* Hero */}
      <div className="text-center py-8">
        <div className="text-5xl mb-4">💎</div>
        <h1 className="text-4xl font-bold mb-3">LanguageLoader Pro</h1>
        <p className="text-xl text-base-content/70 max-w-xl mx-auto">
          Everything in Free, plus AI-powered tools, native audio, and speaking practice to get you to fluency faster.
        </p>
        <div className="badge badge-warning badge-lg mt-4">Coming Soon</div>
      </div>

      {/* Feature comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <div className="card bg-base-100 shadow-md border border-base-300">
          <div className="card-body">
            <div className="badge badge-ghost mb-3">Free — Always</div>
            <h2 className="card-title text-xl mb-4">Core Learning</h2>
            <ul className="space-y-3">
              {FREE_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  <span className="text-xl">{f.icon}</span>
                  <span className="text-sm">{f.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pro */}
        <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 shadow-md border border-primary/30">
          <div className="card-body">
            <div className="badge badge-primary mb-3">Pro</div>
            <h2 className="card-title text-xl mb-4">
              Supercharged
              <span className="text-sm font-normal opacity-60 ml-2">Everything in Free, plus:</span>
            </h2>
            <ul className="space-y-3">
              {PRO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-3">
                  <span className="text-xl">{f.icon}</span>
                  <span className="text-sm">{f.label}</span>
                  {f.soon && <span className="badge badge-ghost badge-xs self-center">Soon</span>}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Waitlist */}
      <div className="card bg-base-100 shadow-md">
        <div className="card-body text-center">
          {submitted ? (
            <>
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="card-title text-xl justify-center mb-2">You're on the list!</h2>
              <p className="text-base-content/70">
                We'll email you when Pro launches. Early joiners get a discount.
              </p>
            </>
          ) : (
            <>
              <h2 className="card-title text-xl justify-center mb-2">Join the waitlist</h2>
              <p className="text-base-content/70 mb-4">
                Be first to know when Pro launches. Early birds get 30% off for life.
              </p>
              <form onSubmit={handleInterest} className="flex gap-3 max-w-sm mx-auto">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="input input-bordered flex-1"
                  required
                />
                <button type="submit" className="btn btn-primary">
                  Join
                </button>
              </form>
              <p className="text-xs opacity-50 mt-3">No spam. Unsubscribe anytime.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
