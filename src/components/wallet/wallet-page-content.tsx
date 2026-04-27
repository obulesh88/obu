
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Building2, Send, Landmark, Clock, RefreshCw, Copy, CheckCircle2, Mail, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams, useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const MIN_WITHDRAWAL = 100;
const MIN_DEPOSIT = 50;
const MAX_DEPOSIT = 500;
const DEPOSIT_UPI_ID = "orwallet@paytm";

export default function WalletPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'withdraw' | 'deposit'>('withdraw');
  const { user, userProfile, loading } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  
  const [depositAmount, setDepositAmount] = useState('');
  const [depositEmail, setDepositEmail] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [payoutType, setPayoutType] = useState<'bank' | 'upi'>('upi');
  const [bankData, setBankData] = useState({ name: '', contact: '', email: '', accountNumber: '', ifsc: '', vpa: '' });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'deposit' || tabParam === 'withdraw') {
      setActiveTab(tabParam as 'withdraw' | 'deposit');
    }
  }, [searchParams]);

  useEffect(() => {
    if (userProfile?.bankDetails) {
      setBankData({
        name: userProfile.bankDetails.name || '',
        contact: userProfile.bankDetails.contact || '',
        email: userProfile.bankDetails.email || '',
        accountNumber: userProfile.bankDetails.accountNumber || '',
        ifsc: userProfile.bankDetails.ifsc || '',
        vpa: userProfile.bankDetails.vpa || '',
      });
      if (userProfile.bankDetails.payoutType === 'bank' || userProfile.bankDetails.payoutType === 'upi') {
        setPayoutType(userProfile.bankDetails.payoutType);
      }
    }
    if (userProfile?.email && !depositEmail) {
      setDepositEmail(userProfile.email);
    }
  }, [userProfile]);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(DEPOSIT_UPI_ID);
    toast({ title: 'Copied!', description: 'UPI ID copied to clipboard.' });
  };

  const handleSaveBankDetails = async () => {
    if (!user || !firestore) return;
    setIsSavingBank(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const updateData = { bankDetails: { ...bankData, payoutType }, updatedAt: serverTimestamp() };
    
    updateDoc(userDocRef, updateData)
      .then(() => {
        toast({ title: 'Details Saved', description: 'Payout details updated.' });
        setIsBankDialogOpen(false);
      })
      .catch(async (error: any) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userDocRef.path,
            operation: 'update',
            requestResourceData: updateData,
          } satisfies SecurityRuleContext));
        }
      })
      .finally(() => setIsSavingBank(false));
  };

  const handleDeposit = async () => {
    if (!user || !firestore) return;

    const amount = parseFloat(depositAmount);
    if (isNaN(amount)) {
      toast({ variant: 'destructive', title: 'Invalid Amount' });
      return;
    }

    if (amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
      toast({ 
        variant: 'destructive', 
        title: 'Invalid Amount', 
        description: `Deposit must be between ₹${MIN_DEPOSIT} and ₹${MAX_DEPOSIT}.` 
      });
      return;
    }

    if (!depositEmail || !depositEmail.includes('@')) {
      toast({ variant: 'destructive', title: 'Invalid Email', description: 'Please provide a valid email ID.' });
      return;
    }

    if (!utrNumber || utrNumber.length < 12) {
      toast({ variant: 'destructive', title: 'Invalid UTR', description: 'Please enter a valid 12-digit UTR/Ref number.' });
      return;
    }

    setIsDepositing(true);
    const requestsRef = collection(firestore, 'deposit_requests');
    const depositData = {
      userId: user.uid,
      email: depositEmail,
      amount: amount,
      utr: utrNumber,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDoc(requestsRef, depositData)
      .then(() => {
        toast({ 
          title: 'Deposit Submitted', 
          description: 'Your request is being verified. Funds will be added shortly.' 
        });
        setDepositAmount('');
        setUtrNumber('');
      })
      .catch(async (error: any) => {
        if (error.code === 'permission-denied') {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: requestsRef.path,
            operation: 'create',
            requestResourceData: depositData,
          } satisfies SecurityRuleContext));
        }
      })
      .finally(() => setIsDepositing(false));
  };

  const handleWithdraw = async () => {
    if (!user || !userProfile || !firestore) return;
    
    if (payoutType === 'upi' && !bankData.vpa) {
      toast({ variant: 'destructive', title: 'Invalid Credentials', description: 'Provide UPI ID in Payout Info.' });
      setIsBankDialogOpen(true);
      return;
    }
    
    if (payoutType === 'bank' && (!bankData.accountNumber || !bankData.ifsc)) {
      toast({ variant: 'destructive', title: 'Invalid Credentials', description: 'Provide Bank details in Payout Info.' });
      setIsBankDialogOpen(true);
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
      toast({ 
        variant: 'destructive', 
        title: 'Invalid Amount', 
        description: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL}.` 
      });
      return;
    }

    if (amount > (userProfile.wallet?.balance || 0)) {
      toast({ variant: 'destructive', title: 'Insufficient Balance' });
      return;
    }

    setIsWithdrawing(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const requestsRef = collection(firestore, 'payout_requests');
    const transactionsRef = collection(firestore, 'transactions');
    
    const payoutDetails = {
      payoutType,
      name: bankData.name,
      vpa: payoutType === 'upi' ? bankData.vpa : '',
      accountNumber: payoutType === 'bank' ? bankData.accountNumber : '',
      ifsc: payoutType === 'bank' ? bankData.ifsc : ''
    };

    const requestData = {
      userId: user.uid,
      amount: amount,
      status: 'pending',
      payoutDetails: payoutDetails,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDoc(requestsRef, requestData)
      .then(() => {
        const txData = {
            userId: user.uid,
            amount: amount,
            currency: 'INR',
            type: 'withdrawal',
            description: `Withdrawal Request (Pending)`,
            createdAt: serverTimestamp()
        };
        
        addDoc(transactionsRef, txData)
          .catch(async (error: any) => {
            if (error.code === 'permission-denied') {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: transactionsRef.path,
                operation: 'create',
                requestResourceData: txData,
              } satisfies SecurityRuleContext));
            }
          });

        const updateData = {
          'wallet.balance': increment(-amount),
          'updatedAt': serverTimestamp()
        };

        updateDoc(userDocRef, updateData)
          .then(() => {
            toast({ title: 'Success', description: `Request for ₹${amount} submitted.` });
            setWithdrawAmount('');
          })
          .catch(async (error: any) => {
            if (error.code === 'permission-denied') {
              errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: updateData,
              } satisfies SecurityRuleContext));
            }
          });
    })
    .catch(async (error: any) => {
      if (error.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: requestsRef.path,
          operation: 'create',
          requestResourceData: requestData,
        } satisfies SecurityRuleContext));
      }
    })
    .finally(() => setIsWithdrawing(false));
  };

  if (loading || !user) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-2">
        <Card className={cn('flex flex-col items-center justify-center p-3 cursor-pointer transition-all border-primary/10', activeTab === 'withdraw' && 'ring-2 ring-primary bg-primary/5 border-primary')} onClick={() => setActiveTab('withdraw')}>
          <DollarSign className={cn("h-5 w-5 mb-1", activeTab === 'withdraw' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[10px] font-bold uppercase">Withdraw</p>
        </Card>
        <Card className={cn('flex flex-col items-center justify-center p-3 cursor-pointer transition-all border-primary/10', activeTab === 'deposit' && 'ring-2 ring-primary bg-primary/5 border-primary')} onClick={() => setActiveTab('deposit')}>
          <Landmark className={cn("h-5 w-5 mb-1", activeTab === 'deposit' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[10px] font-bold uppercase">Recharge</p>
        </Card>
      </div>

      {activeTab === 'withdraw' && (
         <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-black">Main Balance: ₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</CardTitle>
             <Button variant="ghost" size="sm" className="h-8 gap-1 text-[10px] uppercase font-black text-primary" onClick={() => setIsBankDialogOpen(true)}>
               <Building2 className="h-3 w-3" /> Payout Info
             </Button>
          </CardHeader>
          <CardContent className="space-y-4">
             {(userProfile?.wallet?.balance || 0) < MIN_WITHDRAWAL && (
               <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                 <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <p className="text-[10px] font-black uppercase">Balance check required</p>
                 </div>
                 <p className="text-[10px] font-medium text-amber-700 leading-tight">
                   You need at least ₹{MIN_WITHDRAWAL} to initiate a payout. Add funds or complete more tasks to reach the threshold.
                 </p>
                 <Button variant="link" className="h-auto p-0 text-[10px] font-black uppercase text-amber-900 underline" onClick={() => setActiveTab('deposit')}>
                    Recharge Balance Now
                 </Button>
               </div>
             )}

             <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Amount to Withdraw (₹)</Label>
                <div className="relative">
                  <Input type="number" placeholder={`Min ₹${MIN_WITHDRAWAL}`} value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-12 font-black text-lg" />
                  <div className="absolute inset-y-0 right-3 flex items-center font-bold text-primary">₹</div>
                </div>
             </div>
             <Button className="w-full h-12 font-black uppercase text-lg" onClick={handleWithdraw} disabled={isWithdrawing}>
               {isWithdrawing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Request Payout
             </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'deposit' && (
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase">Add Funds</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Recharge your wallet instantly</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4 p-6 bg-muted/50 rounded-2xl border border-primary/10">
              <div className="w-full space-y-2">
                <p className="text-[10px] font-black uppercase text-center text-muted-foreground">UPI Payment ID</p>
                <div className="flex items-center gap-2 bg-background border rounded-lg p-3 justify-between">
                  <span className="font-mono font-bold text-sm tracking-tight">{DEPOSIT_UPI_ID}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={handleCopyUpi}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Notification Email</Label>
                <div className="relative">
                  <Input 
                    type="email" 
                    placeholder="Enter your email" 
                    value={depositEmail} 
                    onChange={(e) => setDepositEmail(e.target.value)} 
                    className="h-12 font-bold" 
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center font-bold text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Recharge Amount (₹)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder={`Min ₹${MIN_DEPOSIT} - Max ₹${MAX_DEPOSIT}`} 
                    value={depositAmount} 
                    onChange={(e) => setDepositAmount(e.target.value)} 
                    className="h-12 font-black text-lg" 
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center font-bold text-primary">₹</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">UTR / Reference Number</Label>
                <Input 
                  placeholder="12-digit transaction ID" 
                  value={utrNumber} 
                  onChange={(e) => setUtrNumber(e.target.value)} 
                  className="h-12 font-mono font-bold tracking-widest uppercase" 
                />
              </div>
              <Button className="w-full h-12 font-black uppercase text-lg" onClick={handleDeposit} disabled={isDepositing}>
                {isDepositing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Submit Recharge
              </Button>
              <p className="text-[9px] font-bold text-center text-muted-foreground uppercase leading-relaxed">
                Verification usually takes 10-30 minutes. <br />
                Do not submit fake UTRs to avoid account ban.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle className="uppercase font-black">Payout Details</DialogTitle></DialogHeader>
            <Tabs value={payoutType} onValueChange={(v: any) => setPayoutType(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upi" className="text-[10px] uppercase font-bold">UPI</TabsTrigger>
                <TabsTrigger value="bank" className="text-[10px] uppercase font-bold">Bank</TabsTrigger>
              </TabsList>
              <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Name</Label>
                    <Input value={bankData.name} onChange={(e) => setBankData({...bankData, name: e.target.value})} placeholder="A/C Holder Name" />
                  </div>
                  {payoutType === 'upi' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">UPI ID</Label>
                      <Input value={bankData.vpa} onChange={(e) => setBankData({...bankData, vpa: e.target.value})} placeholder="example@upi" />
                    </div>
                  )}
                  {payoutType === 'bank' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Account Number</Label>
                        <Input value={bankData.accountNumber} onChange={(e) => setBankData({...bankData, accountNumber: e.target.value})} placeholder="A/C Number" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">IFSC Code</Label>
                        <Input value={bankData.ifsc} onChange={(e) => setBankData({...bankData, ifsc: e.target.value})} placeholder="IFSC" className="uppercase" />
                      </div>
                    </>
                  )}
              </div>
            </Tabs>
            <DialogFooter><Button onClick={handleSaveBankDetails} className="w-full font-black uppercase" disabled={isSavingBank}>Save Details</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
