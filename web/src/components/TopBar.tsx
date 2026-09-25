'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Three main screens + settings as a secondary icon (brief §7, sketches 1a/1b/5).
const NAV = [
  { href: '/', label: 'טיסה' },
  { href: '/logbook', label: 'לוגבוק' },
  { href: '/analysis', label: 'ניתוח' },
] as const;

export function TopBar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <header className="topbar">
      <div className="brand">SMARTLOGBOOK</div>
      <nav className="nav" aria-label="ניווט ראשי">
        {NAV.map(({ href, label }) => (
          <Link key={href} href={href} aria-current={isActive(href) ? 'page' : undefined}>{label}</Link>
        ))}
      </nav>
      <div className="topbar-end">
        {/* Live VATSIM status comes from the tracker Worker in WP4/WP5 */}
        <div className="conn"><span className="dot" /><span className="conn-text">VATSIM · לא מחובר</span></div>
        <Link href="/settings" className="icon-btn" aria-label="הגדרות" aria-current={isActive('/settings') ? 'page' : undefined}>⚙</Link>
      </div>
    </header>
  );
}
