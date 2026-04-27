
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
import { doc, updateDoc, increment, serverTimestamp, collection, addDoc, query, where } from 'firebase/firestore';
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
    return deposits.some(d => {
      const s = d.status?.toLowerCase();
      return s === 'success' || s === 'completed';
    });
  }, [deposits]);

  const wageringRequired = userProfile?.wallet?.wageringRequired || 0;
  
  // Logic: Unlock if user has a success deposit OR if they have active wages (meaning recharge was successful)
  const isWithdrawLocked = !hasSuccessfulDeposit && !(wageringRequired > 0.01);

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
    if (isNaN(amount) || amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: `Deposit between ₹${MIN_DEPOSIT}-₹${MAX_DEPOSIT}` });
      return;
    }

    if (!utrNumber || utrNumber.length < 12) {
      toast({ variant: 'destructive', title: 'Invalid UTR' });
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
        toast({ title: 'Recharge Submitted', description: 'Verified in 10-30 mins.' });
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
      toast({ variant: 'destructive', title: 'Wagering Required', description: `Complete ₹${wageringRequired.toFixed(2)} turnover.` });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount < MIN_WITHDRAWAL) {
      toast({ variant: 'destructive', title: 'Min Withdrawal ₹' + MIN_WITHDRAWAL });
      return;
    }

    if (amount > (userProfile.wallet?.balance || 0)) {
      toast({ variant: 'destructive', title: 'Insufficient Balance' });
      return;
    }

    setIsWithdrawing(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const requestsRef = collection(firestore, 'payout_requests');
    
    const requestData = {
      userId: user.uid,
      amount: amount,
      status: 'pending',
      payoutDetails: { payoutType, ...bankData },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDoc(requestsRef, requestData).then(() => {
        addDoc(collection(firestore, 'transactions'), {
            userId: user.uid,
            amount: amount,
            currency: 'INR',
            type: 'withdrawal',
            description: `Withdrawal Request`,
            createdAt: serverTimestamp()
        });
        updateDoc(userDocRef, { 'wallet.balance': increment(-amount), updatedAt: serverTimestamp() });
        toast({ title: 'Success', description: 'Payout request sent.' });
        setWithdrawAmount('');
    }).finally(() => setIsWithdrawing(false));
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
        <Card className={cn('flex flex-col items-center justify-center p-3 cursor-pointer transition-all', activeTab === 'withdraw' ? 'ring-2 ring-primary bg-primary/5' : 'bg-muted/10')} onClick={() => setActiveTab('withdraw')}>
          <DollarSign className={cn("h-5 w-5 mb-1", activeTab === 'withdraw' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[10px] font-black uppercase">Withdraw</p>
        </Card>
        <Card className={cn('flex flex-col items-center justify-center p-3 cursor-pointer transition-all', activeTab === 'deposit' ? 'ring-2 ring-primary bg-primary/5' : 'bg-muted/10')} onClick={() => setActiveTab('deposit')}>
          <Landmark className={cn("h-5 w-5 mb-1", activeTab === 'deposit' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[10px] font-black uppercase">Recharge</p>
        </Card>
      </div>

      {activeTab === 'withdraw' && (
         <Card className="border-primary/10">
          {isWithdrawLocked ? (
            <CardContent className="p-10 flex flex-col items-center text-center gap-6">
               <AlertCircle className="h-12 w-12 text-amber-500" />
               <h3 className="text-lg font-black uppercase">Withdrawal Locked</h3>
               <p className="text-[10px] font-bold text-muted-foreground uppercase">Recharge once to unlock functions.</p>
               <Button onClick={() => setActiveTab('deposit')} className="w-full font-black uppercase">Recharge Now</Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-row items-center justify-between pb-4 bg-muted/10">
                 <div>
                   <p className="text-[10px] font-black uppercase text-muted-foreground">Available Balance</p>
                   <CardTitle className="text-2xl font-black text-primary">₹{userProfile?.wallet?.balance?.toFixed(2) || '0.00'}</CardTitle>
                 </div>
                 <Button variant="outline" size="sm" className="text-[9px] font-black uppercase" onClick={() => setIsBankDialogOpen(true)}>Payout Info</Button>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                 {wageringRequired > 0.01 && (
                   <div className="bg-primary/5 border rounded-xl p-4 space-y-2">
                     <p className="text-[10px] font-black uppercase">Turnover: ₹{wageringRequired.toFixed(2)} Left</p>
                     <Progress value={0} className="h-1" />
                   </div>
                 )}
                 <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase">Withdrawal Amount</Label>
                    <Input type="number" placeholder="Min ₹100" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-14 font-black text-2xl" />
                 </div>
                 <Button className="w-full h-14 font-black uppercase" onClick={handleWithdraw} disabled={isWithdrawing}>
                   {isWithdrawing ? <RefreshCw className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />} Request Payout
                 </Button>
              </CardContent>
            </>
          )}
        </Card>
      )}

      {activeTab === 'deposit' && (
        <Card className="border-primary/10">
          <CardHeader className="bg-muted/10">
            <CardTitle className="text-sm font-black uppercase">Recharge Now</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="bg-primary/5 rounded-2xl p-4 flex flex-col items-center gap-3">
              <span className="text-[10px] font-black uppercase opacity-50">Official UPI</span>
              <div className="flex items-center gap-2 bg-background p-3 rounded-lg border w-full justify-between">
                <span className="font-mono font-black text-primary">{DEPOSIT_UPI_ID}</span>
                <Button variant="ghost" size="icon" onClick={handleCopyUpi}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">Amount</Label>
                <Input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="h-12 font-black" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase">UTR Number</Label>
                <Input value={utrNumber} onChange={(e) => setUtrNumber(e.target.value)} className="h-12 font-mono font-black" />
              </div>
              <Button className="w-full h-12 font-black uppercase" onClick={handleDeposit} disabled={isDepositing}>Confirm Recharge</Button>
            </div>
            {deposits && deposits.length > 0 && (
              <div className="pt-4 border-t space-y-2">
                <p className="text-[10px] font-black uppercase opacity-50">Recent History</p>
                {deposits.map((d: any, i: number) => (
                  <div key={i} className="flex justify-between p-3 rounded-lg bg-muted/20 border">
                    <span className="text-xs font-black">₹{d.amount}</span>
                    <span className={cn("text-[10px] font-black uppercase", d.status === 'pending' ? 'text-amber-500' : 'text-green-500')}>{d.status}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent>
            <DialogHeader><DialogTitle className="uppercase font-black">Payout Details</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
                <Input value={bankData.name} onChange={(e) => setBankData({...bankData, name: e.target.value})} placeholder="Account Holder Name" className="font-bold" />
                <Input value={bankData.vpa} onChange={(e) => setBankData({...bankData, vpa: e.target.value})} placeholder="UPI ID" className="font-bold" />
            </div>
            <DialogFooter><Button onClick={handleSaveBankDetails} className="w-full font-black uppercase" disabled={isSavingBank}>Save Details</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
