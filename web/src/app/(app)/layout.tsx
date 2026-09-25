import { verifySession } from '@/lib/dal';
import { TopBar } from '@/components/TopBar';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  // Layout check for the shell; every page and API also verifies via the DAL,
  // since layouts are not re-run on every client navigation.
  await verifySession();
  return (
    <>
      <TopBar />
      <main className="page">{children}</main>
    </>
  );
}
