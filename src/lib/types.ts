
export type UserProfile = {
  uid: string;
  email: string;
  phoneNumber: string;
  profile: {
    displayName: string;
    Uid: string;
  };
  wallet: {
    orBalance: number;
    inrBalance: number;
    walletAddress: string;
  };
  bankDetails?: {
    name: string;
    contact: string;
    email: string;
    accountNumber: string;
    ifsc: string;
    vpa?: string;
    payoutType?: 'bank' | 'upi';
  };
  createdAt: any;
  updatedAt: any;
  captcha: {
    is_active: boolean;
    verifiedAt: any;
    claimed: boolean;
    reward_comm: number;
  };
  watchAds: {
    ad_provider: string;
    ad_start: any;
    verifiedAt: any;
    ad_completed: boolean;
    reward_comm: number;
  };
  referral: {
    code: string;
    count: number;
    earnings: number;
  };
  status: {
    status: string;
  };
};

export type TransactionType = 'ad' | 'captcha' | 'game' | 'referral' | 'conversion' | 'withdrawal';

export type Transaction = {
  id?: string;
  userId: string;
  amount: number;
  currency: 'OR' | 'INR';
  type: TransactionType;
  description: string;
  createdAt: any;
};

export type WithdrawalRequest = {
  id?: string;
  userId: string;
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  payoutDetails: {
    name: string;
    accountNumber?: string;
    ifsc?: string;
    vpa?: string;
    payoutType: 'bank' | 'upi';
  };
  createdAt: any;
  updatedAt: any;
};
