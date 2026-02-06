
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { Copy, Share2, Users, Trophy, Gift, Link as LinkIcon, ShieldCheck, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

const AUTH_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1cHdieW56bGdkbGd3YmRxbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNTg3MjMsImV4cCI6MjA3OTkzNDcyM30.r1zlbO84-0fQmyir9rTBBtTJSQyZK-Mg8BhP4EDnQAA";

export default function ReferralPage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();
  const [isVerifying, setIsVerifying] = useState(false);

  const referralCode = userProfile?.referral?.referralCode || '';
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${referralCode}` : '';

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description,
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join OR-wallet',
          text: `Use my referral code ${referralCode} to join OR-wallet and start earning rewards!`,
          url: referralLink,
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      copyToClipboard(referralLink, 'Referral link copied to clipboard.');
    }
  };

  const handleVerifyReferral = async () => {
    if (!user) return;
    setIsVerifying(true);
    try {
      const response = await fetch(
        "https://wupwbynzlgdlgwbdqluw.supabase.co/functions/v1/referral_function",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AUTH_TOKEN}`
          },
          body: JSON.stringify({
            userId: user.uid
          })
        }
      );

      const data = await response.json();
      console.log("Referral Verification Response:", data);
      
      toast({
        title: "Verification Triggered",
        description: data.message || "Your referral status is being processed by the system.",
      });
    } catch (err) {
      console.error("Error calling referral function:", err);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Could not connect to verification server.",
      });
    } finally {
      setIsVerifying(false);
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

  return (
    <div className="flex flex-col gap-6">
      <Card className="bg-primary text-primary-foreground">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Gift className="h-6 w-6" />
            Refer & Earn
          </CardTitle>
          <CardDescription className="text-primary-foreground/80">
            Invite your friends and earn bonus OR coins for every active user you refer!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-white/10 rounded-lg p-4 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium uppercase tracking-wider">Your Referral Code</p>
                <div className="flex items-center gap-2 w-full max-w-xs">
                  <Input 
                    value={referralCode} 
                    readOnly 
                    className="bg-white/20 border-white/30 text-white font-mono text-center text-xl font-bold uppercase"
                  />
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    onClick={() => copyToClipboard(referralCode, 'Referral code copied.')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-medium uppercase tracking-wider">Your Referral Link</p>
                <div className="flex items-center gap-2 w-full">
                  <Input 
                    value={referralLink} 
                    readOnly 
                    className="bg-white/20 border-white/30 text-white text-xs"
                  />
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    onClick={() => copyToClipboard(referralLink, 'Referral link copied.')}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button className="w-full bg-white text-primary hover:bg-white/90" onClick={handleShare}>
                <Share2 className="mr-2 h-4 w-4" />
                Share Link
              </Button>
              <Button 
                variant="outline" 
                className="w-full bg-transparent border-white text-white hover:bg-white/10"
                onClick={handleVerifyReferral}
                disabled={isVerifying}
              >
                {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                Verify Status
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{userProfile?.referral?.referralCount || 0}</p>
            <p className="text-xs text-muted-foreground uppercase">Total Referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{userProfile?.referral?.totalReferralEarnings || 0} OR</p>
            <p className="text-xs text-muted-foreground uppercase">Earnings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">1</div>
            <div>
              <p className="font-semibold">Share your link</p>
              <p className="text-sm text-muted-foreground">Send your unique referral link to your friends.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">2</div>
            <div>
              <p className="font-semibold">Friends sign up</p>
              <p className="text-sm text-muted-foreground">When they join via your link, they are tracked as your referral.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">3</div>
            <div>
              <p className="font-semibold">Earn rewards</p>
              <p className="text-sm text-muted-foreground">Receive bonus OR coins instantly for every active user you refer.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
