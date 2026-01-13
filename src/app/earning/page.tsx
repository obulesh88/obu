
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Key } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CaptchaDialog } from '@/components/earning/captcha-dialog';

export default function EarningPage() {
  const [isCaptchaDialogOpen, setIsCaptchaDialogOpen] = useState(false);

  useEffect(() => {
    const eygb = {};
    const d = document;
    const s = d.createElement('script');
    const l = d.scripts[d.scripts.length - 1];
    s.settings = eygb;
    s.src = "//pristineproblem.com/bFX.V/sWd/GPlq0/YIWNco/cebmS9vuWZNUJlzk/PVTZYF2-NmzBM/xON/TdUkt/Ncj/YP3/MhzGEo1qNNgo";
    s.async = true;
    s.referrerPolicy = 'no-referrer-when-downgrade';
    if (l && l.parentNode) {
      l.parentNode.insertBefore(s, l);
    }
  }, []);

  const earningOptions = [
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
          <CardContent className="grid gap-4 md:grid-cols-2">
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
