
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Building2, Send, Landmark, Clock, RefreshCw, Copy, CheckCircle2, Mail, AlertCircle, TrendingUp } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection } from '@/firebase';
import { doc, updateDoc, increment, serverTimestamp, collection, addDoc, query, where, orderBy } from 'firebase/firestore';
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
import { Progress } from '@/components/ui/progress';

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

  // Fetch deposits to check unlock status
  const depositsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'deposit_requests'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: deposits, loading: depositsLoading } = useCollection<any>(depositsQuery);

  const hasSuccessfulDeposit = useMemo(() => {
    if (!deposits) return false;
    return deposits.some(d => 
      d.status?.toLowerCase() === 'success' || 
      d.status?.toLowerCase() === 'completed'
    );
  }, [deposits]);

  const wageringRequired = userProfile?.wallet?.wageringRequired || 0;
  const isWithdrawLocked = !hasSuccessfulDeposit;

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
    
    if (wageringRequired > 0.01) {
      toast({
        variant: 'destructive',
        title: 'Wagering Required',
        description: `Complete ₹${wageringRequired.toFixed(2)} turnover to withdraw.`
      });
      return;
    }

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
        
        addDoc(transactionsRef, txData);

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
    .finally(() => setIsWithdrawing(false));
  };

  if (loading || depositsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
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
         <Card className="border-primary/10 overflow-hidden">
          {isWithdrawLocked ? (
            <CardContent className="p-10 flex flex-col items-center justify-center text-center gap-6">
               <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center border-4 border-amber-500/5">
                  <AlertCircle className="h-10 w-10 text-amber-500" />
               </div>
               <div className="space-y-2">
                 <h3 className="text-lg font-black uppercase tracking-tight">Recharge Required</h3>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed max-w-[240px]">
                   To unlock withdrawals, you must complete at least one manual recharge of ₹{MIN_DEPOSIT} or more.
                 </p>
               </div>
               <Button onClick={() => setActiveTab('deposit')} className="w-full font-black uppercase h-12 shadow-lg">
                  Recharge Now
               </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 bg-muted/30">
                 <div className="flex flex-col">
                   <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Available Balance</p>
                   <CardTitle className="text-2xl font-black text-primary">₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</CardTitle>
                 </div>
                 <Button variant="outline" size="sm" className="h-9 gap-2 text-[10px] uppercase font-black border-primary/20 hover:bg-primary/5" onClick={() => setIsBankDialogOpen(true)}>
                   <Building2 className="h-4 w-4" /> Payout Info
                 </Button>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                 {wageringRequired > 0.01 && (
                   <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 space-y-4">
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <TrendingUp className="h-4 w-4 text-primary" />
                           <p className="text-[11px] font-black uppercase tracking-tight">Wagering Progress</p>
                        </div>
                        <span className="text-[11px] font-black text-primary">₹{wageringRequired.toFixed(2)} Left</span>
                     </div>
                     <Progress value={0} className="h-2 bg-primary/10" />
                     <p className="text-[9px] font-bold text-muted-foreground uppercase leading-tight">
                       Complete the turnover to clear your balance for withdrawal. Play WinGo, K3 or Dragon Tiger to reduce wages.
                     </p>
                   </div>
                 )}

                 <div className="space-y-3">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount to Withdraw</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder={`Min ₹${MIN_WITHDRAWAL}`} 
                        value={withdrawAmount} 
                        onChange={(e) => setWithdrawAmount(e.target.value)} 
                        className="h-14 font-black text-2xl pl-10 bg-muted/20 border-primary/10 focus:ring-primary" 
                      />
                      <div className="absolute inset-y-0 left-4 flex items-center font-black text-primary text-xl">₹</div>
                    </div>
                 </div>

                 <Button 
                   className="w-full h-14 font-black uppercase text-lg shadow-xl" 
                   onClick={handleWithdraw} 
                   disabled={isWithdrawing || wageringRequired > 0.01}
                 >
                   {isWithdrawing ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />} 
                   {wageringRequired > 0.01 ? 'Complete Wages First' : 'Request Payout'}
                 </Button>

                 <div className="flex items-center gap-2 justify-center py-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Withdrawal Status: Unlocked</span>
                 </div>
              </CardContent>
            </>
          )}
        </Card>
      )}

      {activeTab === 'deposit' && (
        <Card className="border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-sm font-black uppercase tracking-tight">Recharge Wallet</CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">Add funds to unlock withdrawal</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="flex flex-col items-center gap-4 p-6 bg-primary/5 rounded-3xl border border-primary/10">
              <div className="w-full space-y-3">
                <p className="text-[10px] font-black uppercase text-center text-muted-foreground tracking-widest">Official UPI Address</p>
                <div className="flex items-center gap-3 bg-background border-2 border-primary/20 rounded-2xl p-4 justify-between shadow-inner">
                  <span className="font-mono font-black text-base tracking-tight text-primary">{DEPOSIT_UPI_ID}</span>
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-primary hover:bg-primary/10" onClick={handleCopyUpi}>
                    <Copy className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Verification Email</Label>
                <div className="relative">
                  <Input 
                    type="email" 
                    placeholder="example@email.com" 
                    value={depositEmail} 
                    onChange={(e) => setDepositEmail(e.target.value)} 
                    className="h-12 font-bold bg-muted/20" 
                  />
                  <div className="absolute inset-y-0 right-4 flex items-center text-primary/40">
                    <Mail className="h-4 w-4" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recharge Amount (₹)</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    placeholder={`₹${MIN_DEPOSIT} - ₹${MAX_DEPOSIT}`} 
                    value={depositAmount} 
                    onChange={(e) => setDepositAmount(e.target.value)} 
                    className="h-14 font-black text-2xl pl-10 bg-muted/20" 
                  />
                  <div className="absolute inset-y-0 left-4 flex items-center font-black text-primary text-xl">₹</div>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">UTR / Transaction ID</Label>
                <Input 
                  placeholder="Enter 12-digit Reference" 
                  value={utrNumber} 
                  onChange={(e) => setUtrNumber(e.target.value)} 
                  className="h-12 font-mono font-black tracking-[0.2em] uppercase text-center" 
                />
              </div>
              <Button className="w-full h-14 font-black uppercase text-lg shadow-xl" onClick={handleDeposit} disabled={isDepositing}>
                {isDepositing ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                Confirm Recharge
              </Button>
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-3">
                 <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                 <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed">
                   Verification takes 10-30 minutes. Once SUCCESS, your withdrawal functions will unlock automatically.
                 </p>
              </div>
            </div>

            {/* RECHARGE PROGRESS LIST */}
            {deposits && deposits.length > 0 && (
              <div className="pt-4 space-y-4">
                <div className="flex items-center gap-3">
                   <Clock className="h-4 w-4 text-muted-foreground" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recharge History</span>
                </div>
                <div className="space-y-2">
                   {deposits.slice(0, 5).map((d: any, i: number) => (
                     <div key={i} className="flex items-center justify-between p-4 rounded-xl border bg-muted/10">
                        <div className="flex flex-col gap-0.5">
                           <span className="text-xs font-black">₹{d.amount.toFixed(2)}</span>
                           <span className="text-[9px] font-bold text-muted-foreground uppercase">UTR: {d.utr}</span>
                        </div>
                        <span className={cn(
                          "text-[9px] font-black uppercase px-3 py-1 rounded-full border",
                          d.status === 'success' || d.status === 'completed' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                        )}>
                          {d.status?.toUpperCase()}
                        </span>
                     </div>
                   ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle className="uppercase font-black text-xl">Payout Info</DialogTitle></DialogHeader>
            <Tabs value={payoutType} onValueChange={(v: any) => setPayoutType(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="upi" className="text-[10px] uppercase font-black">UPI ID</TabsTrigger>
                <TabsTrigger value="bank" className="text-[10px] uppercase font-black">Bank A/C</TabsTrigger>
              </TabsList>
              <div className="py-6 space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">A/C Holder Name</Label>
                    <Input value={bankData.name} onChange={(e) => setBankData({...bankData, name: e.target.value})} placeholder="Full Name" className="h-12 font-bold" />
                  </div>
                  {payoutType === 'upi' && (
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">UPI ID Address</Label>
                      <Input value={bankData.vpa} onChange={(e) => setBankData({...bankData, vpa: e.target.value})} placeholder="example@upi" className="h-12 font-bold" />
                    </div>
                  )}
                  {payoutType === 'bank' && (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Account Number</Label>
                        <Input value={bankData.accountNumber} onChange={(e) => setBankData({...bankData, accountNumber: e.target.value})} placeholder="Number" className="h-12 font-bold" />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">IFSC Code</Label>
                        <Input value={bankData.ifsc} onChange={(e) => setBankData({...bankData, ifsc: e.target.value})} placeholder="IFSC" className="h-12 font-bold uppercase" />
                      </div>
                    </>
                  )}
              </div>
            </Tabs>
            <DialogFooter><Button onClick={handleSaveBankDetails} className="w-full h-12 font-black uppercase text-lg shadow-xl" disabled={isSavingBank}>Save Payout Details</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
