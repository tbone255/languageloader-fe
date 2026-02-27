import './App.css';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ClerkProvider, SignIn, SignUp, useUser } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

import AppLayout from './components/AppLayout';
import RedirectPage from './pages/RedirectPage';
import LearnHomePage from './pages/LearnHomePage';
import LessonPage from './pages/LessonPage';
import ReviewPage from './pages/ReviewPage';
import ReviewBrowsePage from './pages/ReviewBrowsePage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import OnboardingPage from './pages/OnboardingPage';
import DrillPage from './pages/DrillPage';
import StatsPage from './pages/StatsPage';
import PlacementPage from './pages/PlacementPage';
import ProPage from './pages/ProPage';
import DebugPage from './pages/DebugPage';
import Demo from './pages/Demo';
import { isOnboardingComplete } from './services/onboardingService';
import { syncNow } from './services/syncService';

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/** Syncs Supabase when Clerk user is available. */
function AuthSyncEffect() {
  const { isSignedIn } = useUser();
  useEffect(() => {
    if (isSignedIn) syncNow().catch(() => {});
  }, [isSignedIn]);
  return null;
}

/** Redirects to /onboarding on first visit. */
function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [checked, setChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (location.pathname === '/onboarding') { setChecked(true); return; }
    isOnboardingComplete().then((done) => {
      setNeedsOnboarding(!done);
      setChecked(true);
    });
  }, [location.pathname]);

  if (!checked) return null;
  if (needsOnboarding && location.pathname !== '/onboarding') {
    window.location.replace('/onboarding');
    return null;
  }
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <OnboardingGuard>
      <AppLayout>
        <Routes>
          <Route path="/" element={<RedirectPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/learn" element={<LearnHomePage />} />
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/browse" element={<ReviewBrowsePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/drill" element={<DrillPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/placement" element={<PlacementPage />} />
          <Route path="/pro" element={<ProPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="/demo" element={<Demo />} />
          <Route
            path="/sign-in"
            element={<div className="flex justify-center mt-12"><SignIn routing="path" path="/sign-in" /></div>}
          />
          <Route
            path="/sign-up"
            element={<div className="flex justify-center mt-12"><SignUp routing="path" path="/sign-up" /></div>}
          />
        </Routes>
      </AppLayout>
    </OnboardingGuard>
  );
}

function App() {
  const router = (
    // basename="" for Cloudflare Pages (served at root, not a subdirectory)
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );

  if (CLERK_KEY) {
    return (
      <ClerkProvider publishableKey={CLERK_KEY}>
        <AuthSyncEffect />
        {router}
      </ClerkProvider>
    );
  }

  // Clerk not configured — run without auth (guest-only mode)
  return router;
}

export default App;
