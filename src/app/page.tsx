import { Header } from '@/components/layout/header';
import TaskListClient from '@/components/tasks/task-list-client';
import { initialUser, initialTasks } from '@/lib/data';

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header user={initialUser} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <TaskListClient initialTasks={initialTasks} initialUser={initialUser} />
      </main>
    </div>
  );
}
