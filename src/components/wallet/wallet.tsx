'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Input } from '../ui/input';

export default function Wallet() {

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold">Convert</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <div className="space-y-4">
            <div className="rounded-lg border bg-secondary/30 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>From</span>
                <span>Available balance: 0.003</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="9" stroke="hsl(var(--destructive))" strokeWidth="2"></circle>
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" fill="hsl(var(--destructive))" fillOpacity="0.5"></path>
                    <circle cx="12" cy="12" r="1" fill="white"></circle>
                  </svg>
                  <span className="font-semibold">OR</span>
                </div>
                <Input
                  type="number"
                  defaultValue="0"
                  className="w-24 border-none bg-transparent text-right text-2xl font-bold focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="absolute inset-x-0 top-1/2 -translate-y-9 transform">
              <div className="flex justify-center">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-card">
                  <RefreshCw className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border bg-secondary/30 p-4">
              <div className="text-xs text-muted-foreground">
                <span>To</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-destructive">₹</span>
                  <span className="font-semibold">INR</span>
                </div>
                <span className="text-2xl font-bold text-muted-foreground">--</span>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center text-xs text-muted-foreground">
            1000 OR ≈ ₹1
          </div>
          <Button variant="destructive" size="lg" className="mt-6 w-full font-bold">
             <Avatar className="mr-2 h-6 w-6 bg-white/20">
                <AvatarFallback className="bg-transparent text-destructive-foreground">N</AvatarFallback>
            </Avatar>
            Convert Now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
