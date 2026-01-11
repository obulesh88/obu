'use client';

import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useAuth, useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Create user profile in Firestore if it doesn't exist
      const userRef = doc(firestore, 'users', user.uid);
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        orBalance: 0,
        inrBalance: 0,
        walletAddress: `0x${user.uid.substring(0,10)}...${user.uid.slice(-4)}`,
        createdAt: serverTimestamp(),
      }, { merge: true });

      router.push('/');
    } catch (error) {
      console.error("Authentication failed: ", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Button onClick={handleGoogleSignIn}>Sign in with Google</Button>
    </div>
  );
}
