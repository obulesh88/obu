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
        <div className="flex min-h-screen w-full flex-col">
          <Header />
          <SidebarInset>
            <main className={cn(
              "flex flex-1 flex-col",
              !isPaddingDisabled && "gap-4 p-4 md:gap-8 md:p-8"
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
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased'
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <FirebaseClientProvider>
            <LayoutProvider>
              <AppContent>{children}</AppContent>
              <Toaster />
            </LayoutProvider>
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
