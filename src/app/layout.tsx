import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { ThemeProvider } from '@/components/theme-provider';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'OR-wallet',
  description: 'Complete tasks and earn rewards with AI-powered recommendations.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8809837457379626"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased'
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <FirebaseClientProvider>
            <SidebarProvider>
                <div className="flex min-h-screen w-full flex-col">
                  <Header />
                  <SidebarInset>
                    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
                     {children}
                    </main>
                  </SidebarInset>
                  <BottomNav />
                </div>
            </SidebarProvider>
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
