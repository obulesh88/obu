'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, ArrowRightLeft } from 'lucide-react';

export default function ConvertPage() {
  const { toast } = useToast();

  const handleConvert = () => {
    toast({
      title: 'Conversion Successful',
      description: 'Your OR coins have been converted to INR.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convert Coins</CardTitle>
        <CardDescription>Exchange your OR coins for INR instantly.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr] items-center">
          <div className="space-y-2">
            <Label htmlFor="fromAmount">From</Label>
            <div className="relative">
              <Input id="fromAmount" type="number" placeholder="0.00" />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-sm text-muted-foreground">OR</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-card">
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="toAmount">To</Label>
            <div className="relative">
              <Input id="toAmount" type="number" placeholder="0.00" readOnly />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-sm text-muted-foreground">INR</span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">1 OR = ₹10.00</p>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleConvert}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Convert Now
        </Button>
      </CardFooter>
    </Card>
  );
}
