'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirestore, useCollection } from '@/firebase';
import type { Transaction, WithdrawalRequest, DepositRequest } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { History, Landmark, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HistoryPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const transactionsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'transactions'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);

  const payoutsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'payout_requests'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);

  const depositsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'deposit_requests'),
      where('userId', '==', user.uid)
    );
  }, [firestore, user]);

  const { data: rawTransactions, loading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);
  const { data: rawPayouts, loading: payoutsLoading } = useCollection<WithdrawalRequest>(payoutsQuery);
  const { data: rawDeposits, loading: depositsLoading } = useCollection<DepositRequest>(depositsQuery);

  const getTimestamp = (date: any) => {
    if (!date) return 0;
    if (date.toDate) return date.toDate().getTime();
    if (date.seconds) return date.seconds * 1000;
    if (typeof date === 'string' || date instanceof Date) return new Date(date).getTime();
    return 0;
  };

  const transactions = useMemo(() => {
    if (!rawTransactions) return [];
    return [...rawTransactions].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
  }, [rawTransactions]);

  const payouts = useMemo(() => {
    if (!rawPayouts) return [];
    return [...rawPayouts].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
  }, [rawPayouts]);

  const deposits = useMemo(() => {
    if (!rawDeposits) return [];
    return [...rawDeposits].sort((a, b) => getTimestamp(b.createdAt) - getTimestamp(a.createdAt));
  }, [rawDeposits]);

  const isLoading = userLoading || transactionsLoading || payoutsLoading || depositsLoading;

  const formatTxDate = (txDate: any) => {
    if (!txDate) return 'Syncing...';
    try {
      const date = txDate?.toDate ? txDate.toDate() : new Date(txDate);
      return format(date, 'MMM d, HH:mm');
    } catch (e) {
      return 'Recent';
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'completed':
      case 'success':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/10 gap-1"><CheckCircle2 className="h-3 w-3" /> SUCCESS</Badge>;
      case 'rejected':
      case 'failed':
        return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10 gap-1"><XCircle className="h-3 w-3" /> FAILED</Badge>;
      default:
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 hover:bg-yellow-500/10 gap-1"><Clock className="h-3 w-3" /> PENDING</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black uppercase tracking-tight">Activity Center</h1>
        <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider text-[10px]">Track your earnings and status</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-muted/50 h-12 p-1 rounded-xl">
          <TabsTrigger value="all" className="rounded-lg font-black uppercase text-[9px] data-[state=active]:bg-background">
            <History className="h-3 w-3 mr-1" /> Activity
          </TabsTrigger>
          <TabsTrigger value="payouts" className="rounded-lg font-black uppercase text-[9px] data-[state=active]:bg-background">
            <Landmark className="h-3 w-3 mr-1" /> Withdraw
          </TabsTrigger>
          <TabsTrigger value="deposits" className="rounded-lg font-black uppercase text-[9px] data-[state=active]:bg-background">
            <Wallet className="h-3 w-3 mr-1" /> Deposit
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card className="border-primary/10 overflow-hidden shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : transactions.length > 0 ? (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="text-[10px] font-black uppercase py-4">Transaction</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase py-4">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx, idx) => (
                      <TableRow key={tx.id || idx} className="hover:bg-muted/10 transition-colors border-b last:border-0">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                              tx.type === 'withdrawal' 
                                ? "bg-destructive/10 text-destructive" 
                                : "bg-green-500/10 text-green-500"
                            )}>
                              {tx.type === 'withdrawal' 
                                ? <ArrowUpRight className="h-4 w-4" /> 
                                : <ArrowDownLeft className="h-4 w-4" />}
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-black uppercase tracking-tight">{tx.type}</span>
                              <span className="text-[10px] font-bold text-muted-foreground line-clamp-1">
                                {formatTxDate(tx.createdAt)} • {tx.description}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className={cn(
                            "font-black text-sm tabular-nums",
                            tx.type === 'withdrawal' ? "text-destructive" : "text-green-500"
                          )}>
                            {tx.type === 'withdrawal' ? '-' : '+'}
                            ₹{tx.amount.toFixed(3)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-20 bg-muted/5 flex flex-col items-center gap-3">
                  <p className="text-xs font-black uppercase tracking-tighter">No Activity Yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <Card className="border-primary/10 overflow-hidden shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : payouts.length > 0 ? (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="text-[10px] font-black uppercase py-4">Request Info</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase py-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map((payout, idx) => (
                      <TableRow key={payout.id || idx} className="hover:bg-muted/10 transition-colors border-b last:border-0">
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-black text-primary">₹{payout.amount.toFixed(2)}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {formatTxDate(payout.createdAt)} • {payout.payoutDetails.payoutType}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex justify-end">
                            {getStatusBadge(payout.status)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-20 bg-muted/5 flex flex-col items-center gap-3">
                  <p className="text-xs font-black uppercase tracking-tighter">No Withdrawals</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deposits" className="mt-4">
          <Card className="border-primary/10 overflow-hidden shadow-sm">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : deposits.length > 0 ? (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow className="hover:bg-transparent border-b">
                      <TableHead className="text-[10px] font-black uppercase py-4">Deposit Info</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase py-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deposits.map((deposit, idx) => (
                      <TableRow key={deposit.id || idx} className="hover:bg-muted/10 transition-colors border-b last:border-0">
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-black text-green-600">₹{deposit.amount.toFixed(2)}</span>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              {formatTxDate(deposit.createdAt)} • UTR: {deposit.utr}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex justify-end">
                            {getStatusBadge(deposit.status)}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-20 bg-muted/5 flex flex-col items-center gap-3">
                  <p className="text-xs font-black uppercase tracking-tighter">No Deposits</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
