'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, History, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '../ui/avatar';

export default function WalletHomePage() {
  const { toast } = useToast();
  const walletAddress = 'ORA4I30NRTT';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: 'Copied!',
      description: 'Wallet address copied to clipboard.',
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Your INR Balance</CardTitle>
          <span className="font-semibold">₹</span>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">₹0.303</div>
          <p className="text-xs text-muted-foreground">Available to withdraw</p>
          <Button variant="secondary" className="mt-4">
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Your OR Balance</CardTitle>
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">0.003</div>
          <p className="text-xs text-muted-foreground">OR Coins</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Your OR Wallet Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <Avatar className="h-10 w-10">
                <AvatarFallback>N</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="font-mono text-lg">{walletAddress}</p>
                <p className="text-xs text-muted-foreground">Share this address to receive OR coins.</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={copyToClipboard}>
              <Copy className="h-5 w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
