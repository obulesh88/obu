'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Key, Tv, Gamepad2 } from 'lucide-react';
import Link from 'next/link';

export default function EarningPage() {
  const earningOptions = [
    { name: 'Solve Captcha', icon: <Key className="h-8 w-8" />, href: '/earning/captcha-list' },
    { name: 'Watch Ads', icon: <Tv className="h-8 w-8" />, href: '/earning/ad-list' },
    { name: 'Play Games', icon: <Gamepad2 className="h-8 w-8" />, href: '/earning/games' },
  ];

  return (
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Choose How to Earn</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {earningOptions.map((option) => (
              <Card key={option.name} className="flex flex-col items-center justify-center p-6 text-center">
                {option.icon}
                <p className="mt-4 font-semibold">{option.name}</p>
                {option.href ? (
                  <Button asChild variant="secondary" className="mt-4">
                    <Link href={option.href}>Start</Link>
                  </Button>
                ) : (
                  <Button variant="secondary" className="mt-4">
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
