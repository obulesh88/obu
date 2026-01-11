'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Skeleton } from '../ui/skeleton';

export default function WalletPageContent() {
  const [showWithdraw, setShowWithdraw] = useState(true);
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = firestore && user ? doc(firestore, 'users', user.uid) : null;
  const { data: userProfile, loading: profileLoading } = useDoc<UserProfile>(userProfileRef);

  const loading = userLoading || profileLoading;

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4">
        <Card
          className={cn(
            'flex flex-col items-center justify-center p-6 cursor-pointer',
            showWithdraw && 'ring-2 ring-primary'
          )}
          onClick={() => setShowWithdraw(true)}
        >
          <div className="flex flex-col items-center justify-center">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full bg-card"
              aria-label="Earning"
            >
              <DollarSign className="h-6 w-6" />
            </Button>
            <p className="mt-2 font-semibold">Earning</p>
          </div>
        </Card>
        <Card
          className={cn(
            'flex flex-col items-center justify-center p-6 cursor-pointer',
            !showWithdraw && 'ring-2 ring-primary'
          )}
          onClick={() => setShowWithdraw(false)}
        >
          <div className="flex flex-col items-center justify-center">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full bg-card"
              aria-label="Deposit"
            >
              <Download className="h-6 w-6" />
            </Button>
            <p className="mt-2 font-semibold">Deposit</p>
          </div>
        </Card>
      </div>

      {showWithdraw && (
         <Card>
          <CardHeader>
             <CardTitle className="text-sm font-medium">Available to Withdraw</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             {loading ? (
                <Skeleton className="h-8 w-24" />
             ) : (
                <div className="text-2xl font-bold">₹{userProfile?.inrBalance?.toFixed(2) || '0.00'}</div>
             )}
            <Button className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Withdraw
            </Button>
          </CardContent>
        </Card>
      )}

      {!showWithdraw && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Deposit Options</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Add
            </Button>
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Withdrawal
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
