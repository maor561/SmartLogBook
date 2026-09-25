'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { TrackerDoc } from '@/lib/flight-view';

// Live tracker state for the whole app shell. Polls the Worker directly with a
// short-lived token (ADR-024: live reads don't go through Vercel); only the
// token refresh (every ~9 min) hits /api/tracker.
type Live = { tracker: TrackerDoc | null; fetchedAt: number | null; error: string | null };
const Ctx = createContext<Live>({ tracker: null, fetchedAt: null, error: null });
export const useTracker = () => useContext(Ctx);

const POLL_MS = 20_000;

export function TrackerProvider({ children }: { children: React.ReactNode }) {
  const [live, setLive] = useState<Live>({ tracker: null, fetchedAt: null, error: null });
  const direct = useRef<{ url: string; token: string; exp: number } | null>(null);
  const lastState = useRef<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let stop = false;

    async function viaApp() {
      const res = await fetch('/api/tracker', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      direct.current = body.direct;
      return body.tracker as TrackerDoc;
    }
    async function viaWorker() {
      const d = direct.current!;
      const res = await fetch(`${d.url}/v1/state`, { headers: { authorization: `Bearer ${d.token}` }, cache: 'no-store' });
      if (!res.ok) throw new Error(`tracker HTTP ${res.status}`);
      return (await res.json()).tracker as TrackerDoc;
    }

    async function poll() {
      if (document.hidden) return;
      try {
        const fresh = !direct.current || direct.current.exp * 1000 - Date.now() < 60_000;
        const tracker = fresh ? await viaApp() : await viaWorker();
        if (stop) return;
        setLive({ tracker, fetchedAt: Date.now(), error: null });
        // A new state changes what the flight screen shows: let the server recompute it.
        if (lastState.current && lastState.current !== tracker.state && pathname === '/') router.refresh();
        lastState.current = tracker.state;
      } catch (e) {
        if (!stop) setLive((l) => ({ ...l, error: (e as Error).message }));
        direct.current = null;                       // retry through the app next time
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    const onVisible = () => { if (!document.hidden) poll(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [pathname, router]);

  return <Ctx.Provider value={live}>{children}</Ctx.Provider>;
}

// Connected = the pilot was in the VATSIM feed within the last ~2.5 minutes.
export function connection(t: TrackerDoc | null): { cls: '' | 'go' | 'warn'; text: string } {
  if (!t) return { cls: '', text: 'VATSIM · לא ידוע' };
  if (t.state === 'disconnected') return { cls: 'warn', text: 'VATSIM · מנותק' };
  const seen = t.last_seen_at ? Date.now() - Date.parse(t.last_seen_at) : Infinity;
  if (seen < 150_000) return { cls: 'go', text: 'VATSIM · מחובר' };
  return { cls: '', text: 'VATSIM · לא מחובר' };
}
