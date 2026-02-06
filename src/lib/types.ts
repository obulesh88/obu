
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
  referral: {
    referralCode: string;
    referredBy: string | null;
    referralCount: number;
    totalReferralEarnings: number;
  };
  createdAt: any;
  updatedAt: any;
  captcha: {
    is_active: boolean;
    verifiedAt: any;
    claimed: boolean;
    reward_comm: number;
  };
  playGames: {
    is_active: boolean;
    min_required_seconds: number;
    play_start: any;
    total_play_seconds: number;
    verifiedAt: any;
    claimed: boolean;
    reward_comm: number;
    game_id: string | null;
  };
  watchAds: {
    ad_provider: string;
    ad_start: any;
    verifiedAt: any;
    ad_completed: boolean;
    reward_comm: number;
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
