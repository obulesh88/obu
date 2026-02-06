'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/hooks/use-user';
import { Copy, Users, Trophy, Gift, Link as LinkIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const REFERRAL_REWARD_AMOUNT = 3000;

export default function ReferralPage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();

  const referralCode = userProfile?.referral?.referralCode || '';
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/login?ref=${referralCode}` : '';

  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description,
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
    <div className="flex flex-col gap-6">
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
            Earn {REFERRAL_REWARD_AMOUNT} OR coins for every friend who joins using your unique link!
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

              <div className="flex flex-col items-center gap-3">
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">Shareable Link</p>
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 bg-white/20 border border-white/30 rounded-lg py-2 px-3 text-white text-[10px] truncate font-mono">
                    {referralLink}
                  </div>
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="h-10 w-10 rounded-lg shrink-0"
                    onClick={() => copyToClipboard(referralLink, 'Link copied! Send it to your friends.')}
                  >
                    <LinkIcon className="h-4 w-4" />
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
          <CardTitle className="text-lg">Quick Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-sm">1</div>
            <div>
              <p className="font-bold text-sm">Send Invite</p>
              <p className="text-xs text-muted-foreground mt-1">Share your link via WhatsApp, Telegram, or SMS.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-sm">2</div>
            <div>
              <p className="font-bold text-sm">Friend Joins</p>
              <p className="text-xs text-muted-foreground mt-1">They sign up using your link and are automatically linked to you.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0 text-sm">3</div>
            <div>
              <p className="font-bold text-sm">Get Rewards</p>
              <p className="text-xs text-muted-foreground mt-1">Rewards are processed automatically once your friend signs up and completes verification!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
