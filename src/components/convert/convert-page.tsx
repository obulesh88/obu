'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, ArrowRightLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/hooks/use-user';

const CONVERSION_RATE = 1000; // 1000 OR = 1 INR

export default function ConvertPage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();

  const [orAmount, setOrAmount] = useState('');
  const [inrAmount, setInrAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const orValue = parseFloat(orAmount);
    if (!isNaN(orValue) && orValue > 0) {
      setInrAmount((orValue / CONVERSION_RATE).toFixed(2));
    } else {
      setInrAmount('');
    }
  }, [orAmount]);

  const handleConvert = async () => {
    if (!user || !userProfile) {
      toast({
        variant: 'destructive',
        title: 'Not Authenticated',
        description: 'You must be logged in to convert coins.',
      });
      return;
    }

    const orToConvert = parseFloat(orAmount);

    if (isNaN(orToConvert) || orToConvert <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: 'Please enter a valid amount of OR coins to convert.',
      });
      return;
    }

    if (userProfile.wallet.orBalance < orToConvert) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Balance',
        description: 'You do not have enough OR coins to complete this conversion.',
      });
      return;
    }

    setIsConverting(true);
    try {
      // Mock conversion
      toast({
        title: 'Conversion Successful',
        description: `${orToConvert} OR coins have been converted to ₹${(orToConvert / CONVERSION_RATE).toFixed(2)} INR.`,
      });
      setOrAmount('');
      setInrAmount('');
    } catch (error: any) {
      console.error('Conversion failed: ', error);
      toast({
        variant: 'destructive',
        title: 'Conversion Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    } finally {
      setIsConverting(false);
    }
  };


  if (loading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-32 w-full" />
            </CardContent>
            <CardFooter>
                <Skeleton className="h-10 w-full" />
            </CardFooter>
        </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convert Coins</CardTitle>
        <CardDescription>Exchange your OR coins for INR instantly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-right text-sm font-medium text-muted-foreground">
          Available OR: {userProfile?.wallet?.orBalance?.toFixed(2) || '0.00'}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] items-center">
          <div className="space-y-2">
            <Label htmlFor="fromAmount">From</Label>
            <div className="relative">
              <Input 
                id="fromAmount" 
                type="number" 
                placeholder="0.00" 
                value={orAmount}
                onChange={(e) => setOrAmount(e.target.value)}
                disabled={isConverting}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-sm text-muted-foreground">OR</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-card" disabled>
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="toAmount">To</Label>
            <div className="relative">
              <Input 
                id="toAmount" 
                type="number" 
                placeholder="0.00" 
                value={inrAmount}
                readOnly 
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-sm text-muted-foreground">₹</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">1,000 OR = ₹1.00</p>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleConvert} disabled={isConverting || !user}>
          {isConverting ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {isConverting ? 'Converting...' : 'Convert Now'}
        </Button>
      </CardFooter>
    </Card>
  );
}
