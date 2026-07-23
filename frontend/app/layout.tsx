import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import ClientRefreshListener from '@/components/ClientRefreshListener';
import PwaInstallBanner from '@/components/PwaInstallBanner';

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Anek+Bangla:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.deferredPwaPrompt = null;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.deferredPwaPrompt = e;
              });
            `,
          }}
        />
      </head>
      <body 
        className="font-sans-fallback min-h-[100dvh] lg:h-[100dvh] overflow-x-hidden lg:overflow-hidden bg-background text-text-primary font-sans transition-colors"
        data-lang="bn"
      >
        <Providers>
          <ClientRefreshListener />
          <PwaInstallBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
