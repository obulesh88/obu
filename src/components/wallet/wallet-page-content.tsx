'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download, Upload } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function WalletPageContent() {
  const [showWithdraw, setShowWithdraw] = useState(false);

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
          <CardContent className="p-6">
            <Button className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Withdraw
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
