
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
    payoutType?: 'bank' | 'upi' | 'giftcard';
    giftCardEmail?: string;
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

export type EarningTransaction = {
  id: string;
  userId: string;
  amount: number;
  type: 'ad' | 'captcha' | 'game' | 'referral';
  description: string;
  createdAt: Date;
  playTimeInSeconds?: number;
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
    payoutType: 'bank' | 'upi' | 'giftcard';
    giftCardEmail?: string;
  };
  createdAt: any;
  updatedAt: any;
};
