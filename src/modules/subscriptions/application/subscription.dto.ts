export interface SubscriptionView {
  id: string;
  planId: string;
  status: string;
  currentPeriodEnd: Date;
}

export interface SubscriptionStatusView {
  canOperate: boolean;
  trial: { active: boolean; endsAt: Date } | null;
  subscription: {
    status: string;
    planId: string;
    planName: string | null;
    currentPeriodEnd: Date;
  } | null;
}
