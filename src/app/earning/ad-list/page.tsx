'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdDialog } from '@/components/earning/ad-dialog';
import { Tv } from 'lucide-react';

const NUM_ADS = 10;
const REWARD_PER_AD = 10;

export default function AdListPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watch Ads & Earn</CardTitle>
        <CardDescription>
          Watch a short ad to earn {REWARD_PER_AD} OR coins. You can watch up to {NUM_ADS} ads.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: NUM_ADS }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <Tv className="h-10 w-10 text-primary mb-4" />
              <p className="font-semibold mb-2">Ad #{index + 1}</p>
              <p className="text-sm text-muted-foreground mb-4">Earn {REWARD_PER_AD} OR</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                Watch Ad
              </Button>
            </CardContent>
          </Card>
        ))}
      </CardContent>
      <AdDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </Card>
  );
}
