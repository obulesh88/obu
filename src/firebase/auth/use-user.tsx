'use client';

import { useState, useEffect } from 'react';

/**
 * A mock authentication hook that provides a persistent unique ID for the user
 * stored in localStorage, removing the need for a formal login process.
 */
export function useFirebaseAuth() {
  const [user, setUser] = useState<{ uid: string; email: string; displayName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for an existing guest ID or create a new one
    let mockUid = localStorage.getItem('or_wallet_guest_uid');
    if (!mockUid) {
      mockUid = 'guest_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('or_wallet_guest_uid', mockUid);
    }

    setUser({
      uid: mockUid,
      email: `${mockUid}@orwallet.local`,
      displayName: 'Guest User',
    });
    setLoading(false);
  }, []);

  return { user, loading };
}
