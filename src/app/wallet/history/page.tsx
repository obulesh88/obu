'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUser, useCollection } from '@/firebase';
import { EarningTransaction } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';

export default function HistoryPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  
  const transactionsPath = user ? `users/${user.uid}/transactions` : null;
  const { data: transactions, loading: transactionsLoading } = useCollection<EarningTransaction>(transactionsPath);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/login');
    }
  }, [user, userLoading, router]);

  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions].sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [transactions]);

  const isLoading = userLoading || transactionsLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Earning History</CardTitle>
        <CardDescription>A record of all your OR coin earnings.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
            </div>
        ) : sortedTransactions.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-medium">
                    {tx.description}
                    {tx.type === 'game' && tx.playTimeInSeconds && (
                      <span className="text-muted-foreground text-xs ml-2">({tx.playTimeInSeconds}s)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tx.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-green-500 font-semibold">+ {tx.amount.toFixed(2)} OR</TableCell>
                  <TableCell className="text-right">{format(tx.createdAt.toDate(), 'PP p')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center text-muted-foreground p-8">
            You haven't earned any coins yet. Start an activity to see your history here.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
