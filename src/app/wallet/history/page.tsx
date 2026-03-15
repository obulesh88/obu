
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useFirestore, useCollection } from '@/firebase';
import { Transaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';

export default function HistoryPage() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const transactionsQuery = useMemo(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user]);

  const { data: transactions, loading: transactionsLoading } = useCollection<Transaction>(transactionsQuery);

  const isLoading = userLoading || transactionsLoading;

  const getAmountColor = (tx: Transaction) => {
    if (tx.type === 'withdrawal' || (tx.type === 'conversion' && tx.currency === 'OR')) {
      return 'text-destructive';
    }
    return 'text-green-500';
  };

  const formatTxDate = (tx: Transaction) => {
    if (!tx.createdAt) return 'Pending...';
    try {
      // Handles both Firestore Timestamp and Date objects
      const date = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date(tx.createdAt);
      return format(date, 'PP p');
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black uppercase tracking-tight">Activity Log</h1>
        <p className="text-sm text-muted-foreground">Every coin and rupee tracked in real-time.</p>
      </div>

      <Card className="border-primary/10">
        <CardHeader>
          <CardTitle className="text-sm font-black uppercase">Transaction History</CardTitle>
          <CardDescription className="text-[10px] font-bold uppercase">All wallet movements since joining</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          ) : transactions && transactions.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Type</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Amount</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <Badge variant="secondary" className="w-fit text-[9px] font-black uppercase px-1.5 py-0">
                            {tx.type}
                          </Badge>
                          <span className="text-[10px] font-bold text-muted-foreground truncate max-w-[120px]">
                            {tx.description}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`font-black text-sm tabular-nums ${getAmountColor(tx)}`}>
                          {tx.type === 'withdrawal' || (tx.type === 'conversion' && tx.currency === 'OR') ? '-' : '+'}
                          {tx.amount.toLocaleString()} {tx.currency}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                          {formatTxDate(tx)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed flex flex-col items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                 <CardTitle className="opacity-20">?</CardTitle>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black uppercase tracking-tighter">No History Yet</p>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">Complete a task to see logs here.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
