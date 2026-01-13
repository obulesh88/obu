
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gamepad2, Key } from 'lucide-react';
import { useState, useEffect } from 'react';
import { CaptchaDialog } from '@/components/earning/captcha-dialog';

export default function EarningPage() {
  const [isCaptchaDialogOpen, setIsCaptchaDialogOpen] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    const lastScript = document.scripts[document.scripts.length - 1];
    script.src = "//frail-benefit.com/cQD/9M6.bC2/5llISRWHQ-9YNIjYcx0uNij_k/4SNViV0a2QN/z/Qi2dOwTvgc3F";
    script.async = true;
    script.referrerPolicy = 'no-referrer-when-downgrade';

    if(lastScript && lastScript.parentNode) {
      lastScript.parentNode.insertBefore(script, lastScript);
    } else {
      document.body.appendChild(script);
    }
  }, []);

  const handleCaptchaStart = () => {
    const script = document.createElement('script');
    script.src = 'https://multicoloredsister.com/bF3gV_0.PF3-pzvgbQmcV/JdZTD/0T2kN/zuQ_2jOLTngY2TLxTiYk3sNbDIY/5aOvDUcH';
    script.async = true;
    document.body.appendChild(script);
    setIsCaptchaDialogOpen(true);
  };


  const earningOptions = [
    { name: 'Play Games', icon: <Gamepad2 className="h-8 w-8" />, action: () => {} },
    { name: 'Solve Captcha', icon: <Key className="h-8 w-8" />, action: handleCaptchaStart },
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
