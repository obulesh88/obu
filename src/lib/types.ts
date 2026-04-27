export type UserProfile = {
  uid: string;
  memberId: string;
  email: string;
  phoneNumber: string;
  profile: {
    displayName: string;
    Uid: string;
  };
  wallet: {
    balance: number;
    wageringRequired?: number;
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

export type TransactionType = 'ad' | 'captcha' | 'game' | 'referral' | 'withdrawal' | 'deposit';

export type Transaction = {
  id?: string;
  userId: string;
  amount: number;
  currency: 'INR';
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

export type DepositRequest = {
  id?: string;
  userId: string;
  email: string;
  amount: number;
  utr: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: any;
  updatedAt: any;
};
