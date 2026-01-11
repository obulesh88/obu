'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Task } from '@/lib/types';
import { useState } from 'react';

interface TaskSubmissionDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  task: Task;
  onSubmit: (task: Task, evidence: string) => void;
}

export function TaskSubmissionDialog({
  isOpen,
  onOpenChange,
  task,
  onSubmit,
}: TaskSubmissionDialogProps) {
  const [evidence, setEvidence] = useState('');

  const handleSubmit = () => {
    onSubmit(task, evidence);
    setEvidence('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Submit: {task.title}</DialogTitle>
          <DialogDescription>
            Provide evidence of task completion below. This could be a link, text, or a description of your work.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-2">
            <Label htmlFor="evidence">Submission Evidence</Label>
            <Textarea
              id="evidence"
              placeholder="e.g., https://example.com/screenshot.png or 'I have completed the survey as requested.'"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" onClick={handleSubmit} disabled={!evidence}>
            Submit for Verification
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
