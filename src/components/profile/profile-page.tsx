'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useUser } from '@/firebase';

export default function ProfilePage() {
  const { user, userProfile, loading } = useUser();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!user || !userProfile) {
    return <div>Please log in to view your profile.</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={userProfile.profile?.photoURL ?? ''} alt={userProfile.profile?.displayName ?? ''} />
            <AvatarFallback>{userProfile.profile?.displayName?.charAt(0) || userProfile.email?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-1">
            <h2 className="text-2xl font-bold">{userProfile.profile?.displayName}</h2>
            <p className="text-muted-foreground">{userProfile.email}</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input id="displayName" value={userProfile.profile?.displayName ?? ''} readOnly />
            </div>
             <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" value={userProfile.email ?? ''} readOnly />
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
