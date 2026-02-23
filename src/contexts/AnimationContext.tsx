/**
 * AnimationContext
 *
 * Provides a flying particle animation for word discovery events.
 * Particles fly from a word's position to the Review nav tab.
 */

import { createContext, useContext, useState, useLayoutEffect, useEffect } from 'react';

interface ParticleData {
  id: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

interface AnimationContextValue {
  /** Fire a particle from (fromX, fromY) toward the Review nav tab */
  fireParticle: (fromX: number, fromY: number) => void;
}

const AnimationContext = createContext<AnimationContextValue>({
  fireParticle: () => {},
});

export function useParticleAnimation() {
  return useContext(AnimationContext);
}

interface FlyingParticleProps extends ParticleData {
  onDone: () => void;
}

function FlyingParticle({ fromX, fromY, toX, toY, onDone }: FlyingParticleProps) {
  const [started, setStarted] = useState(false);

  useLayoutEffect(() => {
    const raf = requestAnimationFrame(() => setStarted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (started) {
      const id = setTimeout(onDone, 700);
      return () => clearTimeout(id);
    }
  }, [started, onDone]);

  return (
    <div
      className="pointer-events-none z-[9999] w-3 h-3 rounded-full bg-primary shadow-lg"
      style={{
        position: 'fixed',
        left: started ? toX : fromX,
        top: started ? toY : fromY,
        transform: 'translate(-50%, -50%)',
        transition: started
          ? 'left 0.55s cubic-bezier(0.4, 0, 0.2, 1), top 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.15s 0.45s'
          : 'none',
        opacity: started ? 0 : 1,
      }}
    />
  );
}

export function ParticleAnimationProvider({ children }: { children: React.ReactNode }) {
  const [particles, setParticles] = useState<ParticleData[]>([]);

  const fireParticle = (fromX: number, fromY: number) => {
    const reviewTab = document.getElementById('review-tab-nav');
    if (!reviewTab) return;
    const rect = reviewTab.getBoundingClientRect();
    const toX = rect.left + rect.width / 2;
    const toY = rect.top + rect.height / 2;
    const id = Date.now() + Math.random();
    setParticles((prev) => [...prev, { id, fromX, fromY, toX, toY }]);
  };

  const handleParticleDone = (id: number) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
    const tab = document.getElementById('review-tab-nav');
    if (tab) {
      tab.classList.remove('review-tab-sparkle');
      void tab.offsetWidth; // force reflow to restart animation
      tab.classList.add('review-tab-sparkle');
      setTimeout(() => tab.classList.remove('review-tab-sparkle'), 600);
    }
  };

  return (
    <AnimationContext.Provider value={{ fireParticle }}>
      {children}
      {particles.map((p) => (
        <FlyingParticle key={p.id} {...p} onDone={() => handleParticleDone(p.id)} />
      ))}
    </AnimationContext.Provider>
  );
}
