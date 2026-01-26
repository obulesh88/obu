import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  uid: string;
  email: string;
  profile: {
    displayName: string;
  };
  wallet: {
    orBalance: number;
    inrBalance: number;
    walletAddress: string;
  };
  createdAt: Timestamp;
};

export type EarningTransaction = {
  id: string;
  userId: string;
  amount: number;
  type: 'ad' | 'captcha' | 'game';
  description: string;
  createdAt: Timestamp;
};
