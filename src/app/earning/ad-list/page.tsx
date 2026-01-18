'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdDialog } from '@/components/earning/ad-dialog';
import { Tv } from 'lucide-react';

const NUM_ADS = 10;
const REWARD_PER_AD = 10;
const ADS_STORAGE_KEY = 'or_wallet_completed_ads';
const ADS_DAY_KEY = 'or_wallet_ads_last_day';

export default function AdListPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [completed, setCompleted] = useState<boolean[]>(() => Array(NUM_ADS).fill(false));
  const [currentAdIndex, setCurrentAdIndex] = useState<number | null>(null);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastDay = localStorage.getItem(ADS_DAY_KEY);

    if (lastDay !== today) {
      localStorage.setItem(ADS_DAY_KEY, today);
      localStorage.removeItem(ADS_STORAGE_KEY);
      setCompleted(Array(NUM_ADS).fill(false));
    } else {
      const storedCompleted = localStorage.getItem(ADS_STORAGE_KEY);
      if (storedCompleted) {
        try {
          const parsed = JSON.parse(storedCompleted);
          if (Array.isArray(parsed) && parsed.length === NUM_ADS) {
             setCompleted(parsed);
          }
        } catch (e) {
            console.error("Failed to parse completed ads from storage", e);
        }
      }
    }
  }, []);

  const handleWatchAdClick = (index: number) => {
    setCurrentAdIndex(index);
    setIsDialogOpen(true);
  };

  const handleAdComplete = () => {
    if (currentAdIndex !== null) {
      setCompleted(prev => {
        const newCompleted = [...prev];
        newCompleted[currentAdIndex] = true;
        localStorage.setItem(ADS_STORAGE_KEY, JSON.stringify(newCompleted));
        return newCompleted;
      });
    }
  };

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
              <Button onClick={() => handleWatchAdClick(index)} disabled={completed[index]}>
                {completed[index] ? 'Completed' : 'Watch Ad'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </CardContent>
      <AdDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onComplete={handleAdComplete}
      />
    </Card>
  );
}
