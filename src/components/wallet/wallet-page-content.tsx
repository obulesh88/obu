'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download, RefreshCw, ArrowRightLeft, Building2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/firebase/errors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const CONVERSION_RATE = 1000; // 1000 OR = 1 INR

export default function WalletPageContent() {
  const [activeTab, setActiveTab] = useState<'earning' | 'deposit' | 'convert'>('earning');
  const { user, userProfile, loading } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [orAmount, setOrAmount] = useState('');
  const [inrAmount, setInrAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [bankData, setBankData] = useState({
    name: '',
    contact: '',
    email: '',
    accountNumber: '',
    ifsc: '',
  });

  useEffect(() => {
    if (userProfile?.bankDetails) {
      setBankData({
        name: userProfile.bankDetails.name || '',
        contact: userProfile.bankDetails.contact || '',
        email: userProfile.bankDetails.email || '',
        accountNumber: userProfile.bankDetails.accountNumber || '',
        ifsc: userProfile.bankDetails.ifsc || '',
      });
    }
  }, [userProfile]);

  useEffect(() => {
    const orValue = parseFloat(orAmount);
    if (!isNaN(orValue) && orValue > 0) {
      setInrAmount((orValue / CONVERSION_RATE).toFixed(2));
    } else {
      setInrAmount('');
    }
  }, [orAmount]);

  const handleSaveBankDetails = async () => {
    if (!user || !firestore) return;
    
    setIsSavingBank(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const updateData = {
      bankDetails: bankData,
      updatedAt: serverTimestamp()
    };

    updateDoc(userDocRef, updateData)
      .then(() => {
        toast({
          title: 'Bank Details Saved',
          description: 'Your payment information has been updated.',
        });
        setIsBankDialogOpen(false);
      })
      .catch(async (error: any) => {
        if (error.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
        } else {
          toast({
            variant: 'destructive',
            title: 'Failed to save',
            description: error.message
          });
        }
      })
      .finally(() => {
        setIsSavingBank(false);
      });
  };

  const handleConvert = async () => {
    if (!user || !userProfile || !firestore) {
      toast({ variant: 'destructive', title: 'Not Authenticated' });
      return;
    }

    const orToConvert = parseFloat(orAmount);
    if (isNaN(orToConvert) || orToConvert < 100) {
      toast({ 
        variant: 'destructive', 
        title: 'Invalid Amount', 
        description: 'Minimum conversion amount is 100 OR.' 
      });
      return;
    }

    if (userProfile.wallet.orBalance < orToConvert) {
      toast({ 
        variant: 'destructive', 
        title: 'Insufficient Balance', 
        description: 'You do not have enough OR coins.' 
      });
      return;
    }

    setIsConverting(true);
    const inrToAdd = orToConvert / CONVERSION_RATE;
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const updateData = {
        'wallet.orBalance': increment(-orToConvert),
        'wallet.inrBalance': increment(inrToAdd),
        'updatedAt': serverTimestamp()
    };

    updateDoc(userDocRef, updateData)
        .then(() => {
            toast({
                title: 'Conversion Successful',
                description: `${orToConvert} OR coins converted to ₹${inrToAdd.toFixed(2)} INR.`,
            });
            setOrAmount('');
            setIsConverting(false);
        })
        .catch(async (error: any) => {
            setIsConverting(false);
            if (error.code === 'permission-denied') {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                } satisfies SecurityRuleContext);
                errorEmitter.emit('permission-error', permissionError);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Conversion Failed',
                    description: error.message || 'An unexpected error occurred.'
                });
            }
        });
  };

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={cn(
            'flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:bg-primary/5',
            activeTab === 'earning' && 'ring-2 ring-primary bg-primary/5'
          )}
          onClick={() => setActiveTab('earning')}
        >
          <DollarSign className={cn("h-6 w-6 mb-2", activeTab === 'earning' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-xs font-semibold">Earnings</p>
        </Card>
        <Card
          className={cn(
            'flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:bg-primary/5',
            activeTab === 'deposit' && 'ring-2 ring-primary bg-primary/5'
          )}
          onClick={() => setActiveTab('deposit')}
        >
          <Download className={cn("h-6 w-6 mb-2", activeTab === 'deposit' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-xs font-semibold">Deposit</p>
        </Card>
        <Card
          className={cn(
            'flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:bg-primary/5',
            activeTab === 'convert' && 'ring-2 ring-primary bg-primary/5'
          )}
          onClick={() => setActiveTab('convert')}
        >
          <RefreshCw className={cn("h-6 w-6 mb-2", activeTab === 'convert' ? "text-primary animate-spin-slow" : "text-muted-foreground")} />
          <p className="text-xs font-semibold">Convert</p>
        </Card>
      </div>

      {activeTab === 'earning' && (
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Available to Withdraw</CardTitle>
             <Button 
               variant="ghost" 
               size="sm" 
               className="h-8 gap-1 text-[10px] uppercase font-bold text-primary hover:text-primary/80 hover:bg-primary/10" 
               onClick={() => setIsBankDialogOpen(true)}
             >
               <Building2 className="h-3 w-3" />
               Bank Details
             </Button>
          </CardHeader>
          <CardContent className="space-y-4">
             {loading ? (
                <Skeleton className="h-8 w-24" />
             ) : (
                <div className="text-3xl font-bold text-primary">₹{userProfile?.wallet?.inrBalance?.toFixed(2) || '0.00'}</div>
             )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'deposit' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Deposit Options</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <Button variant="outline" className="justify-start">
              <Download className="mr-2 h-4 w-4" />
              Add Cash via UPI
            </Button>
            <Button variant="outline" className="justify-start">
              <Download className="mr-2 h-4 w-4" />
              Deposit via Wallet
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'convert' && (
        <Card>
          <CardHeader>
            <CardTitle>Convert OR to INR</CardTitle>
            <CardDescription>Exchange your earned OR coins for real cash instantly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-right text-xs font-medium text-muted-foreground">
              Available: {userProfile?.wallet?.orBalance?.toFixed(2) || '0.00'} OR
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="orAmount">Amount (OR)</Label>
                <div className="relative">
                  <Input 
                    id="orAmount" 
                    type="number" 
                    placeholder="Enter OR coins" 
                    value={orAmount}
                    onChange={(e) => setOrAmount(e.target.value)}
                    disabled={isConverting}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-primary">OR</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="bg-muted rounded-full p-2">
                  <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inrAmount">Receiving (INR)</Label>
                <div className="relative">
                  <Input 
                    id="inrAmount" 
                    type="number" 
                    placeholder="0.00" 
                    value={inrAmount}
                    readOnly 
                    className="bg-muted font-bold text-green-600"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-green-600">₹</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="rounded-md bg-muted p-3">
              <p className="text-[10px] text-muted-foreground text-center">
                Conversion Rate: 1,000 OR = ₹1.00 INR
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleConvert} 
              disabled={isConverting || !orAmount || parseFloat(orAmount) < 100}
            >
              {isConverting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {isConverting ? 'Converting...' : 'Convert Now'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Bank Details Dialog */}
      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Bank Details</DialogTitle>
            <DialogDescription>
              Enter your bank account information to receive payments.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bank-name">Full Name (Bank Record)</Label>
              <Input 
                id="bank-name" 
                value={bankData.name} 
                onChange={(e) => setBankData({...bankData, name: e.target.value})}
                placeholder="John Doe" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-contact">Contact Number</Label>
              <Input 
                id="bank-contact" 
                value={bankData.contact} 
                onChange={(e) => setBankData({...bankData, contact: e.target.value})}
                placeholder="10-digit number" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-email">Email</Label>
              <Input 
                id="bank-email" 
                type="email"
                value={bankData.email} 
                onChange={(e) => setBankData({...bankData, email: e.target.value})}
                placeholder="email@example.com" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-acc">Account Number</Label>
              <Input 
                id="bank-acc" 
                value={bankData.accountNumber} 
                onChange={(e) => setBankData({...bankData, accountNumber: e.target.value})}
                placeholder="Your account number" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-ifsc">IFSC Code</Label>
              <Input 
                id="bank-ifsc" 
                value={bankData.ifsc} 
                onChange={(e) => setBankData({...bankData, ifsc: e.target.value})}
                placeholder="Bank IFSC code" 
                className="uppercase"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveBankDetails} disabled={isSavingBank} className="w-full">
              {isSavingBank ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
