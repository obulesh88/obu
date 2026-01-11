import { Timestamp } from "firebase/firestore";

export type Task = {
  id: string;
  title: string;
  description: string;
  reward: number;
  type: 'Watch Ads' | 'Games' | 'Captcha' | 'Other';
  status: 'available' | 'in-progress' | 'pending-verification' | 'completed' | 'rejected';
  evidence?: string;
  reason?: string; // AI-generated reason for recommendation
};

export type UserProfile = {
  uid: string;
  email: string;
  profile: {
    displayName: string;
    photoURL: string;
  };
  wallet: {
    orBalance: number;
    inrBalance: number;
    walletAddress: string;
  };
  createdAt: Timestamp;
};

export type UserTask = {
  id: string;
  status: Task['status'];
  submittedAt?: Timestamp;
  completedAt?: Timestamp;
}
