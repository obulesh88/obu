'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { Gift, RefreshCw, ArrowRight } from 'lucide-react';

export default function ReferralEntryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();
  const firestore = useFirestore();

  const [referralCode, setReferralCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    // If user already has a referrer, they don't belong here
    if (!loading && userProfile?.referral?.referredBy) {
      router.push('/');
    }
  }, [user, userProfile, loading, router]);

  const handleSubmit = async () => {
    if (!user || !firestore || !userProfile) return;
    
    const code = referralCode.trim().toUpperCase();
    if (!code) {
      toast({ variant: 'destructive', title: 'Code Required', description: 'Please enter a referral code or skip.' });
      return;
    }

    setIsSubmitting(true);
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('referral.referralCode', '==', code));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ variant: 'destructive', title: 'Invalid Code', description: 'This referral code does not exist.' });
        setIsSubmitting(false);
        return;
      }

      const referrerDoc = querySnapshot.docs[0];
      const referrerUid = referrerDoc.id;

      // Prevent self-referral
      if (referrerUid === user.uid) {
        toast({ variant: 'destructive', title: 'Invalid Code', description: 'You cannot refer yourself.' });
        setIsSubmitting(false);
        return;
      }

      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDoc(userDocRef, {
        'referral.referredBy': code,
        'updatedAt': serverTimestamp()
      });

      const referralsRef = collection(firestore, 'referrals');
      await addDoc(referralsRef, {
        referralId: `ref_${Date.now()}`,
        referrerUid: referrerUid,
        referredUid: user.uid,
        referralCode: code,
        referralDate: serverTimestamp(),
        claimed: false
      });

      toast({
        title: 'Referral Applied!',
        description: 'You have successfully linked your account to the referrer.',
      });
      router.push('/');
    } catch (error: any) {
      console.error("Referral entry error:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to apply referral code. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    router.push('/');
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Gift className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Have a Referral Code?</CardTitle>
          <CardDescription>
            Enter your friend's code to link your account. 
            Don't worry, you can skip this if you don't have one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="referral-code">Referral Code</Label>
            <Input 
              id="referral-code"
              placeholder="e.g. JOIN123"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              className="uppercase font-mono text-center text-lg h-12"
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            onClick={handleSubmit} 
            className="w-full h-12 text-lg font-bold"
            disabled={isSubmitting || !referralCode.trim()}
          >
            {isSubmitting ? (
              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            ) : <Gift className="mr-2 h-5 w-5" />}
            Apply Code
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleSkip} 
            className="w-full text-muted-foreground"
            disabled={isSubmitting}
          >
            I don't have a code <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
