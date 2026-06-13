// RedirectPage
// Entry point at "/". Onboarded users go to the language dashboard; everyone
// else sees the landing page (which routes into onboarding).

import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { isOnboardingComplete } from '../services/onboardingService';

export default function RedirectPage() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    isOnboardingComplete().then((done) => setTarget(done ? '/languages' : '/welcome'));
  }, []);

  if (!target) return null;
  return <Navigate to={target} replace />;
}
