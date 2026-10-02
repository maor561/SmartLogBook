import { verifySession } from '@/lib/dal';
import { TopBar } from '@/components/TopBar';
import { TrackerProvider } from '@/components/TrackerProvider';
import { hasDb } from '@/lib/db';
import { openRepairsCount } from '@/lib/fleet';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  // Layout check for the shell; every page and API also verifies via the DAL,
  // since layouts are not re-run on every client navigation.
  await verifySession();
  const openRepairs = hasDb() ? await openRepairsCount().catch(() => 0) : 0;
  return (
    <TrackerProvider>
      <TopBar openRepairs={openRepairs} />
      <main className="page">{children}</main>
    </TrackerProvider>
  );
}
