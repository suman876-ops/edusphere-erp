'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrState {
  token: string;
  expiresAt: string;
  step: number;
}

/**
 * Renders a real, scannable QR code of the rotating token.
 * The previous version drew a deterministic block pattern, which looked like a QR
 * code but could not be scanned — the anti-proxy design was never exercised.
 */
export function QrLive({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<QrState | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/qr/${sessionId}`, { cache: 'no-store' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.message ?? 'QR unavailable');
        }
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
    let cancelled = false;
    QRCode.toDataURL(state.token, { margin: 1, width: 260, errorCorrectionLevel: 'M' })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setError('Could not render QR');
      });
    return () => {
      cancelled = true;
    };
  }, [state]);

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

  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!state || !dataUrl) return <p className="text-sm text-slate-500">Loading code…</p>;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt="Attendance QR code" width={260} height={260} className="rounded-lg bg-white p-2 ring-1 ring-slate-200" />
      <p className="font-mono text-xs text-slate-500">{state.token}</p>
      <p className="text-xs font-medium text-slate-600">
        Rotates in {secondsLeft}s · a screenshot stops working within 40s
      </p>
    </div>
  );
}
