import './App.css';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';

import AppLayout from './components/AppLayout';
import RedirectPage from './pages/RedirectPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import LanguagesPage from './pages/LanguagesPage';
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
import { syncLanguages } from './services/userLanguagesService';
import { AuthProvider, useAuth } from './hooks/useAuth';

/** Kicks off sync once the server session is confirmed. */
function AuthSyncEffect() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) {
      syncNow().catch(() => {});
      syncLanguages().catch(() => {});
    }
  }, [user]);
  return null;
}

/**
 * The app shell (navbar + tab bar). Gates on onboarding: a user who hasn't
 * onboarded is sent to the landing page, which routes them into onboarding.
 */
function ShellLayout() {
  const [state, setState] = useState<'checking' | 'ok' | 'redirect'>('checking');

  useEffect(() => {
    isOnboardingComplete().then((done) => setState(done ? 'ok' : 'redirect'));
  }, []);

  if (state === 'checking') return null;
  if (state === 'redirect') return <Navigate to="/welcome" replace />;
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

function AppRoutes() {
  return (
    <Routes>
      {/* No-chrome routes (own full-screen layout) */}
      <Route path="/" element={<RedirectPage />} />
      <Route path="/welcome" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* App shell */}
      <Route element={<ShellLayout />}>
        <Route path="/languages" element={<LanguagesPage />} />
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
        <Route path="/sign-in" element={<Navigate to="/login" replace />} />
        <Route path="/sign-up" element={<Navigate to="/login" replace />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthSyncEffect />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
