
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Download, RefreshCw, ArrowRightLeft, Building2, Save, Send, ShieldCheck } from 'lucide-react';
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
import { FaWhatsapp } from 'react-icons/fa';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

const CONVERSION_RATE = 1000; // 1000 OR = 1 INR
const MIN_WITHDRAWAL = 1;
const MAX_WITHDRAWAL = 1000;

export default function WalletPageContent() {
  const [activeTab, setActiveTab] = useState<'earning' | 'deposit' | 'convert'>('earning');
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
  const [bankData, setBankData] = useState({
    name: '',
    contact: '',
    email: '',
    accountNumber: '',
    ifsc: '',
    vpa: '',
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
      });
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
      bankDetails: bankData,
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

  const handleWithdraw = async () => {
    if (!user || !userProfile || !firestore) return;

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: 'destructive', title: 'Invalid Amount', description: 'Please enter a valid withdrawal amount.' });
      return;
    }

    if (amount < MIN_WITHDRAWAL) {
      toast({ variant: 'destructive', title: 'Withdrawal Limit', description: `Minimum withdrawal is ₹${MIN_WITHDRAWAL}.` });
      return;
    }

    if (amount > MAX_WITHDRAWAL) {
      toast({ variant: 'destructive', title: 'Withdrawal Limit', description: `Maximum withdrawal is ₹${MAX_WITHDRAWAL}.` });
      return;
    }

    if (amount > (userProfile.wallet?.inrBalance || 0)) {
      toast({ variant: 'destructive', title: 'Insufficient Balance', description: 'You do not have enough INR balance.' });
      return;
    }

    const { name, accountNumber, ifsc, vpa } = bankData;
    const hasBank = name && accountNumber && ifsc;
    const hasUpi = name && vpa;

    if (!hasBank && !hasUpi) {
      toast({ 
        variant: 'destructive', 
        title: 'Payout Details Missing', 
        description: 'Please set your destination Bank or UPI details first.' 
      });
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
      payoutDetails: bankData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    addDoc(requestsRef, requestData)
      .then(() => {
        updateDoc(userDocRef, updateData)
          .then(() => {
            toast({
              title: 'Withdrawal Requested',
              description: `₹${amount.toFixed(2)} request submitted. You will receive it soon.`,
            });
            setWithdrawAmount('');
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
          });
      })
      .catch(async (error: any) => {
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit request.' });
      })
      .finally(() => {
        setIsWithdrawing(false);
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
            }
        });
  };

  const handleSupportClick = () => {
      window.open('https://wa.me/your_number_here', '_blank');
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
          <p className="text-xs font-semibold">Withdraw</p>
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
             <CardTitle className="text-sm font-medium">Available for Payout</CardTitle>
             <Button 
               variant="ghost" 
               size="sm" 
               className="h-8 gap-1 text-[10px] uppercase font-bold text-primary hover:text-primary/80 hover:bg-primary/10" 
               onClick={() => setIsBankDialogOpen(true)}
             >
               <Building2 className="h-3 w-3" />
               Payout Settings
             </Button>
          </CardHeader>
          <CardContent className="space-y-6">
             {loading ? (
                <Skeleton className="h-8 w-24" />
             ) : (
                <div className="text-3xl font-bold text-primary">₹{userProfile?.wallet?.inrBalance?.toFixed(2) || '0.00'}</div>
             )}
             
             <div className="space-y-2">
                <Label htmlFor="withdrawAmount">Withdraw Amount (INR)</Label>
                <div className="relative">
                  <Input 
                    id="withdrawAmount" 
                    type="number" 
                    placeholder="Enter amount" 
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    disabled={isWithdrawing}
                    className="font-bold text-lg"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <span className="text-sm font-bold text-muted-foreground">₹</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                    <p className="text-[10px] text-muted-foreground font-medium">Min: ₹{MIN_WITHDRAWAL} | Max: ₹{MAX_WITHDRAWAL}</p>
                    <p className="text-[10px] font-bold text-primary uppercase">Manual Verification</p>
                </div>
             </div>
          </CardContent>
          <CardFooter>
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
          </CardFooter>
        </Card>
      )}

      {activeTab === 'deposit' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Add Funds</CardTitle>
            <CardDescription>To deposit cash into your wallet, please contact our secure support channel. For your safety, we do not list bank details publicly.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Button className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-white font-bold h-12 gap-2" onClick={handleSupportClick}>
              <FaWhatsapp className="h-6 w-6" />
              Deposit via WhatsApp
            </Button>
            <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest">
                <ShieldCheck className="h-3 w-3" />
                Secure Deposit Protocol Active
            </div>
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

      <Dialog open={isBankDialogOpen} onOpenChange={setIsBankDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Destination Payout Details</DialogTitle>
            <DialogDescription>
              Enter **your** UPI ID or Bank details where you want to receive your earnings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="bank-name">Your Full Name</Label>
              <Input 
                id="bank-name" 
                value={bankData.name} 
                onChange={(e) => setBankData({...bankData, name: e.target.value})}
                placeholder="Name as on Bank/UPI" 
              />
            </div>
            
            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-muted-foreground">
                    <span className="bg-background px-2">Option 1: UPI ID</span>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-vpa">Your UPI ID (VPA)</Label>
              <Input 
                id="bank-vpa" 
                value={bankData.vpa} 
                onChange={(e) => setBankData({...bankData, vpa: e.target.value})}
                placeholder="username@bank" 
                className="font-mono text-sm"
              />
            </div>

            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold text-muted-foreground">
                    <span className="bg-background px-2">Option 2: Bank Account</span>
                </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bank-acc">Your Account Number</Label>
              <Input 
                id="bank-acc" 
                value={bankData.accountNumber} 
                onChange={(e) => setBankData({...bankData, accountNumber: e.target.value})}
                placeholder="Bank account number" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bank-ifsc">Your IFSC Code</Label>
              <Input 
                id="bank-ifsc" 
                value={bankData.ifsc} 
                onChange={(e) => setBankData({...bankData, ifsc: e.target.value})}
                placeholder="Bank IFSC code" 
                className="uppercase font-mono"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveBankDetails} disabled={isSavingBank} className="w-full">
              {isSavingBank ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save My Payout Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
