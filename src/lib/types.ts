export type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'Survey' | 'Testing' | 'Review' | 'Data Entry' | 'Other';
  status: 'available' | 'in-progress' | 'pending-verification' | 'completed' | 'rejected';
  evidence?: string;
  reason?: string; // AI-generated reason for recommendation
};

export type User = {
  name: string;
  avatarUrl: string; // id from placeholder-images.json
  balance: number;
  history: string;
};
