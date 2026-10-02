'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { connection, useTracker } from './TrackerProvider';

// Three main screens + settings as a secondary icon (brief §7, sketches 1a/1b/5).
const NAV = [
  { href: '/', label: 'טיסה' },
  { href: '/logbook', label: 'לוגבוק' },
  { href: '/analysis', label: 'ניתוח' },
  { href: '/fleet', label: 'צי' },
] as const;

// `openRepairs`: repair requests waiting for payment (an aircraft is grounded), shown on the fleet link.
export function TopBar({ openRepairs = 0 }: { openRepairs?: number }) {
  const pathname = usePathname();
  const { tracker } = useTracker();
  const conn = connection(tracker);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="topbar">
      <div className="brand">SMARTLOGBOOK</div>
      <nav className="nav" aria-label="ניווט ראשי">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>
            {label}{href === '/fleet' && openRepairs > 0 && <span className="nav-badge" aria-label={`${openRepairs} בקשות תשלום פתוחות`}>{openRepairs}</span>}
          </Link>
        ))}
      </nav>
      <div className="topbar-end">
        <div className="conn" role="status"><span className={`dot ${conn.cls}`} /><span className="conn-text">{conn.text}</span></div>
        <Link href="/settings" className="icon-btn" aria-label="הגדרות" aria-current={isActive('/settings') ? 'page' : undefined}>⚙</Link>
      </div>
    </header>
  );
}
