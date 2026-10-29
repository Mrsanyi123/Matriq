import { palette } from '@matriq/ui';
import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Ethiopic, Nunito } from 'next/font/google';
import { cookies } from 'next/headers';
import { LANG_COOKIE, MODE_COOKIE, parseLanguage } from '@/lib/cookies';
import { isSupabaseConfigured } from '@/lib/env';
import { localeFor } from '@/lib/translate';
import { Providers } from './providers';
import './globals.css';

const nunito = Nunito({
  subsets: ['latin', 'latin-ext'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
});

const ethiopic = Noto_Sans_Ethiopic({
  subsets: ['ethiopic'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-ethiopic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: 'Matriq', template: '%s · Matriq' },
  description: 'Learn one chapter at a time. Lessons, practice and progress for Ethiopian Grade 12 students.',
  applicationName: 'Matriq',
};

export const viewport: Viewport = {
  themeColor: palette.bg,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const store = await cookies();
  const language = parseLanguage(store.get(LANG_COOKIE)?.value);
  const isDemo = store.get(MODE_COOKIE)?.value === 'demo';
  const mode = isDemo ? 'demo' : isSupabaseConfigured ? 'supabase' : null;

  return (
    <html lang={localeFor(language)} className={`${nunito.variable} ${ethiopic.variable}`}>
      <body className="min-h-dvh bg-bg font-sans text-ink">
        <Providers initialMode={mode} initialLanguage={language}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
