
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { Copy, Users, Trophy, Gift, Link as LinkIcon, CheckCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemo, useState } from 'react';
import { ReferralRecord } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Badge } from '@/components/ui/badge';

const REFERRAL_REWARD_AMOUNT = 3000;

export default function ReferralPage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();
  const firestore = useFirestore();
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const referralCode = userProfile?.referral?.referralCode || '';
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${referralCode}` : '';

  const referralsQuery = useMemo(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'referrals'), where('referrerUid', '==', user.uid));
  }, [firestore, user]);

  const { data: referrals, loading: referralsLoading } = useCollection<ReferralRecord>(referralsQuery);

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description,
    });
  };

  const handleClaim = async (referral: ReferralRecord) => {
    if (!user || !firestore || !userProfile || !referral.id) return;
    
    setClaimingId(referral.id);
    const userDocRef = doc(firestore, 'users', user.uid);
    const refRecordRef = doc(firestore, 'referrals', referral.id);

    const profileUpdate = {
      'wallet.orBalance': increment(REFERRAL_REWARD_AMOUNT),
      'referral.referralCount': increment(1),
      'referral.totalReferralEarnings': increment(REFERRAL_REWARD_AMOUNT),
      'updatedAt': serverTimestamp()
    };

    const refUpdate = {
      claimed: true
    };

    // Update referral record
    updateDoc(refRecordRef, refUpdate)
      .then(() => {
        // Update user profile balance
        return updateDoc(userDocRef, profileUpdate);
      })
      .then(() => {
        toast({
          title: 'Reward Claimed!',
          description: `You earned ${REFERRAL_REWARD_AMOUNT} OR for a successful referral.`,
        });
      })
      .catch(async (error: any) => {
        console.error("Claim error:", error);
        if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: refRecordRef.path,
            operation: 'update',
            requestResourceData: refUpdate,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      })
      .finally(() => {
        setClaimingId(null);
      });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      <Card className="bg-primary text-primary-foreground border-none shadow-xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Gift className="h-32 w-32 rotate-12" />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl flex items-center gap-2">
            <Gift className="h-6 w-6" />
            Refer & Earn
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Earn {REFERRAL_REWARD_AMOUNT} OR coins for every friend who joins using your unique code!
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 space-y-6 border border-white/20">
              <div className="flex flex-col items-center gap-3">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Your Referral Code</p>
                <div className="flex items-center gap-2 w-full max-w-sm">
                  <div className="flex-1 bg-white/20 border border-white/30 rounded-lg py-3 px-4 text-white font-mono text-center text-2xl font-black uppercase tracking-tighter">
                    {referralCode}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-12 w-12 rounded-lg"
                    onClick={() => copyToClipboard(referralCode, 'Code copied to clipboard!')}
                  >
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-md border-none">
          <CardContent className="pt-6 text-center">
            <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <p className="text-3xl font-black">{userProfile?.referral?.referralCount || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Invites</p>
          </CardContent>
        </Card>
        <Card className="shadow-md border-none">
          <CardContent className="pt-6 text-center">
            <div className="bg-yellow-500/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="h-6 w-6 text-yellow-600" />
            </div>
            <p className="text-3xl font-black">{userProfile?.referral?.totalReferralEarnings || 0}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Earnings</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-md border-none">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Unclaimed Referrals
          </CardTitle>
          <CardDescription>Claim rewards for friends who joined through your link.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : referrals && referrals.filter(r => !r.claimed).length > 0 ? (
            <div className="space-y-4">
              {referrals.filter(r => !r.claimed).map((ref) => (
                <div key={ref.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">New Referral</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(ref.referralDate?.seconds * 1000).toLocaleDateString()}</span>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => handleClaim(ref)}
                    disabled={claimingId === ref.id}
                  >
                    {claimingId === ref.id ? 'Claiming...' : `Claim ${REFERRAL_REWARD_AMOUNT} OR`}
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed rounded-lg">
              <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No unclaimed referrals found.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-md border-none">
        <CardHeader>
          <CardTitle className="text-lg">Quick Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-sm">1</div>
            <div>
              <p className="font-bold text-sm">Send Code</p>
              <p className="text-xs text-muted-foreground mt-1">Give your referral code to your friends.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-sm">2</div>
            <div>
              <p className="font-bold text-sm">Friend Joins</p>
              <p className="text-xs text-muted-foreground mt-1">They enter your code during sign-up.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-sm">3</div>
            <div>
              <p className="font-bold text-sm">Claim Rewards</p>
              <p className="text-xs text-muted-foreground mt-1">Once they join, their record appears above. Click "Claim" to get your 3,000 OR!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
