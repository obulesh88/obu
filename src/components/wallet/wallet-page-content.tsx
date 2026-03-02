'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, RefreshCw, ArrowRightLeft, Building2, Save, Send, ShieldCheck, Ticket, CreditCard, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { useUser } from '@/hooks/use-user';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp, collection, addDoc } from 'firebase/firestore';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CONVERSION_RATE = 1000; // 1000 OR = 1 INR
const MIN_WITHDRAWAL = 1;
const MAX_WITHDRAWAL = 10; // Updated limit

export default function WalletPageContent() {
  const [activeTab, setActiveTab] = useState<'earning' | 'convert'>('earning');
  const { user, userProfile, loading } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [orAmount, setOrAmount] = useState('');
  const [convertInrAmount, setConvertInrAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [payoutType, setPayoutType] = useState<'bank' | 'upi' | 'giftcard'>('upi');
  
  const [bankData, setBankData] = useState({
    name: '',
    contact: '',
    email: '',
    accountNumber: '',
    ifsc: '',
    vpa: '',
    giftCardEmail: '',
  });

  useEffect(() => {
    if (userProfile?.bankDetails) {
      setBankData({
        name: userProfile.bankDetails.name || '',
        contact: userProfile.bankDetails.contact || '',
        email: userProfile.bankDetails.email || '',
        accountNumber: userProfile.bankDetails.accountNumber || '',
        ifsc: userProfile.bankDetails.ifsc || '',
        vpa: userProfile.bankDetails.vpa || '',
        giftCardEmail: userProfile.bankDetails.giftCardEmail || userProfile.email || '',
      });
      if (userProfile.bankDetails.payoutType) {
        setPayoutType(userProfile.bankDetails.payoutType as any);
      }
    }
  }, [userProfile]);

  useEffect(() => {
    const orValue = parseFloat(orAmount);
    if (!isNaN(orValue) && orValue > 0) {
      setConvertInrAmount((orValue / CONVERSION_RATE).toFixed(2));
    } else {
      setConvertInrAmount('');
    }
  }, [orAmount]);

  const handleSaveBankDetails = async () => {
    if (!user || !firestore) return;
    
    setIsSavingBank(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    
    const updateData = {
      bankDetails: {
        ...bankData,
        payoutType: payoutType
      },
      updatedAt: serverTimestamp()
    };

    updateDoc(userDocRef, updateData)
      .then(() => {
        toast({
          title: 'Details Saved',
          description: 'Your destination payout details have been updated.',
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
        }
      })
      .finally(() => {
        setIsSavingBank(false);
      });
  };

  const handleWithdraw = async () => {
    if (!user || !userProfile || !firestore) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount' });
      return;
    }

    if (amount < MIN_WITHDRAWAL) {
      toast({ variant: 'destructive', title: 'Limit', description: `Min withdrawal ₹${MIN_WITHDRAWAL}.` });
      return;
    }

    if (amount > MAX_WITHDRAWAL) {
        toast({ variant: 'destructive', title: 'Limit Exceeded', description: `Max withdrawal ₹${MAX_WITHDRAWAL}.` });
        return;
    }

    if (amount > (userProfile.wallet?.inrBalance || 0)) {
      toast({ variant: 'destructive', title: 'Insufficient Balance' });
      return;
    }

    // Validation based on type
    if (payoutType === 'bank' && (!bankData.accountNumber || !bankData.ifsc)) {
      toast({ variant: 'destructive', title: 'Bank Info Missing' });
      setIsBankDialogOpen(true);
      return;
    }
    if (payoutType === 'upi' && !bankData.vpa) {
      toast({ variant: 'destructive', title: 'UPI ID Missing' });
      setIsBankDialogOpen(true);
      return;
    }
    if (payoutType === 'giftcard' && !bankData.giftCardEmail) {
      toast({ variant: 'destructive', title: 'Email Missing' });
      setIsBankDialogOpen(true);
      return;
    }

    setIsWithdrawing(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const requestsRef = collection(firestore, 'payout_requests');
    
    const updateData = {
      'wallet.inrBalance': increment(-amount),
      'updatedAt': serverTimestamp()
    };

    const requestData = {
      userId: user.uid,
      amount: amount,
      status: 'pending',
      payoutDetails: {
        ...bankData,
        payoutType: payoutType
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDoc(requestsRef, requestData)
      .then(() => {
        updateDoc(userDocRef, updateData)
          .then(() => {
            toast({
              title: 'Withdrawal Requested',
              description: `₹${amount.toFixed(2)} request submitted. Verification in progress.`,
            });
            setWithdrawAmount('');
          });
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit request.' });
      })
      .finally(() => {
        setIsWithdrawing(false);
      });
  };

  const handleConvert = async () => {
    if (!user || !userProfile || !firestore) return;
    const orToConvert = parseFloat(orAmount);
    if (isNaN(orToConvert) || orToConvert < 100) {
      toast({ variant: 'destructive', title: 'Min 100 OR' });
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
            toast({ title: 'Success', description: `Converted to ₹${inrToAdd.toFixed(2)}` });
            setOrAmount('');
            setIsConverting(false);
        })
        .catch(() => setIsConverting(false));
  };

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-4">
        <Card
          className={cn(
            'flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:bg-primary/5',
            activeTab === 'earning' && 'ring-2 ring-primary bg-primary/5'
          )}
          onClick={() => setActiveTab('earning')}
        >
          <DollarSign className={cn("h-6 w-6 mb-2", activeTab === 'earning' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[10px] font-bold uppercase">Withdraw</p>
        </Card>
        <Card
          className={cn(
            'flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:bg-primary/5',
            activeTab === 'convert' && 'ring-2 ring-primary bg-primary/5'
          )}
          onClick={() => setActiveTab('convert')}
        >
          <RefreshCw className={cn("h-6 w-6 mb-2", activeTab === 'convert' ? "text-primary animate-spin-slow" : "text-muted-foreground")} />
          <p className="text-[10px] font-bold uppercase">Convert</p>
        </Card>
      </div>

      {activeTab === 'earning' && (
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
             <Button 
               variant="ghost" 
               size="sm" 
               className="h-8 gap-1 text-[10px] uppercase font-bold text-primary hover:text-primary/80 hover:bg-primary/10" 
               onClick={() => setIsBankDialogOpen(true)}
             >
               <Building2 className="h-3 w-3" />
               Payout Method
             </Button>
          </CardHeader>
          <CardContent className="space-y-6">
             {loading ? (
                <Skeleton className="h-8 w-24" />
             ) : (
                <div className="text-4xl font-black text-primary">₹{userProfile?.wallet?.inrBalance?.toFixed(2) || '0.00'}</div>
             )}
             
             <div className="space-y-2">
                <Label htmlFor="withdrawAmount" className="text-xs uppercase font-bold opacity-70">Amount to Withdraw</Label>
                <div className="relative">
                  <Input 
                    id="withdrawAmount" 
                    type="number" 
                    placeholder={`Min ₹${MIN_WITHDRAWAL}`} 
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={isWithdrawing}
                    className="font-bold text-xl h-12"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-sm font-bold text-muted-foreground">₹</span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
                    <p className="text-muted-foreground">Limit: ₹{MIN_WITHDRAWAL} - ₹{MAX_WITHDRAWAL}</p>
                    <p className="text-primary">Manual Verification</p>
                </div>
             </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
                className="w-full h-12 text-lg font-bold" 
                onClick={handleWithdraw} 
                disabled={isWithdrawing || !withdrawAmount || parseFloat(withdrawAmount) <= 0}
            >
                {isWithdrawing ? (
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                    <Send className="mr-2 h-5 w-5" />
                )}
                {isWithdrawing ? 'Processing...' : 'Request Payout'}
            </Button>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase">
                <ShieldCheck className="h-3 w-3 text-green-500" />
                Secure Privacy Protocol Enabled
            </div>
          </CardFooter>
        </Card>
      )}

      {activeTab === 'convert' && (
        <Card>
          <CardHeader>
            <CardTitle>OR to INR</CardTitle>
            <CardDescription>Exchange OR coins for real cash instantly.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-right text-[10px] font-bold text-muted-foreground uppercase">
              Balance: {userProfile?.wallet?.orBalance?.toFixed(0) || '0'} OR
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="orAmount">Amount (OR)</Label>
                <div className="relative">
                  <Input 
                    id="orAmount" 
                    type="number" 
                    placeholder="Min 100 OR" 
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
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="inrAmount">Receiving (INR)</Label>
                <div className="relative">
                  <Input 
                    id="inrAmount" 
                    type="number" 
                    placeholder="0.00" 
                    value={convertInrAmount}
                    readOnly 
                    className="bg-muted font-bold text-green-600"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-xs font-bold text-green-600">₹</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground text-center font-bold uppercase tracking-widest">
                Rate: 1,000 OR = ₹1.00 INR
            </p>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full font-bold" 
              onClick={handleConvert} 
              disabled={isConverting || !orAmount || parseFloat(orAmount) < 100}
            >
              {isConverting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {isConverting ? 'Converting...' : 'Convert Now'}
            </Button>
          </CardFooter>
        </Card>
      )}

      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Payout Method & Privacy</DialogTitle>
            <DialogDescription>
              Choose how you want to receive your money.
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={payoutType} onValueChange={(v: any) => setPayoutType(v)} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-12">
              <TabsTrigger value="upi" className="gap-2"><Smartphone className="h-4 w-4" />UPI</TabsTrigger>
              <TabsTrigger value="giftcard" className="gap-2"><Ticket className="h-4 w-4" />Gift</TabsTrigger>
              <TabsTrigger value="bank" className="gap-2"><CreditCard className="h-4 w-4" />Bank</TabsTrigger>
            </TabsList>

            <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Account Holder Name</Label>
                  <Input 
                    id="bank-name" 
                    value={bankData.name} 
                    onChange={(e) => setBankData({...bankData, name: e.target.value})}
                    placeholder="Full legal name" 
                  />
                </div>

                <TabsContent value="upi" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="bank-vpa">UPI ID (VPA)</Label>
                    <Input 
                      id="bank-vpa" 
                      value={bankData.vpa} 
                      onChange={(e) => setBankData({...bankData, vpa: e.target.value})}
                      placeholder="username@bank" 
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 text-[10px] font-medium leading-relaxed">
                    <span className="font-bold text-yellow-600 uppercase">Privacy Note:</span> Manual UPI transfers reveal the sender's name in your bank statement.
                  </div>
                </TabsContent>

                <TabsContent value="giftcard" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="gc-email">Delivery Email</Label>
                    <Input 
                      id="gc-email" 
                      type="email"
                      value={bankData.giftCardEmail} 
                      onChange={(e) => setBankData({...bankData, giftCardEmail: e.target.value})}
                      placeholder="Email for gift card delivery" 
                    />
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-[10px] font-medium leading-relaxed">
                    <span className="font-bold text-green-600 uppercase">Privacy First:</span> Gift Cards are 100% private. No personal bank details are exchanged between you and the admin. Recommended for privacy!
                  </div>
                </TabsContent>

                <TabsContent value="bank" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="bank-acc">Account Number</Label>
                    <Input 
                      id="bank-acc" 
                      value={bankData.accountNumber} 
                      onChange={(e) => setBankData({...bankData, accountNumber: e.target.value})}
                      placeholder="Enter account number" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-ifsc">IFSC Code</Label>
                    <Input 
                      id="bank-ifsc" 
                      value={bankData.ifsc} 
                      onChange={(e) => setBankData({...bankData, ifsc: e.target.value})}
                      placeholder="HDFC0001234" 
                      className="uppercase font-mono"
                    />
                  </div>
                </TabsContent>
            </div>
          </Tabs>

          <DialogFooter>
            <Button onClick={handleSaveBankDetails} disabled={isSavingBank} className="w-full h-12 text-md font-bold">
              {isSavingBank ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Payout Method
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
