import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Sans } from 'next/font/google';
import { Toaster } from 'sonner';
import './globals.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['SOFT', 'opsz'],
});

const plex = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-plex',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Clasd — class communications for instructors',
    template: '%s · Clasd',
  },
  description:
    'Clasd helps independent instructors run their classes — enrolments, reminders, calendars, and student communications, in one calm place.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${plex.variable}`}>
      <body className="font-sans bg-cream-100 text-slate-900 min-h-screen">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#FDFBF7',
              border: '1px solid #E8DFCF',
              color: '#1A1A18',
              fontFamily: 'var(--font-plex)',
            },
          }}
        />
      </body>
    </html>
  );
}
