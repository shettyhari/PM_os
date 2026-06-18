import { Router } from "express";
import { db } from "@workspace/db";
import { oauthTokensTable, userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const PLATFORM_META: Record<string, { name: string; description: string; color: string; docsUrl: string }> = {
  google: {
    name: "Google Ads",
    description: "Sync campaigns, ad groups, keywords, and performance metrics from your Google Ads accounts.",
    color: "#4285F4",
    docsUrl: "https://developers.google.com/google-ads/api/docs/start",
  },
  meta: {
    name: "Meta Ads",
    description: "Import Facebook & Instagram campaigns, audiences, and cross-channel attribution data.",
    color: "#0082FB",
    docsUrl: "https://developers.facebook.com/docs/marketing-api/get-started",
  },
  linkedin: {
    name: "LinkedIn Ads",
    description: "Sync LinkedIn Campaign Manager data including sponsored content and lead gen forms.",
    color: "#0A66C2",
    docsUrl: "https://docs.microsoft.com/en-us/linkedin/marketing/",
  },
  microsoft: {
    name: "Microsoft Ads",
    description: "Connect Microsoft Advertising for Bing Search, audience ads, and shopping campaigns.",
    color: "#00A4EF",
    docsUrl: "https://docs.microsoft.com/en-us/advertising/guides/",
  },
  ga4: {
    name: "Google Analytics 4",
    description: "Pull GA4 events, conversions, user journeys, and attribution data for unified reporting.",
    color: "#E37400",
    docsUrl: "https://developers.google.com/analytics/devguides/reporting/data/v1",
  },
  gtm: {
    name: "Google Tag Manager",
    description: "Manage and audit your GTM containers, tags, triggers, and data layer configuration.",
    color: "#246FDB",
    docsUrl: "https://developers.google.com/tag-platform/tag-manager/api/v2",
  },
  search_console: {
    name: "Google Search Console",
    description: "Import organic search data, keyword rankings, impressions, and CTR from Search Console.",
    color: "#4285F4",
    docsUrl: "https://developers.google.com/webmaster-tools",
  },
};

/** Check if a platform needs credentials configured (env or DB) */
function platformNeedsConfigSync(
  key: string,
  userSettings: { googleClientId: string | null; metaAppId: string | null } | null,
): boolean {
  if (key === "google" || key === "ga4" || key === "gtm" || key === "search_console") {
    return !process.env["GOOGLE_CLIENT_ID"] && !userSettings?.googleClientId;
  }
  if (key === "meta") return !process.env["META_APP_ID"] && !userSettings?.metaAppId;
  if (key === "linkedin") return !process.env["LINKEDIN_CLIENT_ID"];
  if (key === "microsoft") return !process.env["MICROSOFT_CLIENT_ID"];
  return true;
}

router.get("/integrations", async (req, res) => {
  try {
    const userId = req.user!.id;

    const [tokens, settingsRows] = await Promise.all([
      db.select().from(oauthTokensTable).where(eq(oauthTokensTable.userId, userId)),
      db.select({ googleClientId: userSettingsTable.googleClientId, metaAppId: userSettingsTable.metaAppId })
        .from(userSettingsTable).where(eq(userSettingsTable.userId, userId)),
    ]);

    const userSettings = settingsRows[0] ?? null;

    const integrations = Object.entries(PLATFORM_META).map(([key, meta], idx) => {
      const oauthPlatform = key === "ga4" || key === "gtm" || key === "search_console" ? "google" : key;
      const token = tokens.find((t) => t.platform === oauthPlatform);

      return {
        id: idx + 1,
        platform: key,
        name: meta.name,
        status: token ? "connected" : "disconnected",
        accountsConnected: token ? 1 : 0,
        lastSync: token?.updatedAt ? token.updatedAt.toISOString() : null,
        description: meta.description,
        accountName: token?.accountName ?? null,
        color: meta.color,
        docsUrl: meta.docsUrl,
        needsConfig: platformNeedsConfigSync(key, userSettings),
      };
    });

    res.json(integrations);
  } catch (err) {
    req.log.error({ err }, "Failed to list integrations");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
