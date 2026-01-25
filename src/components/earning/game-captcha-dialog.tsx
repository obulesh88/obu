'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function generateCaptcha() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function GameCaptchaDialog({
  open,
  onOpenChange,
  onVerify,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: () => void;
}) {
  const { toast } = useToast();
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (open) {
      setCaptchaText(generateCaptcha());
      setUserInput('');
      setIsVerifying(false);
    }
  }, [open]);

  const refreshCaptcha = () => {
    if (isVerifying) return;
    setCaptchaText(generateCaptcha());
  };

  const handleVerify = () => {
    if (userInput.toUpperCase() !== captchaText) {
      toast({
        variant: 'destructive',
        title: 'Incorrect Captcha',
        description: 'Please try again.',
      });
      refreshCaptcha();
      setUserInput('');
      return;
    }
    setIsVerifying(true);
    onVerify();
  };
  
  // To prevent closing dialog on overlay click
  const handleOpenChange = (isOpen: boolean) => {
    if (!isVerifying) {
      onOpenChange(isOpen);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Verification Required</DialogTitle>
          <DialogDescription>Please solve the captcha to prove you are human and claim your reward.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-full select-none rounded-md border bg-muted p-4 text-center font-mono text-2xl tracking-widest">
              {captchaText}
            </div>
            <Button variant="ghost" size="icon" onClick={refreshCaptcha} disabled={isVerifying}>
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="game-captcha-input">Enter Captcha</Label>
            <Input
              id="game-captcha-input"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Your answer"
              autoComplete="off"
              disabled={isVerifying}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleVerify} disabled={!userInput || isVerifying}>
            {isVerifying ? 'Verifying...' : 'Verify & Claim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
