
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { Copy, Users, Trophy, Gift, Clock, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useFirestore } from '@/firebase';
import { collection, query, where, doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useCollection } from '@/firebase/firestore/use-collection';
import { useMemo, useState } from 'react';
import { ReferralRecord } from '@/lib/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { FaWhatsapp } from 'react-icons/fa';
import { Badge } from '@/components/ui/badge';

const REFERRAL_REWARD_AMOUNT = 3000;
const SUPABASE_AUTH_TOKEN = "Bearer cfa5ae94457b84ebfa62afb7b495ee588477ce82425d69be0040fb833a0f81be";
const SUPABASE_FUNC_URL = "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/referral_function";

export default function ReferralPage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();
  const firestore = useFirestore();
  
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [verifiedIds, setVerifiedIds] = useState<string[]>([]);

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

  const shareOnWhatsApp = () => {
    const message = `Check out OR-wallet! Use my referral code ${referralCode} to join and earn rewards. Sign up here: ${referralLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleVerifyReferral = async (referral: ReferralRecord) => {
    if (!user || !referral.id) return;
    
    setVerifyingId(referral.id);
    try {
      const response = await fetch(SUPABASE_FUNC_URL, {
        method: "POST",
        headers: {
          "Authorization": SUPABASE_AUTH_TOKEN,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
            referralId: referral.id,
            referrerUid: user.uid,
            referredUid: referral.referredUid,
            referralCode: referral.referralCode
        })
      });

      const data = await response.json();
      console.log('Supabase Verification:', data);

      // We treat HTTP 200 or a success field as a pass
      if (response.ok) {
        setVerifiedIds(prev => [...prev, referral.id!]);
        toast({
          title: 'Referral Verified',
          description: 'This referral is legitimate. You can now claim your reward.',
        });
      } else {
        throw new Error(data.message || 'Verification failed');
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        variant: 'destructive',
        title: 'Verification Failed',
        description: 'We could not verify this referral at this time.',
      });
    } finally {
      setVerifyingId(null);
    }
  };

  const handleClaimReward = async (referral: ReferralRecord) => {
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

    try {
      await updateDoc(refRecordRef, refUpdate);
      await updateDoc(userDocRef, profileUpdate);

      toast({
        title: 'Success!',
        description: `You earned ${REFERRAL_REWARD_AMOUNT} OR coins!`,
      });
      
      // Remove from locally verified list
      setVerifiedIds(prev => prev.filter(id => id !== referral.id));
    } catch (error: any) {
      console.error("Claim error:", error);
      if (error.code === 'permission-denied') {
        const permissionError = new FirestorePermissionError({
          path: refRecordRef.path,
          operation: 'update',
          requestResourceData: refUpdate,
        } satisfies SecurityRuleContext);
        errorEmitter.emit('permission-error', permissionError);
      }
    } finally {
      setClaimingId(null);
    }
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

  const unclaimedReferrals = referrals?.filter(r => !r.claimed) || [];

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
              <div className="flex flex-col items-center gap-4">
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
                
                <Button 
                  onClick={shareOnWhatsApp}
                  className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold h-12 gap-2"
                >
                  <FaWhatsapp className="h-6 w-6" />
                  Share on WhatsApp
                </Button>
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
          <CardDescription>Verify and claim rewards for successful invites.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {referralsLoading ? (
            <Skeleton className="h-20 w-full" />
          ) : unclaimedReferrals.length > 0 ? (
            <div className="space-y-4">
              {unclaimedReferrals.map((ref) => {
                const isVerified = verifiedIds.includes(ref.id!);
                const isVerifying = verifyingId === ref.id;
                const isClaiming = claimingId === ref.id;

                return (
                  <div key={ref.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-bold">New Referral</span>
                      {isVerified ? (
                        <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200 gap-1 w-fit">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Pending verification</span>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {!isVerified ? (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleVerifyReferral(ref)}
                          disabled={isVerifying}
                          className="h-8 min-w-[80px]"
                        >
                          {isVerifying ? (
                            <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                          ) : <ShieldCheck className="h-3 w-3 mr-2" />}
                          {isVerifying ? 'Verifying...' : 'Verify'}
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          onClick={() => handleClaimReward(ref)}
                          disabled={isClaiming}
                          className="h-8 min-w-[120px] bg-green-600 hover:bg-green-700"
                        >
                          {isClaiming ? (
                            <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                          ) : <CheckCircle2 className="h-3 w-3 mr-2" />}
                          {isClaiming ? 'Claiming...' : `Claim ${REFERRAL_REWARD_AMOUNT}`}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
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
          <CardTitle className="text-lg text-primary font-bold">Verification Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">1</div>
            <p className="text-sm">Friend joins using your code</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">2</div>
            <p className="text-sm">Click <span className="font-bold">Verify</span> to check if the referral is valid</p>
          </div>
          <div className="flex gap-4 items-center">
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0">3</div>
            <p className="text-sm">Click <span className="font-bold">Claim</span> to get your {REFERRAL_REWARD_AMOUNT} OR</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
