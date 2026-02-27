/**
 * OfflineBanner
 *
 * Shows a dismissible toast at the top when the user loses network connectivity.
 * Automatically hides when connectivity is restored.
 *
 * Design decision: non-intrusive — doesn't block the UI.
 * SRS and lesson content work fully offline (cached by PWA service worker).
 */

import { useEffect, useState } from 'react';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const goOffline = () => { setOffline(true); setDismissed(false); };
    const goOnline = () => { setOffline(false); setDismissed(false); };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline || dismissed) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className="alert alert-warning shadow-lg max-w-sm w-full animate-slideUp pointer-events-auto"
        role="alert"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div className="flex-1">
          <p className="font-semibold text-sm">You're offline</p>
          <p className="text-xs opacity-80">Your progress is saved locally</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="btn btn-ghost btn-xs"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
