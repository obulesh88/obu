export type UserProfile = {
  uid: string;
  email: string;
  profile: {
    displayName: string;
    Uid: string;
  };
  wallet: {
    orBalance: number;
    inrBalance: number;
    walletAddress: string;
  };
  createdAt: any;
  updatedAt: any;
  captcha: {
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
  };
  watchAds: {
    ad_provider: string;
    ad_required: boolean;
    ad_start: any;
    verifiedAt: any;
    claimed: boolean;
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
  type: 'ad' | 'captcha' | 'game';
  description: string;
  createdAt: Date;
  playTimeInSeconds?: number;
};
