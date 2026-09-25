'use client';

import { useTransition } from 'react';
import { setTheme } from './actions';

const OPTIONS = [
  { value: 'auto', label: 'לפי המכשיר' },
  { value: 'light', label: 'בהיר' },
  { value: 'dark', label: 'כהה' },
] as const;

export function ThemePicker({ current }: { current: 'auto' | 'light' | 'dark' }) {
  const [pending, start] = useTransition();
  return (
    <div className="seg" role="group" aria-label="ערכת צבעים" aria-busy={pending}>
      {OPTIONS.map((o) => (
        <button key={o.value} type="button" aria-pressed={current === o.value} onClick={() => start(() => setTheme(o.value))}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
