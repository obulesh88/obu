'use server';

/**
 * @fileOverview This file defines a Genkit flow for recommending relevant tasks to users based on their past behavior.
 *
 * It includes:
 * - `recommendRelevantTasks`: The main function to trigger the task recommendation flow.
 * - `RecommendRelevantTasksInput`: The input type for the `recommendRelevantTasks` function.
 * - `RecommendRelevantTasksOutput`: The output type for the `recommendRelevantTasks` function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RecommendRelevantTasksInputSchema = z.object({
  userHistory: z.string().describe('A summary of the user historical task submissions and behaviors.'),
  availableTasks: z.string().describe('A description of the available tasks including titles and descriptions.'),
});
export type RecommendRelevantTasksInput = z.infer<typeof RecommendRelevantTasksInputSchema>;

const RecommendedTaskSchema = z.object({
  taskId: z.string().describe('The ID of the recommended task.'),
  title: z.string().describe('The title of the recommended task.'),
  description: z.string().describe('A brief description of the recommended task.'),
  reason: z.string().describe('Why this task is recommended for the user based on their history.'),
});

const RecommendRelevantTasksOutputSchema = z.array(RecommendedTaskSchema).describe('A list of tasks recommended for the user.');
export type RecommendRelevantTasksOutput = z.infer<typeof RecommendRelevantTasksOutputSchema>;

export async function recommendRelevantTasks(input: RecommendRelevantTasksInput): Promise<RecommendRelevantTasksOutput> {
  return recommendRelevantTasksFlow(input);
}

const recommendRelevantTasksPrompt = ai.definePrompt({
  name: 'recommendRelevantTasksPrompt',
  input: {schema: RecommendRelevantTasksInputSchema},
  output: {schema: RecommendRelevantTasksOutputSchema},
  prompt: `You are an expert task recommendation system. Given a user's task history and a list of available tasks, you will recommend the most relevant tasks to the user.

User History: {{{userHistory}}}

Available Tasks: {{{availableTasks}}}

For each recommended task, explain why it is relevant to the user based on their history.

Return a JSON array of recommended tasks. Each task should include the taskId, title, description, and a short reason for the recommendation.

Ensure that the tasks recommended are chosen based on skills and interests, to increase their earnings and optimize their experience.
`,
});

const recommendRelevantTasksFlow = ai.defineFlow(
  {
    name: 'recommendRelevantTasksFlow',
    inputSchema: RecommendRelevantTasksInputSchema,
    outputSchema: RecommendRelevantTasksOutputSchema,
  },
  async input => {
    const {output} = await recommendRelevantTasksPrompt(input);
    return output!;
  }
);
