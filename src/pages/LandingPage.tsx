/**
 * LandingPage — the signed-out welcome screen.
 *
 * Guest-first: "Get started" goes straight into onboarding (no account
 * required; the app runs locally). "Sign in" uses Replit Auth and only shows
 * when an auth backend is present (authAvailable). After signing in, returning
 * users skip this screen via the redirect at "/".
 */

import { useNavigate } from 'react-router-dom';
import { useAuth, signIn } from '../hooks/useAuth';
import FlagIcon from '../components/FlagIcon';
import { LANGUAGE_CATALOG } from '../data/languages';

const FEATURES = [
  { icon: '🧠', title: 'Spaced repetition', desc: 'An FSRS scheduler keeps you above 90% retention with the fewest reviews.' },
  { icon: '🗣️', title: 'Real language', desc: 'Lessons built from attested sentences with native audio — not phrasebook filler.' },
  { icon: '📈', title: 'Track everything', desc: 'Streaks, daily goals, and per-card stats, all stored on your device.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { authAvailable } = useAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="navbar bg-base-200 px-4">
        <div className="flex-1 text-lg font-bold">LanguageLoader</div>
        {authAvailable && (
          <button className="btn btn-ghost btn-sm" onClick={() => signIn()}>
            Sign in
          </button>
        )}
      </header>

      <main className="flex-1 container mx-auto px-4 max-w-3xl flex flex-col items-center text-center justify-center py-12">
        <div className="flex gap-2 mb-6">
          {LANGUAGE_CATALOG.slice(0, 6).map((l) => (
            <FlagIcon key={l.code} code={l.flag} className="w-8 h-8 rounded-full shadow-sm" />
          ))}
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
          Learn a language the way memory actually works.
        </h1>
        <p className="text-base-content/70 mt-4 max-w-xl">
          Science-backed spaced repetition, native audio, and lessons built from real language.
          Starting with Pashto — more on the way.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/onboarding')}>
            Get started
          </button>
          {authAvailable && (
            <button className="btn btn-ghost btn-lg" onClick={() => signIn()}>
              I already have an account
            </button>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mt-16 text-left">
          {FEATURES.map((f) => (
            <div key={f.title} className="card bg-base-100 shadow-sm border border-base-300">
              <div className="card-body p-5">
                <div className="text-2xl mb-1">{f.icon}</div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm opacity-60 mt-1">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
