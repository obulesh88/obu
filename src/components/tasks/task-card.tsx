'use client';

import {
  Briefcase,
  CheckCircle,
  CircleDollarSign,
  Clapperboard,
  Clock,
  FlaskConical,
  Gamepad2,
  Keyboard,
  ShieldCheck,
  Star,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { Task } from '@/lib/types';

interface TaskCardProps {
  task: Task;
  onAction: (task: Task) => void;
}

const taskTypeIcons = {
  Survey: <Briefcase className="h-4 w-4" />,
  Testing: <FlaskConical className="h-4 w-4" />,
  Review: <Star className="h-4 w-4" />,
  'Data Entry': <Keyboard className="h-4 w-4" />,
  Games: <Gamepad2 className="h-4 w-4" />,
  'Watch Ads': <Clapperboard className="h-4 w-4" />,
  Captcha: <ShieldCheck className="h-4 w-4" />,
  Other: <Briefcase className="h-4 w-4" />,
};

const statusConfig = {
    available: { label: 'Available', color: 'bg-green-500' },
    'in-progress': { label: 'In Progress', color: 'bg-blue-500' },
    'pending-verification': { label: 'Pending', icon: <Clock className="h-4 w-4 mr-1" />, variant: 'secondary' },
    completed: { label: 'Completed', icon: <CheckCircle className="h-4 w-4 mr-1 text-green-500" />, variant: 'outline' },
    rejected: { label: 'Rejected', icon: <XCircle className="h-4 w-4 mr-1 text-red-500" />, variant: 'destructive' },
};

export function TaskCard({ task, onAction }: TaskCardProps) {
  const { title, description, reward, type, status } = task;
  const currentStatus = statusConfig[status];

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="font-headline text-xl">{title}</CardTitle>
          <div className="flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-accent-foreground font-bold">
            <CircleDollarSign className="h-5 w-5" />
            <span>{reward.toFixed(2)}</span>
          </div>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        {task.reason && (
          <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            <p><span className="font-semibold">Why for you:</span> {task.reason}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Badge variant="outline" className="flex items-center gap-2">
          {taskTypeIcons[type]}
          {type}
        </Badge>
        
        {status === 'available' && (
          <Button onClick={() => onAction(task)}>Start Task</Button>
        )}
        {status === 'in-progress' && (
          <Button onClick={() => onAction(task)} className="bg-accent text-accent-foreground hover:bg-accent/90">Submit for Verification</Button>
        )}
        {status === 'pending-verification' && (
          <Button variant="secondary" disabled>
            <Clock className="mr-2 h-4 w-4 animate-spin" />
            Pending
          </Button>
        )}
        {status === 'completed' && (
          <div className="flex items-center text-green-600 font-medium">
             <CheckCircle className="mr-2 h-4 w-4" />
             Completed
          </div>
        )}

      </CardFooter>
    </Card>
  );
}
