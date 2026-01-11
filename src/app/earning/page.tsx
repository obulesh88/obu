'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Tv, Key } from 'lucide-react';
import { useState } from 'react';
import { CaptchaDialog } from '@/components/earning/captcha-dialog';

export default function EarningPage() {
  const [isCaptchaDialogOpen, setIsCaptchaDialogOpen] = useState(false);

  const earningOptions = [
    { name: 'Watch Ads', icon: <Tv className="h-8 w-8" />, action: () => {} },
    { name: 'Play Games', icon: <Gamepad2 className="h-8 w-8" />, action: () => {} },
    { name: 'Solve Captcha', icon: <Key className="h-8 w-8" />, action: () => setIsCaptchaDialogOpen(true) },
  ];

  return (
    <>
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Choose How to Earn</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {earningOptions.map((option) => (
              <Card key={option.name} className="flex flex-col items-center justify-center p-6 text-center">
                {option.icon}
                <p className="mt-4 font-semibold">{option.name}</p>
                <Button variant="secondary" className="mt-4" onClick={option.action}>
                  Start
                </Button>
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
      <CaptchaDialog open={isCaptchaDialogOpen} onOpenChange={setIsCaptchaDialogOpen} />
    </>
  );
}
