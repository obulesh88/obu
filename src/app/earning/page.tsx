'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Key, Tv } from 'lucide-react';
import { useEffect } from 'react';
import Link from 'next/link';

export default function EarningPage() {

  useEffect(() => {
    const script = document.createElement('script');
    script.settings = {};
    script.src = "//frail-benefit.com/cQD/9M6.bC2/5llISRWHQ-9YNIjYcx0uNij_k/4SNViV0a2QN/z/Qi2dOwTvgc3F";
    script.async = true;
    script.referrerPolicy = 'no-referrer-when-downgrade';

    const lastScript = document.scripts[document.scripts.length - 1];
    if(lastScript && lastScript.parentNode) {
      lastScript.parentNode.insertBefore(script, lastScript);
    } else {
      document.body.appendChild(script);
    }
  }, []);


  const earningOptions = [
    { name: 'Solve Captcha', icon: <Key className="h-8 w-8" />, href: '/earning/captcha-list' },
    { name: 'Watch Ads', icon: <Tv className="h-8 w-8" />, href: '/earning/ad-list' },
  ];

  return (
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
                {option.href ? (
                  <Button asChild variant="secondary" className="mt-4">
                    <Link href={option.href}>Start</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" className="mt-4" onClick={option.action}>
                    Start
                  </Button>
                )}
              </Card>
            ))}
          </CardContent>
        </Card>
      </div>
  );
}
