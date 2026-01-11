'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download } from 'lucide-react';

export default function WalletPageContent() {
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4">
        <Card className="flex flex-col items-center justify-center p-6">
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-card">
            <DollarSign className="h-6 w-6" />
          </Button>
          <p className="mt-2 font-semibold">Earning</p>
        </Card>
        <Card className="flex flex-col items-center justify-center p-6">
          <Button variant="outline" size="icon" className="h-12 w-12 rounded-full bg-card">
            <Download className="h-6 w-6" />
          </Button>
          <p className="mt-2 font-semibold">Deposit</p>
        </Card>
      </div>
    </div>
  );
}
