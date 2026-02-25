'use client';

import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { ThemeProvider } from '@/components/theme-provider';
import { LayoutProvider, useLayout } from '@/context/layout-context';
import { FirebaseClientProvider } from '@/firebase/client-provider';

function AppContent({ children }: { children: React.ReactNode }) {
  const { isPaddingDisabled } = useLayout();

  return (
    <SidebarProvider>
        <div className="flex min-h-full w-full flex-col">
          <Header />
          <SidebarInset>
            <main className={cn(
              "flex flex-1 flex-col",
              !isPaddingDisabled && "gap-4 p-4"
            )}>
            {children}
            </main>
          </SidebarInset>
          <BottomNav />
        </div>
    </SidebarProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>OR-wallet</title>
        <meta name="description" content="Complete tasks and earn rewards with AI-powered recommendations." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'h-[100dvh] w-full overflow-hidden bg-zinc-950 font-body antialiased flex items-center justify-center'
        )}
      >
        <div className="relative flex h-full w-full flex-col items-center justify-center p-0 md:p-6 lg:p-10">
          <div className="relative h-full w-full max-w-[430px] bg-background shadow-[0_0_80px_-20px_rgba(0,0,0,0.8)] md:h-[92dvh] md:max-h-[880px] md:rounded-[54px] md:border-[12px] md:border-zinc-900 md:ring-2 md:ring-zinc-800 flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide">
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
              <FirebaseClientProvider>
                <LayoutProvider>
                  <AppContent>{children}</AppContent>
                  <Toaster />
                </LayoutProvider>
              </FirebaseClientProvider>
            </ThemeProvider>
          </div>
        </div>
      </body>
    </html>
  );
}
