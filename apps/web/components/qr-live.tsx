'use client';

import { useEffect, useState } from 'react';

interface QrState {
  token: string;
  expiresAt: string;
  step: number;
}

/** Deterministic 21x21 block pattern so the demo has a scannable-looking code. */
function patternFrom(token: string): boolean[] {
  let seed = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    seed ^= token.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  const cells: boolean[] = [];
  for (let i = 0; i < 441; i += 1) {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    cells.push((seed & 3) !== 0);
  }
  return cells;
}

export function QrLive({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<QrState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/qr/${sessionId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'QR unavailable');
        const data = (await res.json()) as QrState;
        if (!cancelled) {
          setState(data);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'QR unavailable');
      }
    };

    void load();
    const poll = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!state) return;
    const tick = () => {
      const left = Math.max(0, Math.round((new Date(state.expiresAt).getTime() - Date.now()) / 1000));
      setSecondsLeft(left);
    };
    tick();
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [state]);

  if (error) {
    return <p className="text-sm text-rose-600">{error}</p>;
  }
  if (!state) {
    return <p className="text-sm text-slate-500">Loading code…</p>;
  }

  const cells = patternFrom(state.token);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="grid grid-cols-21 gap-[2px] rounded-lg bg-white p-2 ring-1 ring-slate-200" style={{ gridTemplateColumns: 'repeat(21, 8px)' }}>
        {cells.map((on, i) => (
          <span
            key={i}
            className={`block h-2 w-2 rounded-[1px] ${on ? 'bg-slate-900' : 'bg-white'}`}
          />
        ))}
      </div>
      <p className="font-mono text-xs text-slate-500">{state.token}</p>
      <p className="text-xs font-medium text-slate-600">
        Rotates in {secondsLeft}s · screenshot becomes invalid
      </p>
    </div>
  );
}
