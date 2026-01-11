import { Timestamp } from "firebase/firestore";

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

export type UserProfile = {
  displayName: string;
  email: string;
  photoURL: string;
  inrBalance: number;
  orBalance: number;
  walletAddress: string;
  createdAt: Timestamp;
};

export type UserTask = {
  id: string;
  status: Task['status'];
  submittedAt?: Timestamp;
  completedAt?: Timestamp;
}
