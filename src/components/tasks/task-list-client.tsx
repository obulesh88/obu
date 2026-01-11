'use client';

import { recommendRelevantTasks } from '@/ai/flows/recommend-relevant-tasks';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskSubmissionDialog } from '@/components/tasks/task-submission-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Task, UserProfile } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useCollection, useFirestore, useUser } from '@/firebase';
import { collection, doc, runTransaction, setDoc, writeBatch } from 'firebase/firestore';

export default function TaskListClient() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { data: tasks, loading: tasksLoading, error: tasksError } = useCollection<Task>(firestore ? collection(firestore, 'tasks') : null);
  const { data: userTasks, loading: userTasksLoading } = useCollection(firestore && user ? collection(firestore, 'users', user.uid, 'tasks') : null);

  const [recommendedTasks, setRecommendedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const userTaskStatus = useMemo(() => {
    if (!userTasks) return {};
    const statusMap: { [key: string]: Task['status'] } = {};
    userTasks.forEach((task) => {
      statusMap[task.id] = task.status;
    });
    return statusMap;
  }, [userTasks]);

  const mergedTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.map(task => ({
      ...task,
      status: userTaskStatus[task.id] || 'available',
    }));
  }, [tasks, userTaskStatus]);

  useEffect(() => {
    if (tasksLoading || userTasksLoading) return;
    async function getRecommendations() {
      if (!tasks || !user) {
        setIsLoading(false);
        return;
      }
      try {
        const availableTasks = mergedTasks
          .filter(t => t.status === 'available')
          .map(t => `ID: ${t.id}, Title: ${t.title}, Description: ${t.description}`)
          .join('\n');
        
        // TODO: Get user history from firestore
        const recommendations = await recommendRelevantTasks({
          userHistory: 'Completed 5 data entry tasks',
          availableTasks,
        });

        const recommendedTaskDetails = recommendations.map(rec => {
          const taskDetail = mergedTasks.find(t => t.id === rec.taskId);
          return { ...taskDetail, reason: rec.reason } as Task;
        }).filter(Boolean);

        setRecommendedTasks(recommendedTaskDetails);
      } catch (error) {
        console.error('Failed to get recommendations:', error);
        toast({
            title: 'AI Error',
            description: 'Could not fetch task recommendations.',
            variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
    getRecommendations();
  }, [tasksLoading, userTasksLoading, tasks, mergedTasks, user, toast]);

  const handleTaskAction = async (task: Task) => {
    if (!firestore || !user) return;
    const userTaskRef = doc(firestore, 'users', user.uid, 'tasks', task.id);

    if (task.status === 'available') {
      await setDoc(userTaskRef, { status: 'in-progress' });
      toast({
        title: `Task "${task.title}" started!`,
        description: 'You can now submit it for verification.',
      });
    } else if (task.status === 'in-progress') {
      setSelectedTask(task);
      setIsDialogOpen(true);
    }
  };

  const handleTaskSubmit = async (task: Task, evidence: string) => {
    if (!firestore || !user) return;
    const userTaskRef = doc(firestore, 'users', user.uid, 'tasks', task.id);
    await setDoc(userTaskRef, { status: 'pending-verification', evidence }, { merge: true });

    setIsDialogOpen(false);
    toast({
      title: 'Task Submitted!',
      description: 'Your submission is pending verification.',
    });
    
    // Simulate verification and reward
    setTimeout(async () => {
      try {
        await runTransaction(firestore, async (transaction) => {
          const userProfileRef = doc(firestore, 'users', user.uid);
          const userProfileDoc = await transaction.get(userProfileRef);

          if (!userProfileDoc.exists()) {
            throw "User profile does not exist!";
          }

          const newOrBalance = (userProfileDoc.data().orBalance || 0) + task.reward;
          
          transaction.update(userTaskRef, { status: 'completed' });
          transaction.update(userProfileRef, { orBalance: newOrBalance });
        });

        toast({
          title: 'Task Approved!',
          description: `+ ${task.reward.toFixed(2)} OR coins have been added to your balance.`,
          className: 'bg-green-100 border-green-300 text-green-800',
        });
      } catch (e) {
        console.error("Transaction failed: ", e);
        toast({
          title: 'Error updating balance',
          description: 'Could not update your balance after task approval.',
          variant: 'destructive',
        });
      }
    }, 5000);
  };

  if (tasksError) {
    return <div>Error loading tasks.</div>
  }

  const otherTasks = mergedTasks.filter(task => !recommendedTasks.some(rec => rec.id === task.id) && task.status === 'available');

  return (
    <>
      <div className="grid gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-headline">Recommended for You</h2>
          <p className="text-muted-foreground">Tasks selected by AI based on your activity.</p>
        </div>
        {isLoading || tasksLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
                {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-64" />)}
            </div>
        ) : recommendedTasks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {recommendedTasks.map(task => (
              <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
            ))}
          </div>
        ) : (
          <p>No recommendations for you at the moment.</p>
        )}
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold tracking-tight font-headline">All Tasks</h2>
        <p className="text-muted-foreground">Explore all available opportunities.</p>
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          {otherTasks.map(task => (
            <TaskCard key={task.id} task={task} onAction={handleTaskAction} />
          ))}
        </div>
      </div>

      {selectedTask && (
        <TaskSubmissionDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          task={selectedTask}
          onSubmit={handleTaskSubmit}
        />
      )}
    </>
  );
}
