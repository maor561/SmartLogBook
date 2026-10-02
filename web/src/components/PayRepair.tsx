'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { payRepairAction } from '@/app/(app)/flight-actions';
import { usd } from '@/lib/format';

// Pays a repair request after a hard landing and releases the aircraft (ADR-060).
export function PayRepairButton({ id, cents, long = false }: { id: number; cents: number; long?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const amount = usd(cents, false);
  return (
    <>
      <button type="button" className="btn btn-sm btn-primary" disabled={pending}
        onClick={() => start(async () => { const r = await payRepairAction(id); if (r.ok) router.refresh(); else setErr(r.errors.join(' · ')); })}>
        {pending ? 'משלם…' : long ? <>שלם <bdi>{amount}</bdi> ושחרר את המטוס</> : <>שלם <bdi>{amount}</bdi></>}
      </button>
      {err && <span className="err" role="alert">{err}</span>}
    </>
  );
}
