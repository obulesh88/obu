'use client';

import { createContext, useState, useContext, ReactNode } from 'react';

type LayoutContextType = {
  isBottomNavVisible: boolean;
  setBottomNavVisible: (isVisible: boolean) => void;
};

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [isBottomNavVisible, setBottomNavVisible] = useState(true);

  return (
    <LayoutContext.Provider value={{ isBottomNavVisible, setBottomNavVisible }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}
