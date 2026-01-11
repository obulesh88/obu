'use client';

import { recommendRelevantTasks } from '@/ai/flows/recommend-relevant-tasks';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskSubmissionDialog } from '@/components/tasks/task-submission-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Task, UserTask } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';
import { useCollection, useUser, useFirestore } from '@/firebase';
import { doc, setDoc, runTransaction } from 'firebase/firestore';


export default function TaskListClient() {
  const { data: availableTasks, loading: tasksLoading } = useCollection<Task>('tasks');
  const { user, userProfile, loading: userLoading } = useUser();
  const { data: userTasks, loading: userTasksLoading } = useCollection<UserTask>(user ? `users/${user.uid}/tasks` : '');
  
  const [recommendedTasks, setRecommendedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const firestore = useFirestore();


  const mergedTasks = useMemo(() => {
    if (tasksLoading || userTasksLoading) return [];
    return availableTasks.map(task => {
      const userTask = userTasks.find(ut => ut.id === task.id);
      return {
        ...task,
        status: userTask?.status || 'available',
      };
    });
  }, [availableTasks, userTasks, tasksLoading, userTasksLoading]);

  useEffect(() => {
    async function getRecommendations() {
      if (userLoading || !userProfile || mergedTasks.length === 0) {
        setIsLoading(userLoading || tasksLoading || userTasksLoading);
        return;
      }
      try {
        const tasksForRec = mergedTasks
          .filter(t => t.status === 'available')
          .map(t => `ID: ${t.id}, Title: ${t.title}, Description: ${t.description}`)
          .join('\n');
        
        const userHistory = userTasks.filter(ut => ut.status === 'completed').length > 0
            ? `Completed ${userTasks.filter(ut => ut.status === 'completed').length} tasks.`
            : 'No tasks completed yet.';

        const recommendations = await recommendRelevantTasks({
          userHistory: userHistory,
          availableTasks: tasksForRec,
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
  }, [user, userProfile, userTasks, mergedTasks, toast, userLoading, tasksLoading, userTasksLoading]);

  const handleTaskAction = async (task: Task) => {
    if (!user) {
        toast({ title: "Please sign in", variant: "destructive" });
        return;
    }
    const userTaskRef = doc(firestore, `users/${user.uid}/tasks`, task.id);

    if (task.status === 'available') {
      await setDoc(userTaskRef, { status: 'in-progress' }, { merge: true });
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
    if (!user) return;
    const userTaskRef = doc(firestore, `users/${user.uid}/tasks`, task.id);

    await setDoc(userTaskRef, { status: 'pending-verification', evidence, submittedAt: new Date() }, { merge: true });
    setIsDialogOpen(false);
    toast({
      title: 'Task Submitted!',
      description: 'Your submission is pending verification.',
    });
    
    // Simulate verification and reward
    setTimeout(async () => {
      try {
        if (firestore && user) {
          const taskToVerify = task; // use a local variable
          const userDocRef = doc(firestore, 'users', user.uid);
          const userTaskDocRef = doc(firestore, `users/${user.uid}/tasks`, taskToVerify.id);

          await runTransaction(firestore, async (transaction) => {
            const userDoc = await transaction.get(userDocRef);
            if (!userDoc.exists()) {
              throw "User document does not exist!";
            }

            const newOrBalance = userDoc.data().orBalance + taskToVerify.reward;
            transaction.update(userDocRef, { orBalance: newOrBalance });
            transaction.update(userTaskDocRef, { status: 'completed', completedAt: new Date() });
          });

          toast({
            title: 'Task Approved!',
            description: `+ ${taskToVerify.reward.toFixed(2)} OR coins have been added to your balance.`,
            className: 'bg-green-100 border-green-300 text-green-800',
          });
        }
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

  const otherTasks = mergedTasks.filter(task => !recommendedTasks.some(rec => rec.id === task.id) && task.status === 'available');

  return (
    <>
      <div className="grid gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-headline">Recommended for You</h2>
          <p className="text-muted-foreground">Tasks selected by AI based on your activity.</p>
        </div>
        {isLoading ? (
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
