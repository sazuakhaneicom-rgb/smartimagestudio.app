import type { Metadata } from 'next';
import { Anek_Bangla, Outfit, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import ClientRefreshListener from '@/components/ClientRefreshListener';

const anekBangla = Anek_Bangla({
  subsets: ['bengali', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-bangla',
});

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-heading-en',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-body-en',
});

export const viewport = {
  themeColor: "#8b5cf6",
};

export const metadata: Metadata = {
  title: "Smart Image Studio",
  description: "AI দিয়ে ইমেজের লেয়ার আলাদা করুন, ব্যাকগ্রাউন্ড রিমুভ করুন এবং আপস্কেল করুন",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartImage",
  },
  icons: {
    icon: [
      { url: '/logo.png' },
      { url: '/favicon.ico' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <body 
        className={`${anekBangla.variable} ${outfit.variable} ${inter.variable} min-h-[100dvh] lg:h-[100dvh] overflow-x-hidden lg:overflow-hidden bg-background text-text-primary font-sans transition-colors`}
        data-lang="bn"
      >
        <Providers>
          <ClientRefreshListener />
          {children}
        </Providers>
      </body>
    </html>
  );
}
