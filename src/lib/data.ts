import type { Task, User } from './types';

export const initialUser: User = {
  name: 'Alex Doe',
  avatarUrl: 'user-avatar',
  balance: 75.5,
  history: `
    - Completed 5 'Data Entry' tasks successfully. Showed high accuracy.
    - Completed 2 'Product Review' tasks. Provided detailed and helpful feedback.
    - Attempted 1 'App Testing' task but did not complete it.
    - Expressed interest in tasks that require attention to detail.
    - Tends to work during evening hours.
  `,
};

export const initialTasks: Task[] = [
  {
    id: '1',
    title: 'Review New E-commerce App',
    description: 'Test the checkout process and report any bugs. Provide feedback on the user experience.',
    reward: 15.0,
    type: 'Testing',
    status: 'available',
  },
  {
    id: '2',
    title: 'Customer Service Survey',
    description: 'Complete a 10-minute survey about a recent customer service experience.',
    reward: 5.0,
    type: 'Survey',
    status: 'available',
  },
  {
    id: '3',
    title: 'Transcribe Audio Files',
    description: 'Transcribe a set of 5 short audio clips with high accuracy.',
    reward: 25.0,
    type: 'Data Entry',
    status: 'available',
  },
  {
    id: '4',
    title: 'Logo Design Feedback',
    description: 'Provide your opinion on three new logo designs for a startup.',
    reward: 7.5,
    type: 'Review',
    status: 'completed',
  },
  {
    id: '5',
    title: 'Data Clean-up in Spreadsheet',
    description: 'Format and clean a dataset of 1000 rows in Google Sheets.',
    reward: 50.0,
    type: 'Data Entry',
    status: 'available',
  },
  {
    id: '6',
    title: 'Test Mobile Game Prototype',
    description: 'Play a new mobile game for 30 minutes and report any glitches.',
    reward: 12.0,
    type: 'Testing',
    status: 'in-progress',
  },
  {
    id: '7',
    title: 'Write a Short Product Description',
    description: 'Write a 100-word description for a new tech gadget.',
    reward: 10.0,
    type: 'Review',
    status: 'pending-verification',
  },
];
