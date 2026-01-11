import { Timestamp } from "firebase/firestore";

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
