'use client';

import { recommendRelevantTasks } from '@/ai/flows/recommend-relevant-tasks';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskSubmissionDialog } from '@/components/tasks/task-submission-dialog';
import { useToast } from '@/hooks/use-toast';
import { initialTasks, initialUser } from '@/lib/data';
import type { Task } from '@/lib/types';
import { useEffect, useState } from 'react';
import { Skeleton } from '../ui/skeleton';

interface TaskListClientProps {
  initialTasks: Task[];
  initialUser: { history: string };
}

export default function TaskListClient({ initialTasks, initialUser }: TaskListClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [recommendedTasks, setRecommendedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function getRecommendations() {
      try {
        const availableTasks = tasks
          .filter(t => t.status === 'available')
          .map(t => `ID: ${t.id}, Title: ${t.title}, Description: ${t.description}`)
          .join('\n');
        
        const recommendations = await recommendRelevantTasks({
          userHistory: initialUser.history,
          availableTasks,
        });

        const recommendedTaskDetails = recommendations.map(rec => {
          const taskDetail = tasks.find(t => t.id === rec.taskId);
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
  }, []);

  const handleTaskAction = (task: Task) => {
    if (task.status === 'available') {
      setTasks(tasks.map(t => t.id === task.id ? { ...t, status: 'in-progress' } : t));
      toast({
        title: `Task "${task.title}" started!`,
        description: 'You can now submit it for verification.',
      });
    } else if (task.status === 'in-progress') {
      setSelectedTask(task);
      setIsDialogOpen(true);
    }
  };

  const handleTaskSubmit = (task: Task, evidence: string) => {
    setTasks(tasks.map(t => (t.id === task.id ? { ...t, status: 'pending-verification', evidence } : t)));
    setIsDialogOpen(false);
    toast({
      title: 'Task Submitted!',
      description: 'Your submission is pending verification.',
    });
    
    // Simulate verification
    setTimeout(() => {
      setTasks(prevTasks => prevTasks.map(t => (t.id === task.id ? { ...t, status: 'completed' } : t)));
      // Note: In a real app, user balance would be updated here from a central store.
      // This is a visual simulation.
      toast({
        title: 'Task Approved!',
        description: `+ $${task.reward.toFixed(2)} has been added to your balance.`,
        className: 'bg-green-100 border-green-300 text-green-800',
      });
    }, 5000);
  };

  const otherTasks = tasks.filter(task => !recommendedTasks.some(rec => rec.id === task.id));

  return (
    <>
      <div className="grid gap-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-headline">Recommended for You</h2>
          <p className="text-muted-foreground">Tasks selected by AI based on your activity.</p>
        </div>
        {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
            </div>
        ) : recommendedTasks.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
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
