import type {
  EbosDataSourceKey,
  EbosDataSourceState,
  EbosDateWindow,
  EbosWarning
} from "../types";

export type EbosAdapterResult<TSnapshot> = {
  dataSource: EbosDataSourceState;
  snapshot?: TSnapshot;
  warnings: EbosWarning[];
};

export type EbosProductMetric = {
  totalProducts: number;
  publishedProducts: number;
  newProductsThisWeek: number;
  totalDownloads: number;
  totalUsage: number;
};

export type EbosOrderMetric = {
  totalOrders: number;
  weeklyOrders: number;
  paidOrders: number;
  weeklyRevenue: number;
  previousWeeklyRevenue: number;
  refunds: number;
};

export type EbosContentMetric = {
  aiNewsArticles: number;
  newAiNewsThisWeek: number;
  aiTrendBriefings: number;
  newAiTrendBriefingsThisWeek: number;
};

export type EbosSeoMetric = {
  seoLandingViews: number;
  organicLandings: number;
  aiAnswerLandings: number;
  searchEvents: number;
  conversionEvents: number;
};

export type EbosGeoMetric = {
  queries: number;
  providers: number;
  reviewedResults: number;
  brandMentionRate: number;
  domainCitationRate: number;
  openRecommendations: number;
};

export type EbosWebsiteHealthMetric = {
  users: number;
  weeklyUsers: number;
  analyticsEvents: number;
  pendingBaiduPushItems: number;
  comments: number;
};

export type EbosInternalDatabaseSnapshot = {
  products: EbosProductMetric;
  orders: EbosOrderMetric;
  content: EbosContentMetric;
  seo: EbosSeoMetric;
  geo: EbosGeoMetric;
  websiteHealth: EbosWebsiteHealthMetric;
};

export type EbosWeeklySnapshot = Partial<{
  products: Partial<EbosProductMetric>;
  orders: Partial<EbosOrderMetric>;
  content: Partial<EbosContentMetric>;
  seo: Partial<EbosSeoMetric>;
  geo: Partial<EbosGeoMetric>;
  websiteHealth: Partial<EbosWebsiteHealthMetric>;
}>;

export type EbosManualInput = {
  manualRevenue?: number;
  whopRevenue?: number;
  taobaoRevenue?: number;
  xianyuRevenue?: number;
  trafficSessions?: number;
  keyEvents?: string[];
  nextWeekFocus?: string[];
  marketSignals?: string[];
  competitorNotes?: string[];
};

export type EbosWeeklyAdapterContext = {
  period: EbosDateWindow;
  previousPeriod: EbosDateWindow;
  manualInput?: EbosManualInput;
};

export type EbosWeeklyDataAdapter = {
  key: EbosDataSourceKey;
  readWeeklySnapshot: (
    context: EbosWeeklyAdapterContext
  ) => Promise<EbosAdapterResult<EbosWeeklySnapshot>>;
};

export function createEmptyWeeklySnapshot(): EbosInternalDatabaseSnapshot {
  return {
    products: {
      totalProducts: 0,
      publishedProducts: 0,
      newProductsThisWeek: 0,
      totalDownloads: 0,
      totalUsage: 0
    },
    orders: {
      totalOrders: 0,
      weeklyOrders: 0,
      paidOrders: 0,
      weeklyRevenue: 0,
      previousWeeklyRevenue: 0,
      refunds: 0
    },
    content: {
      aiNewsArticles: 0,
      newAiNewsThisWeek: 0,
      aiTrendBriefings: 0,
      newAiTrendBriefingsThisWeek: 0
    },
    seo: {
      seoLandingViews: 0,
      organicLandings: 0,
      aiAnswerLandings: 0,
      searchEvents: 0,
      conversionEvents: 0
    },
    geo: {
      queries: 0,
      providers: 0,
      reviewedResults: 0,
      brandMentionRate: 0,
      domainCitationRate: 0,
      openRecommendations: 0
    },
    websiteHealth: {
      users: 0,
      weeklyUsers: 0,
      analyticsEvents: 0,
      pendingBaiduPushItems: 0,
      comments: 0
    }
  };
}

