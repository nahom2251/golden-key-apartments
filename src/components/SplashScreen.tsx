import { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [phase, setPhase] = useState<'logo' | 'fade-out'>('logo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('fade-out'), 1200);
    const t2 = setTimeout(onFinish, 1700);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === 'fade-out' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(160deg, hsl(42 95% 88%) 0%, hsl(40 90% 75%) 40%, hsl(38 80% 55%) 100%)',
      }}
    >
      {/* Decorative rings */}
      <div className="absolute w-[320px] h-[320px] rounded-full border border-primary-foreground/10 animate-[spin_20s_linear_infinite]" />
      <div className="absolute w-[220px] h-[220px] rounded-full border border-primary-foreground/15 animate-[spin_15s_linear_infinite_reverse]" />

      {/* Logo mark */}
      <div className="relative mb-6 animate-[splash-in_0.8s_ease-out_both]">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-xl"
          style={{
            background: 'linear-gradient(135deg, hsl(0 0% 100% / 0.95), hsl(40 30% 96%))',
            boxShadow: '0 8px 32px hsl(38 80% 40% / 0.35)',
          }}
        >
          <span className="font-display text-3xl font-bold" style={{ color: 'hsl(38 80% 45%)' }}>
            AS
          </span>
        </div>
      </div>

      {/* Title */}
      <h1
        className="font-display text-2xl font-bold tracking-tight animate-[splash-in_0.8s_ease-out_0.3s_both]"
        style={{ color: 'hsl(30 30% 15%)' }}
      >
        AS Apt
      </h1>
      <p
        className="text-sm mt-1.5 animate-[splash-in_0.8s_ease-out_0.5s_both] font-medium"
        style={{ color: 'hsl(30 20% 25% / 0.7)' }}
      >
        Alehegne Sewnet Apartment
      </p>

      {/* Loading bar */}
      <div
        className="mt-8 w-32 h-1 rounded-full overflow-hidden animate-[splash-in_0.8s_ease-out_0.7s_both]"
        style={{ background: 'hsl(38 80% 45% / 0.25)' }}
      >
        <div
          className="h-full rounded-full animate-[splash-bar_2s_ease-in-out_both]"
          style={{ background: 'hsl(30 30% 15% / 0.6)' }}
        />
      </div>
    </div>
  );
}
