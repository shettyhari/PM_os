import { Router } from "express";
import { db } from "@workspace/db";
import { windsorConnectionsTable, windsorMetricsTable } from "@workspace/db";
import { eq, gte, and } from "drizzle-orm";
import { connectorDisplayName } from "../services/windsor";

const router = Router();

const PLATFORM_META: Record<
  string,
  { name: string; description: string; color: string; docsUrl: string; windsorConnector?: string }
> = {
  meta: {
    name: "Meta Ads",
    description: "Facebook & Instagram campaigns via Windsor.ai aggregation.",
    color: "#0082FB",
    docsUrl: "https://windsor.ai",
    windsorConnector: "facebook",
  },
  google: {
    name: "Google Ads",
    description: "Google Ads campaigns, ad groups, and keywords via Windsor.ai.",
    color: "#4285F4",
    docsUrl: "https://windsor.ai",
    windsorConnector: "google_ads",
  },
  linkedin: {
    name: "LinkedIn Ads",
    description: "LinkedIn sponsored content and lead gen forms via Windsor.ai.",
    color: "#0A66C2",
    docsUrl: "https://windsor.ai",
    windsorConnector: "linkedin_ads",
  },
  microsoft: {
    name: "Microsoft Ads",
    description: "Bing Search and audience ads via Windsor.ai.",
    color: "#00A4EF",
    docsUrl: "https://windsor.ai",
    windsorConnector: "microsoft_ads",
  },
  ga4: {
    name: "Google Analytics 4",
    description: "GA4 events, conversions, and user journeys via Windsor.ai.",
    color: "#E37400",
    docsUrl: "https://windsor.ai",
    windsorConnector: "google_analytics_4",
  },
  tiktok: {
    name: "TikTok Ads",
    description: "TikTok Ads campaigns and creative performance via Windsor.ai.",
    color: "#010101",
    docsUrl: "https://windsor.ai",
    windsorConnector: "tiktok_ads",
  },
  search_console: {
    name: "Google Search Console",
    description: "Organic search rankings, impressions, and CTR via Windsor.ai.",
    color: "#4285F4",
    docsUrl: "https://windsor.ai",
    windsorConnector: "google_search_console",
  },
};

function cutoffDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0]!;
}

router.get("/integrations", async (req, res) => {
  try {
    const userId = req.user!.id;

    // Fetch Windsor connection and recent metrics to know which connectors have data
    const [connectionRows, recentMetrics] = await Promise.all([
      db.select().from(windsorConnectionsTable).where(eq(windsorConnectionsTable.userId, userId)),
      db
        .select({ connector: windsorMetricsTable.connector })
        .from(windsorMetricsTable)
        .where(and(eq(windsorMetricsTable.userId, userId), gte(windsorMetricsTable.date, cutoffDate(30)))),
    ]);

    const windsorConn = connectionRows[0] ?? null;
    const isWindsorConnected = windsorConn?.status === "connected";

    // Build set of connectors that have actual data in the last 30 days
    const activeConnectors = new Set(recentMetrics.map((r) => r.connector));

    const integrations = Object.entries(PLATFORM_META).map(([key, meta], idx) => {
      const wc = meta.windsorConnector;
      const hasData = wc ? activeConnectors.has(wc) : false;
      const isConnected = isWindsorConnected && hasData;

      return {
        id: idx + 1,
        platform: key,
        name: meta.name,
        status: isConnected ? "connected" : isWindsorConnected ? "available" : "disconnected",
        accountsConnected: isConnected ? 1 : 0,
        lastSync: isConnected ? windsorConn!.lastSyncAt?.toISOString() ?? null : null,
        description: meta.description,
        accountName: isConnected ? connectorDisplayName(wc ?? key) + " via Windsor.ai" : null,
        color: meta.color,
        docsUrl: meta.docsUrl,
        needsConfig: !isWindsorConnected,
        via: "windsor",
      };
    });

    res.json(integrations);
  } catch (err) {
    req.log.error({ err }, "Failed to list integrations");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
