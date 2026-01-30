'use client';
import { useState, useEffect } from 'react';
import type { UserProfile } from '@/lib/types';

// Mock user data
const mockUser = {
  uid: 'mock-user-id',
  email: 'user@example.com',
  displayName: 'Mock User',
};

const mockUserProfile: UserProfile = {
  uid: 'mock-user-id',
  email: 'user@example.com',
  profile: {
    displayName: 'Mock User',
  },
  wallet: {
    orBalance: 1234.56,
    inrBalance: 78.90,
    walletAddress: '0x123...abc',
  },
  createdAt: new Date(),
};

export function useUser() {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching user data
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';
    
    setTimeout(() => {
      if (isLoggedIn) {
        setUser(mockUser);
        setUserProfile(mockUserProfile);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    }, 500);
  }, []);

  return { user, userProfile, loading };
}
