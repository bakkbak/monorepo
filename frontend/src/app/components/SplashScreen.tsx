import { useState, useEffect } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Brief brand moment that overlaps data loading — not a hard delay. The old
    // 2.3s floor made every launch feel slow even when data was ready. Feed
    // fetching runs underneath the splash (App's effects fire regardless), so a
    // short cover is enough; users can also tap to skip.
    const timer = setTimeout(() => setFadeOut(true), 500);
    const finish = setTimeout(onFinish, 800);
    return () => {
      clearTimeout(timer);
      clearTimeout(finish);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 bg-yellow-400 flex flex-col items-center justify-center z-[100] transition-opacity duration-500 ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={onFinish}
    >
      <div className="text-8xl mb-6 animate-snap-bounce">🙊</div>
      <h1
        className="text-5xl font-bold text-black tracking-tight"
        style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", fontWeight: 700 }}
      >
        Teevo
      </h1>
      <p className="text-black/60 mt-3 text-lg">See what's brewing around campus</p>
    </div>
  );
}
