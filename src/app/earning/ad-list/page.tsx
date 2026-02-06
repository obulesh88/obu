'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdDialog } from '@/components/earning/ad-dialog';
import { Tv, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const NUM_ADS = 10;
const REWARD_PER_AD = 5;
const ADS_STORAGE_KEY = 'or_wallet_completed_ads';
const ADS_DAY_KEY = 'or_wallet_ads_last_day';

export default function AdListPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [completed, setCompleted] = useState<boolean[]>(() => Array(NUM_ADS).fill(false));
  const [currentAdIndex, setCurrentAdIndex] = useState<number | null>(null);
  const [allAdsCompleted, setAllAdsCompleted] = useState(false);

  useEffect(() => {
    const today = new Date().toDateString();
    const lastDay = localStorage.getItem(ADS_DAY_KEY);
    let initialCompleted = Array(NUM_ADS).fill(false);

    if (lastDay !== today) {
      localStorage.setItem(ADS_DAY_KEY, today);
      localStorage.removeItem(ADS_STORAGE_KEY);
    } else {
      const storedCompleted = localStorage.getItem(ADS_STORAGE_KEY);
      if (storedCompleted) {
        try {
          const parsed = JSON.parse(storedCompleted);
          if (Array.isArray(parsed) && parsed.length === NUM_ADS) {
             initialCompleted = parsed;
          }
        } catch (e) {
            console.error("Failed to parse completed ads from storage", e);
        }
      }
    }
    setCompleted(initialCompleted);
    if (initialCompleted.every(c => c)) {
        setAllAdsCompleted(true);
    }
  }, []);

  useEffect(() => {
    if (completed.every(c => c)) {
      setAllAdsCompleted(true);
    }
  }, [completed]);

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

  const renderAdCard = (index: number) => (
    <Card key={index} className="overflow-hidden border-primary/10 transition-colors hover:border-primary/30">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        <div className="rounded-full bg-primary/10 p-3 mb-4">
          <Tv className="h-6 w-6 text-primary" />
        </div>
        <p className="font-semibold mb-1">Ad #{index + 1}</p>
        <p className="text-xs text-muted-foreground mb-4">Reward: {REWARD_PER_AD} OR</p>
        <Button 
          onClick={() => handleWatchAdClick(index)} 
          disabled={completed[index]}
          variant={completed[index] ? "secondary" : "default"}
          className="w-full"
        >
          {completed[index] ? 'Completed' : 'Watch Ad'}
        </Button>
      </CardContent>
    </Card>
  );

  const getCurrentDivision = () => {
    if (currentAdIndex === null) return 'A';
    if (currentAdIndex < 3) return 'A';
    if (currentAdIndex < 6) return 'B';
    return 'C';
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Watch Ads & Earn</CardTitle>
          <CardDescription>
            Watch short ads to earn OR coins. You can watch up to {NUM_ADS} ads daily.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allAdsCompleted ? (
            <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <h3 className="text-xl font-bold">All Ads Watched for Today!</h3>
              <p className="text-muted-foreground">Come back tomorrow for more rewards.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Division A */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-primary">Division A</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  {[0, 1, 2].map(index => renderAdCard(index))}
                </div>
              </div>

              {/* Division B */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-primary">Division B</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
                  {[3, 4, 5].map(index => renderAdCard(index))}
                </div>
              </div>

              {/* Division C */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-primary">Division C</h3>
                  <Separator className="flex-1" />
                </div>
                <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                  {[6, 7, 8, 9].map(index => renderAdCard(index))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AdDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onComplete={handleAdComplete}
        gameId={currentAdIndex !== null ? `ad_${currentAdIndex + 1}` : ''}
        division={getCurrentDivision()}
      />
    </div>
  );
}