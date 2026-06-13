/**
 * LanguagesPage — the deck dashboard and language picker (the app's home for
 * a signed-in/onboarded user).
 *
 * "My languages": the courses you've added, as Anki-style stat cards.
 * "Explore languages": the rest of the catalog — available ones can be added,
 * the rest show "Coming soon".
 *
 * Today only Pashto is playable and it owns all SRS cards, so its card shows
 * global SRS stats; other enrolled languages (none yet) would show zeros.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LanguageCard, { type CardStats } from '../components/LanguageCard';
import { LANGUAGE_CATALOG, getLanguage, isAvailable, type LanguageMeta } from '../data/languages';
import {
  getMyLanguages,
  addLanguage,
  setActiveLanguage,
} from '../services/userLanguagesService';
import { srsItemService } from '../services/srsItemService';
import { getAllLessons } from '../services/lessonService';

export default function LanguagesPage() {
  const navigate = useNavigate();
  const [myCodes, setMyCodes] = useState<string[]>([]);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Register item data before loading cards so getStats counts them.
      const lessons = await getAllLessons();
      for (const l of lessons) srsItemService.registerItemData(l.srs);
      await srsItemService.loadFromDexie();
      const s = srsItemService.getStats();
      setStats({ new: s.new, learning: s.learning, review: s.review });

      const mine = await getMyLanguages();
      setMyCodes(mine.map((m) => m.code));
      setLoading(false);
    })();
  }, []);

  const enter = async (code: string) => {
    await setActiveLanguage(code);
    navigate('/learn');
  };

  const myLanguages = myCodes
    .map(getLanguage)
    .filter((l): l is LanguageMeta => Boolean(l));
  const exploreLanguages = LANGUAGE_CATALOG.filter((l) => !myCodes.includes(l.code));

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="skeleton h-8 w-48 mb-6" />
        <div className="skeleton h-24 w-full mb-3" />
        <div className="skeleton h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Languages</h1>
        <p className="text-base-content/70 text-sm mt-1">Pick up where you left off, or start something new.</p>
      </div>

      {myLanguages.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">My languages</h2>
          <div className="space-y-3">
            {myLanguages.map((lang) => (
              <LanguageCard
                key={lang.code}
                language={lang}
                stats={isAvailable(lang.code) ? stats ?? undefined : undefined}
                ctaLabel="Continue"
                onCta={() => enter(lang.code)}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">
          {myLanguages.length > 0 ? 'Explore more languages' : 'Choose a language'}
        </h2>
        <div className="space-y-3">
          {exploreLanguages.map((lang) => (
            <LanguageCard
              key={lang.code}
              language={lang}
              ctaLabel={isAvailable(lang.code) ? 'Start' : undefined}
              onCta={
                isAvailable(lang.code)
                  ? async () => {
                      await addLanguage(lang.code);
                      await enter(lang.code);
                    }
                  : undefined
              }
            />
          ))}
        </div>
        <p className="text-center text-xs opacity-50 mt-6">
          More languages are on the way. Pashto is fully playable today.
        </p>
      </section>
    </div>
  );
}
