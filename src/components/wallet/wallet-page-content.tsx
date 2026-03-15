
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, RefreshCw, ArrowRightLeft, Building2, Send, Landmark, Sparkles, ReceiptText, ShieldCheck, Clock, Construction } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

const CONVERSION_RATE = 1000; // 1000 OR = 1 INR
const MIN_WITHDRAWAL = 1;

export default function WalletPageContent() {
  const [activeTab, setActiveTab] = useState<'withdraw' | 'convert' | 'deposit'>('withdraw');
  const { user, userProfile } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();

  const [orAmount, setOrAmount] = useState('');
  const [convertInrAmount, setConvertInrAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isConverting, setIsConverting] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isBankDialogOpen, setIsBankDialogOpen] = useState(false);
  const [isSavingBank, setIsSavingBank] = useState(false);
  const [payoutType, setPayoutType] = useState<'bank' | 'upi'>('upi');
  const [bankData, setBankData] = useState({ name: '', contact: '', email: '', accountNumber: '', ifsc: '', vpa: '' });

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
      toast({ variant: 'destructive', title: 'Invalid Amount' });
      return;
    }

    if (amount > (userProfile.wallet?.inrBalance || 0)) {
      toast({ variant: 'destructive', title: 'Insufficient Balance' });
      return;
    }

    setIsWithdrawing(true);
    const userDocRef = doc(firestore, 'users', user.uid);
    const requestsRef = collection(firestore, 'payout_requests');
    const transactionsRef = collection(firestore, 'transactions');
    
    // Clean data for payoutDetails to match schema
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
          'wallet.inrBalance': increment(-amount),
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

  const handleConvert = async () => {
    if (!user || !userProfile || !firestore) return;
    const orToConvert = parseFloat(orAmount);
    if (isNaN(orToConvert) || orToConvert < 100) return;
    
    setIsConverting(true);
    const inrToAdd = orToConvert / CONVERSION_RATE;
    const userDocRef = doc(firestore, 'users', user.uid);
    const transactionsRef = collection(firestore, 'transactions');
    
    const updateData = {
        'wallet.orBalance': increment(-orToConvert),
        'wallet.inrBalance': increment(inrToAdd),
        'updatedAt': serverTimestamp()
    };

    updateDoc(userDocRef, updateData)
      .then(() => {
        const txData = {
            userId: user.uid,
            amount: orToConvert,
            currency: 'OR',
            type: 'conversion',
            description: `Converted to ₹${inrToAdd.toFixed(2)} INR`,
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
          
        toast({ title: 'Success', description: `Converted to ₹${inrToAdd.toFixed(2)}` });
        setOrAmount('');
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
    .finally(() => setIsConverting(false));
  };

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-3 gap-2">
        <Card className={cn('flex flex-col items-center justify-center p-3 cursor-pointer transition-all border-primary/10', activeTab === 'withdraw' && 'ring-2 ring-primary bg-primary/5 border-primary')} onClick={() => setActiveTab('withdraw')}>
          <DollarSign className={cn("h-5 w-5 mb-1", activeTab === 'withdraw' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[10px] font-bold uppercase">Withdraw</p>
        </Card>
        <Card className={cn('flex flex-col items-center justify-center p-3 cursor-pointer transition-all border-primary/10', activeTab === 'convert' && 'ring-2 ring-primary bg-primary/5 border-primary')} onClick={() => setActiveTab('convert')}>
          <RefreshCw className={cn("h-5 w-5 mb-1", activeTab === 'convert' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[10px] font-bold uppercase">Convert</p>
        </Card>
        <Card className={cn('flex flex-col items-center justify-center p-3 cursor-pointer transition-all border-primary/10', activeTab === 'deposit' && 'ring-2 ring-primary bg-primary/5 border-primary')} onClick={() => setActiveTab('deposit')}>
          <Landmark className={cn("h-5 w-5 mb-1", activeTab === 'deposit' ? "text-primary" : "text-muted-foreground")} />
          <p className="text-[10px] font-bold uppercase">Deposit</p>
        </Card>
      </div>

      {activeTab === 'withdraw' && (
         <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <CardTitle className="text-sm font-black">Balance: ₹{userProfile?.wallet?.inrBalance?.toFixed(2) || '0.00'}</CardTitle>
             <Button variant="ghost" size="sm" className="h-8 gap-1 text-[10px] uppercase font-black text-primary" onClick={() => setIsBankDialogOpen(true)}>
               <Building2 className="h-3 w-3" /> Payout Info
             </Button>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Amount (INR)</Label>
                <div className="relative">
                  <Input type="number" placeholder="Min ₹1" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)} className="h-12 font-black text-lg" />
                  <div className="absolute inset-y-0 right-3 flex items-center font-bold">₹</div>
                </div>
             </div>
             <Button className="w-full h-12 font-black uppercase" onClick={handleWithdraw} disabled={isWithdrawing}>
               {isWithdrawing ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Withdraw Now
             </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'convert' && (
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase">Conversion Station</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center bg-muted/50 p-3 rounded-lg border border-primary/10">
              <div className="text-center flex-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">OR Balance</p>
                <p className="text-md font-black text-primary">{userProfile?.wallet?.orBalance?.toLocaleString() || '0'}</p>
              </div>
              <Separator orientation="vertical" className="h-6" />
              <div className="text-center flex-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">INR Balance</p>
                <p className="text-md font-black text-primary">₹{userProfile?.wallet?.inrBalance?.toFixed(2) || '0.00'}</p>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">OR Amount</Label>
                <Input type="number" placeholder="Min 100 OR" value={orAmount} onChange={(e) => setOrAmount(e.target.value)} className="h-11 font-bold" />
              </div>
              <div className="flex justify-center text-muted-foreground"><ArrowRightLeft className="h-4 w-4" /></div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Receiving (INR)</Label>
                <Input type="number" value={convertInrAmount} readOnly className="h-11 bg-muted font-black text-primary" />
              </div>
            </div>
            <Button className="w-full h-12 font-black uppercase" onClick={handleConvert} disabled={isConverting || !orAmount}>
              {isConverting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Convert Now
            </Button>
          </CardContent>
        </Card>
      )}

      {activeTab === 'deposit' && (
        <Card className="border-primary/10 overflow-hidden min-h-[300px] flex flex-col items-center justify-center">
          <CardContent className="p-12 text-center space-y-6 flex flex-col items-center">
            <div className="rounded-full bg-primary/10 p-6 animate-pulse border border-primary/20">
              <Construction className="h-12 w-12 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black uppercase tracking-tighter">Shortly Available</h3>
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest max-w-[250px] mx-auto">
                We are currently integrating automatic payment gateways.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary bg-primary/5 px-4 py-2 rounded-full border border-primary/10">
              <Clock className="h-3 w-3" /> System Update in Progress
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
