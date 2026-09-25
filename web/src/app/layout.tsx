import type { Metadata, Viewport } from 'next';
import { Heebo } from 'next/font/google';
import { cookies } from 'next/headers';
import { THEME_COOKIE } from '@/lib/constants';
import './globals.css';

const heebo = Heebo({ variable: '--font-heebo', subsets: ['hebrew', 'latin'] });

export const metadata: Metadata = {
  title: 'SmartLogBook',
  description: 'לוגבוק וחברת תעופה וירטואלית',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef0f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1216' },
  ],
};

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  // The manual theme override (ADR-016) is rendered on the server, so there is
  // no light/dark flash before hydration. Without it the OS preference applies.
  const theme = (await cookies()).get(THEME_COOKIE)?.value;
  return (
    <html lang="he" dir="rtl" className={heebo.variable} data-theme={theme === 'light' || theme === 'dark' ? theme : undefined}>
      <body>{children}</body>
    </html>
  );
}
