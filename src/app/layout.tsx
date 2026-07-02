import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/Toast';
import CookieBanner from '@/components/CookieBanner';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const siteUrl = 'https://zolo.sk';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'ZOLO — Slovak Tax & Accounting', template: '%s · ZOLO' },
  description: 'Cloud-first účtovníctvo, fakturácia, DPH, mzdy pre slovenský trh.',
  manifest: '/manifest.json',
  applicationName: 'ZOLO',
  keywords: ['účtovníctvo', 'fakturácia', 'DPH', 'mzdy', 'eKasa', 'eDane', 'Slovensko', 'SaaS'],
  openGraph: {
    type: 'website',
    locale: 'sk_SK',
    url: siteUrl,
    siteName: 'ZOLO',
    title: 'ZOLO — Slovak Tax & Accounting',
    description: 'Cloud-first účtovníctvo, fakturácia, DPH, mzdy pre slovenský trh.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZOLO — Slovak Tax & Accounting',
    description: 'Cloud-first účtovníctvo, fakturácia, DPH, mzdy pre slovenský trh.',
  },
};

export const viewport: Viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sk" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-zinc-50">
        <ToastProvider>{children}</ToastProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
