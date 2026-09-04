import { createDataSourceState } from "../data-source";
import type { EbosWeeklyDataAdapter, EbosWeeklySnapshot } from "./adapter-types";

function numberValue(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function createManualInputAdapter(): EbosWeeklyDataAdapter {
  return {
    key: "manual_input",
    async readWeeklySnapshot({ manualInput }) {
      if (!manualInput) {
        return {
          dataSource: createDataSourceState("manual_input", "not_configured"),
          warnings: []
        };
      }

      const manualRevenue =
        numberValue(manualInput.manualRevenue) +
        numberValue(manualInput.whopRevenue) +
        numberValue(manualInput.taobaoRevenue) +
        numberValue(manualInput.xianyuRevenue);
      const snapshot: EbosWeeklySnapshot = {};

      if (manualRevenue > 0) {
        snapshot.orders = {
          weeklyRevenue: manualRevenue,
          paidOrders: 1
        };
      }

      if (numberValue(manualInput.trafficSessions) > 0) {
        snapshot.seo = {
          seoLandingViews: numberValue(manualInput.trafficSessions)
        };
        snapshot.websiteHealth = {
          analyticsEvents: numberValue(manualInput.trafficSessions)
        };
      }

      return {
        dataSource: createDataSourceState("manual_input", "available", {
          metadata: {
            keyEvents: manualInput.keyEvents ?? [],
            nextWeekFocus: manualInput.nextWeekFocus ?? [],
            marketSignals: manualInput.marketSignals ?? [],
            competitorNotes: manualInput.competitorNotes ?? []
          }
        }),
        snapshot,
        warnings: []
      };
    }
  };
}

