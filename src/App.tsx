import './App.css';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import AppLayout from './components/AppLayout';
import RedirectPage from './pages/RedirectPage';
import LearnHomePage from './pages/LearnHomePage';
import LessonPage from './pages/LessonPage';
import ReviewPage from './pages/ReviewPage';
import ReviewBrowsePage from './pages/ReviewBrowsePage';
import SettingsPage from './pages/SettingsPage';
import DebugPage from './pages/DebugPage';
import Demo from './pages/Demo';

function App() {
  return (
    <BrowserRouter basename="/languageloader-fe">
      <AppLayout>
        <Routes>
          <Route path="/" element={<RedirectPage />} />
          <Route path="/learn" element={<LearnHomePage />} />
          <Route path="/lesson/:lessonId" element={<LessonPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/review/browse" element={<ReviewBrowsePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/debug" element={<DebugPage />} />
          <Route path="/demo" element={<Demo />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
