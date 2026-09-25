'use client';

import { useRouter } from 'next/navigation';

// "Print as report" replaces the old monthly report (ADR-035).
export function PrintButton() {
  return <button type="button" className="btn btn-sm btn-primary" onClick={() => window.print()}>הדפס כדוח</button>;
}

export function HistToggle({ checked, on, off }: { checked: boolean; on: string; off: string }) {
  const router = useRouter();
  return (
    <label className="chk">
      <input type="checkbox" checked={checked} onChange={(e) => router.push(e.target.checked ? on : off)} /> כולל טיסות היסטוריות
    </label>
  );
}
