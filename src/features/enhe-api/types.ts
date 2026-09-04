export type ApiPlan = {
  name: "Starter" | "Pro" | "Ultra" | "Enterprise";
  price: string;
  period: string;
  credit: string;
  fiveHourWindow: string;
  sevenDayWindow: string;
  maxKeys: number | "custom";
  audience: string;
  cta: string;
  highlighted?: boolean;
};

export type ApiKeyRecord = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string;
  todayUsage: string;
  status: "active" | "revoked";
};

export type RequestLogRecord = {
  id: string;
  time: string;
  method: "GET" | "POST";
  path: "/v1/models" | "/v1/chat/completions" | "/v1/messages";
  model: string;
  keyPrefix: string;
  tokens: string;
  cost: string;
  latency: string;
  statusCode: 200 | 400 | 401 | 402 | 429 | 502;
  requestId: string;
};

export type UsageTrendPoint = {
  day: string;
  requests: number;
  credit: number;
};

export type BillingOrder = {
  id: string;
  item: string;
  amount: string;
  status: "paid" | "processing" | "manual";
  createdAt: string;
};

export type ReferralRecord = {
  id: string;
  user: string;
  status: "pending" | "qualified" | "rewarded" | "review";
  reward: string;
  createdAt: string;
};

export type DeveloperProfile = {
  avatarInitials: string;
  displayName: string;
  email: string;
  developerId: string;
  status: "active" | "review";
};

export type ConsoleQuickAction = {
  label: string;
  href: string;
};
