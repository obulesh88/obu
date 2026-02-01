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
    captcha_required: boolean;
    captcha_verified: boolean;
    captcha_verified_at: any;
  };
  playGames: {
    is_active: boolean;
    min_required_seconds: number;
    play_start: any;
    total_play_seconds: number;
  };
  rewards: {
    claimed: any;
    reward_coins: number;
  };
  watchAds: {
    ad_completed_at: any;
    ad_provider: string;
    ad_required: boolean;
    ad_start: any;
    ad_verified: boolean;
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
