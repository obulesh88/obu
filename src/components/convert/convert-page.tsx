
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
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';

const CONVERSION_RATE = 1000; // 1000 OR = 1 INR
const MIN_CONVERSION = 100;

export default function ConvertPage() {
  const { toast } = useToast();
  const { user, userProfile, loading } = useUser();
  const firestore = useFirestore();

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
    if (!user || !userProfile || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    const orToConvert = parseFloat(orAmount);
    if (isNaN(orToConvert) || orToConvert < MIN_CONVERSION) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: `Min conversion is ${MIN_CONVERSION} OR.` });
      return;
    }

    if (userProfile.wallet.orBalance < orToConvert) {
      toast({ variant: 'destructive', title: 'Insufficient Balance' });
      return;
    }

    setIsConverting(true);
    const inrToAdd = orToConvert / CONVERSION_RATE;
    const userDocRef = doc(firestore, 'users', user.uid);
    const updateData = {
        'wallet.orBalance': increment(-orToConvert),
        'wallet.inrBalance': increment(inrToAdd),
        'updatedAt': serverTimestamp()
    };

    updateDoc(userDocRef, updateData)
      .then(() => {
        // Log Transaction
        const transactionsRef = collection(firestore, 'transactions');
        addDoc(transactionsRef, {
            userId: user.uid,
            amount: orToConvert,
            currency: 'OR',
            type: 'conversion',
            description: `Converted to ₹${inrToAdd.toFixed(2)} INR`,
            createdAt: serverTimestamp()
        });
        
        toast({ title: 'Conversion Successful', description: `${orToConvert} OR converted to ₹${inrToAdd.toFixed(2)} INR.` });
        setOrAmount('');
      })
      .catch(async (error: any) => {
        if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        }
      })
      .finally(() => setIsConverting(false));
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
      </Card>
    );
  }

  return (
    <Card className="border-primary/10">
      <CardHeader>
        <CardTitle>Convert Coins</CardTitle>
        <CardDescription>Exchange your OR coins for INR instantly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center bg-muted/50 p-4 rounded-xl border border-primary/10">
          <div className="text-center flex-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Available OR</p>
            <p className="text-lg font-black text-primary">{userProfile?.wallet?.orBalance?.toLocaleString() || '0'}</p>
          </div>
          <Separator orientation="vertical" className="h-10" />
          <div className="text-center flex-1">
            <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Available INR</p>
            <p className="text-lg font-black text-green-600">₹{userProfile?.wallet?.inrBalance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] items-center">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">From (OR)</Label>
            <div className="relative">
              <Input type="number" placeholder="0" value={orAmount} onChange={(e) => setOrAmount(e.target.value)} disabled={isConverting} className="h-12 font-bold" />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-xs font-bold text-muted-foreground">OR</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center pt-6">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border shadow-sm">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase">To (INR)</Label>
            <div className="relative">
              <Input type="number" placeholder="0.00" value={inrAmount} readOnly className="h-12 font-bold bg-muted" />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-xs font-bold text-muted-foreground">₹</span>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-primary/5 p-3 rounded-lg border border-primary/20">
          <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-widest">
            Conversion Rate: 1,000 OR = ₹1.00
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full h-12 font-black uppercase text-lg" onClick={handleConvert} disabled={isConverting || !user || !orAmount}>
          {isConverting ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <RefreshCw className="mr-2 h-5 w-5" />}
          Convert Now
        </Button>
      </CardFooter>
    </Card>
  );
}
