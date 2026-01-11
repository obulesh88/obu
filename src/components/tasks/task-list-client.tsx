'use client';

import { recommendRelevantTasks } from '@/ai/flows/recommend-relevant-tasks';
import { TaskCard } from '@/components/tasks/task-card';
import { TaskSubmissionDialog } from '@/components/tasks/task-submission-dialog';
import { useToast } from '@/hooks/use-toast';
import type { Task } from '@/lib/types';
import { useEffect, useState, useMemo } from 'react';
import { Skeleton } from '../ui/skeleton';

const mockTasks: Task[] = [
    { id: '1', title: 'Complete a Survey', description: 'A short survey about your shopping habits.', reward: 100, type: 'Survey', status: 'available' },
    { id: '2', title: 'Test a New App', description: 'Try out a new mobile app and provide feedback.', reward: 500, type: 'Testing', status: 'available' },
    { id: '3', title: 'Write a Review', description: 'Write a review for a recent product you purchased.', reward: 200, type: 'Review', status: 'available' },
    { id: '4', title: 'Data Entry Job', description: 'Enter data from a scanned document.', reward: 300, type: 'Data Entry', status: 'available' },
    { id: '5', title: 'Play a Game', description: 'Reach level 5 in a new mobile game.', reward: 150, type: 'Games', status: 'available'},
    { id: '6', title: 'Watch an Ad', description: 'Watch a 30-second ad.', reward: 50, type: 'Watch Ads', status: 'available'},
    { id: '7', title: 'Solve a Captcha', description: 'Solve a series of captchas.', reward: 25, type: 'Captcha', status: 'available'},
];


export default function TaskListClient() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [recommendedTasks, setRecommendedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();


  const mergedTasks = useMemo(() => {
    return tasks.map(task => ({
      ...task,
    }));
  }, [tasks]);

  useEffect(() => {
    async function getRecommendations() {
      if (!tasks) {
        setIsLoading(false);
        return;
      }
      try {
        const availableTasks = mergedTasks
          .filter(t => t.status === 'available')
          .map(t => `ID: ${t.id}, Title: ${t.title}, Description: ${t.description}`)
          .join('\n');
        
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
  }, [tasks, mergedTasks, toast]);

  const handleTaskAction = async (task: Task) => {
    if (task.status === 'available') {
      setTasks(currentTasks => currentTasks.map(t => t.id === task.id ? { ...t, status: 'in-progress' } : t));
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
    setTasks(currentTasks => currentTasks.map(t => t.id === task.id ? { ...t, status: 'pending-verification', evidence } : t));
    setIsDialogOpen(false);
    toast({
      title: 'Task Submitted!',
      description: 'Your submission is pending verification.',
    });
    
    // Simulate verification and reward
    setTimeout(async () => {
      try {
        const taskToVerify = task; // use a local variable
        setTasks(currentTasks => currentTasks.map(t => t.id === taskToVerify.id ? { ...t, status: 'completed' } : t));
        
        toast({
          title: 'Task Approved!',
          description: `+ ₹${taskToVerify.reward.toFixed(2)} OR coins have been added to your balance.`,
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
