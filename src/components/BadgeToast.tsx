/**
 * BadgeToast — brief overlay shown when a badge is earned.
 * Auto-dismisses after 3 seconds.
 */

import { useEffect, useState } from 'react';
import { type Badge, onBadgeEarned } from '../services/badgeService';

export default function BadgeToast() {
  const [queue, setQueue] = useState<Badge[]>([]);
  const [current, setCurrent] = useState<Badge | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    return onBadgeEarned((badge) => {
      setQueue((q) => [...q, badge]);
    });
  }, []);

  useEffect(() => {
    if (!current && queue.length > 0) {
      const [next, ...rest] = queue;
      setQueue(rest);
      setCurrent(next);
      setVisible(true);
      setTimeout(() => {
        setVisible(false);
        setTimeout(() => setCurrent(null), 400);
      }, 3000);
    }
  }, [queue, current]);

  if (!current) return null;

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-400
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="card bg-base-100 shadow-xl border border-warning px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{current.icon}</span>
          <div>
            <p className="font-bold text-sm text-warning">Badge Earned!</p>
            <p className="font-semibold">{current.label}</p>
            <p className="text-xs opacity-60">{current.description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
