import { verifySession } from '@/lib/dal';
import { TopBar } from '@/components/TopBar';
import { TrackerProvider } from '@/components/TrackerProvider';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  // Layout check for the shell; every page and API also verifies via the DAL,
  // since layouts are not re-run on every client navigation.
  await verifySession();
  return (
    <TrackerProvider>
      <TopBar />
      <main className="page">{children}</main>
    </TrackerProvider>
  );
}
