
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Share2, Users, Gift } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { FaWhatsapp, FaTelegramPlane } from 'react-icons/fa';

export default function ReferralPage() {
  const { userProfile, loading } = useUser();
  const { toast } = useToast();
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const referralCode = userProfile?.referral?.code || '------';
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/r/${referralCode}` : '';
  const shareText = `Join OR wallet and earn money by completing simple tasks! Use my link to join: ${shareUrl}`;

  const handleCopyCode = () => {
    if (userProfile?.referral?.code) {
      navigator.clipboard.writeText(userProfile.referral.code);
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard.' });
    }
  };

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    setIsShareDialogOpen(false);
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    setIsShareDialogOpen(false);
  };

  if (loading) return <Skeleton className="h-[400px] w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black uppercase">Invite & Earn</h1>
        <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Build your network</p>
      </div>

      <Card className="bg-primary text-primary-foreground border-none overflow-hidden relative">
        <div className="absolute top-[-20%] right-[-10%] opacity-10">
          <Users className="h-64 w-64" />
        </div>
        <CardHeader>
          <CardTitle className="text-3xl font-black">GET 100 OR</CardTitle>
          <CardDescription className="text-primary-foreground/80 font-bold uppercase">For every friend who joins</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
            <p className="text-xs font-bold uppercase mb-2 opacity-70">Your Referral Code</p>
            <div className="flex items-center justify-between gap-4">
              <span className="text-4xl font-black tracking-tighter">{referralCode}</span>
              <Button variant="secondary" size="icon" onClick={handleCopyCode} className="h-12 w-12 rounded-xl">
                <Copy className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="secondary" className="w-full h-12 font-bold" onClick={() => setIsShareDialogOpen(true)}>
            <Share2 className="mr-2 h-5 w-5" /> SHARE LINK
          </Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="text-center p-4">
          <p className="text-2xl font-black">{userProfile?.referral?.count || 0}</p>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Referrals</p>
        </Card>
        <Card className="text-center p-4">
          <p className="text-2xl font-black">{userProfile?.referral?.earnings || 0}</p>
          <p className="text-[10px] font-bold uppercase text-muted-foreground">Referral Earnings</p>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase">How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { icon: <Share2 className="h-4 w-4" />, text: 'Share your unique referral link with friends.' },
            { icon: <Users className="h-4 w-4" />, text: 'Friends join OR wallet using your link.' },
            { icon: <Gift className="h-4 w-4" />, text: 'Receive 100 OR coins instantly upon their registration.' },
          ].map((item, i) => (
            <div key={i} className="flex gap-4 items-start">
              <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                {item.icon}
              </div>
              <p className="text-xs font-medium leading-relaxed">{item.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black uppercase">Share Referral Link</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase">
              Choose a platform to invite your friends
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button
              variant="outline"
              className="flex flex-col h-24 gap-2 border-green-500/20 hover:bg-green-500/10 hover:text-green-600"
              onClick={shareToWhatsApp}
            >
              <FaWhatsapp className="h-8 w-8 text-green-500" />
              <span className="font-bold uppercase text-[10px]">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              className="flex flex-col h-24 gap-2 border-blue-400/20 hover:bg-blue-400/10 hover:text-blue-500"
              onClick={shareToTelegram}
            >
              <FaTelegramPlane className="h-8 w-8 text-blue-400" />
              <span className="font-bold uppercase text-[10px]">Telegram</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
