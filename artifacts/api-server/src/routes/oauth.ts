import { Router } from "express";
import { db } from "@workspace/db";
import { oauthTokensTable, campaignsTable, userSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middleware/require-auth";

const router = Router();

const PLATFORM_CONFIG = {
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/adwords",
      "https://www.googleapis.com/auth/analytics.readonly",
      "https://www.googleapis.com/auth/webmasters.readonly",
    ],
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    extra: { access_type: "offline", prompt: "consent" },
  },
  meta: {
    authUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["ads_read", "ads_management", "business_management", "read_insights"],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
    extra: {},
  },
  linkedin: {
    authUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["r_ads", "r_ads_reporting", "rw_ads"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    extra: {},
  },
  microsoft: {
    authUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["https://ads.microsoft.com/ads.manage", "offline_access"],
    clientIdEnv: "MICROSOFT_CLIENT_ID",
    clientSecretEnv: "MICROSOFT_CLIENT_SECRET",
    extra: {},
  },
} as const;

type PlatformKey = keyof typeof PLATFORM_CONFIG;

function getAppBaseUrl(): string {
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0].trim()}`;
  const devDomain = process.env.REPLIT_DEV_DOMAIN;
  if (devDomain) return `https://${devDomain}`;
  return "http://localhost:80";
}

/** Resolve client credentials: env var first, then user's DB settings */
async function resolveCredentials(
  userId: string,
  platform: PlatformKey,
): Promise<{ clientId: string | null; clientSecret: string | null }> {
  const cfg = PLATFORM_CONFIG[platform];
  const envClientId = process.env[cfg.clientIdEnv] ?? null;
  const envClientSecret = process.env[cfg.clientSecretEnv] ?? null;

  if (envClientId && envClientSecret) return { clientId: envClientId, clientSecret: envClientSecret };

  // Fall back to user's DB settings
  const [row] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
  if (!row) return { clientId: envClientId, clientSecret: envClientSecret };

  const dbMap: Record<PlatformKey, { id: string | null; secret: string | null }> = {
    google: { id: row.googleClientId, secret: row.googleClientSecret },
    meta: { id: row.metaAppId, secret: row.metaAppSecret },
    linkedin: { id: null, secret: null },
    microsoft: { id: null, secret: null },
  };

  return {
    clientId: envClientId ?? dbMap[platform].id,
    clientSecret: envClientSecret ?? dbMap[platform].secret,
  };
}

/** Check if a platform is configured (env or DB) for needsConfig flag */
async function platformNeedsConfig(userId: string, platform: PlatformKey): Promise<boolean> {
  const { clientId, clientSecret } = await resolveCredentials(userId, platform);
  return !clientId || !clientSecret;
}

// GET /oauth/status
router.get("/oauth/status", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const tokens = await db
      .select({ platform: oauthTokensTable.platform, accountName: oauthTokensTable.accountName, updatedAt: oauthTokensTable.updatedAt })
      .from(oauthTokensTable)
      .where(eq(oauthTokensTable.userId, userId));

    const status = await Promise.all(
      Object.entries(PLATFORM_CONFIG).map(async ([platform]) => {
        const key = platform as PlatformKey;
        const token = tokens.find((t) => t.platform === key);
        return {
          platform: key,
          connected: !!token,
          accountName: token?.accountName ?? null,
          lastSync: token?.updatedAt ? token.updatedAt.toISOString() : null,
          needsConfig: await platformNeedsConfig(userId, key),
        };
      }),
    );

    res.json(status);
  } catch (err) {
    req.log.error({ err }, "Failed to get OAuth status");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /oauth/initiate/:platform
router.get("/oauth/initiate/:platform", requireAuth, async (req, res) => {
  const platform = req.params["platform"] as PlatformKey;
  const cfg = PLATFORM_CONFIG[platform];

  if (!cfg) {
    res.status(400).json({ error: "Unknown platform" });
    return;
  }

  const userId = req.user!.id;
  const { clientId, clientSecret: _clientSecret } = await resolveCredentials(userId, platform);

  if (!clientId) {
    res.status(400).json({
      error: `OAuth credentials not configured for ${platform}. Add them in Dashboard → Settings.`,
      needsConfig: true,
      envVar: cfg.clientIdEnv,
    });
    return;
  }

  const state = Buffer.from(
    JSON.stringify({ userId, platform, ts: Date.now() }),
  ).toString("base64url");

  const callbackUrl = `${getAppBaseUrl()}/api/oauth/callback/${platform}`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: cfg.scopes.join(" "),
    state,
    ...cfg.extra,
  });

  res.json({ url: `${cfg.authUrl}?${params.toString()}` });
});

// GET /oauth/callback/:platform (public — browser arrives after redirect)
router.get("/oauth/callback/:platform", async (req, res) => {
  const platform = req.params["platform"] as PlatformKey;
  const cfg = PLATFORM_CONFIG[platform];
  const baseUrl = getAppBaseUrl();

  if (!cfg) {
    res.redirect(`${baseUrl}/integrations?error=unknown_platform`);
    return;
  }

  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.redirect(`${baseUrl}/integrations?error=${encodeURIComponent(error)}&platform=${platform}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${baseUrl}/integrations?error=missing_code&platform=${platform}`);
    return;
  }

  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString()) as {
      userId: string; platform: string; ts: number;
    };
    userId = decoded.userId;
    if (!userId) throw new Error("No userId in state");
    if (Date.now() - decoded.ts > 10 * 60 * 1000) throw new Error("State expired");
  } catch {
    res.redirect(`${baseUrl}/integrations?error=invalid_state&platform=${platform}`);
    return;
  }

  try {
    const { clientId, clientSecret } = await resolveCredentials(userId, platform);
    if (!clientId || !clientSecret) {
      res.redirect(`${baseUrl}/integrations?error=missing_credentials&platform=${platform}`);
      return;
    }

    const callbackUrl = `${getAppBaseUrl()}/api/oauth/callback/${platform}`;
    const tokenBody = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    });

    const tokenRes = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      // Use req.log if available, else console
      console.error("Token exchange failed", { platform, status: tokenRes.status, errText });
      res.redirect(`${baseUrl}/integrations?error=token_exchange_failed&platform=${platform}`);
      return;
    }

    const tokenData = (await tokenRes.json()) as Record<string, unknown>;
    const accessToken = tokenData["access_token"] as string;
    const refreshToken = (tokenData["refresh_token"] as string | undefined) ?? null;
    const expiresIn = tokenData["expires_in"] as number | undefined;
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000) : null;
    const scope = (tokenData["scope"] as string | undefined) ?? null;

    const [existing] = await db
      .select({ id: oauthTokensTable.id })
      .from(oauthTokensTable)
      .where(and(eq(oauthTokensTable.userId, userId), eq(oauthTokensTable.platform, platform)));

    if (existing) {
      await db
        .update(oauthTokensTable)
        .set({ accessToken, refreshToken, expiresAt, scope, updatedAt: new Date() })
        .where(and(eq(oauthTokensTable.userId, userId), eq(oauthTokensTable.platform, platform)));
    } else {
      await db.insert(oauthTokensTable).values({ userId, platform, accessToken, refreshToken, expiresAt, scope });
    }

    syncPlatformData(userId, platform, accessToken).catch((e: unknown) => {
      console.error("Background sync failed", { err: e, platform });
    });

    res.redirect(`${baseUrl}/integrations?connected=${platform}`);
  } catch (err) {
    console.error("OAuth callback failed", { err, platform });
    res.redirect(`${baseUrl}/integrations?error=callback_failed&platform=${platform}`);
  }
});

// DELETE /oauth/disconnect/:platform
router.delete("/oauth/disconnect/:platform", requireAuth, async (req, res) => {
  const platform = req.params["platform"] as PlatformKey;
  const userId = req.user!.id;

  try {
    await db.delete(oauthTokensTable).where(and(eq(oauthTokensTable.userId, userId), eq(oauthTokensTable.platform, platform)));
    await db.delete(campaignsTable).where(and(
      eq(campaignsTable.userId, userId),
      eq(campaignsTable.platform, platform as "google" | "meta" | "linkedin" | "microsoft"),
    ));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to disconnect platform");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /oauth/sync/:platform
router.post("/oauth/sync/:platform", requireAuth, async (req, res) => {
  const platform = req.params["platform"] as PlatformKey;
  const userId = req.user!.id;

  try {
    const [token] = await db
      .select()
      .from(oauthTokensTable)
      .where(and(eq(oauthTokensTable.userId, userId), eq(oauthTokensTable.platform, platform)));

    if (!token) {
      res.status(404).json({ error: "Platform not connected" });
      return;
    }

    syncPlatformData(userId, platform, token.accessToken).catch((e: unknown) => {
      req.log.error({ err: e, platform }, "Manual sync failed");
    });

    res.json({ message: "Sync started" });
  } catch (err) {
    req.log.error({ err }, "Failed to trigger sync");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Platform Sync Functions ──────────────────────────────────────────────────

async function syncPlatformData(userId: string, platform: PlatformKey, accessToken: string): Promise<void> {
  switch (platform) {
    case "google": await syncGoogleAds(userId, accessToken); break;
    case "meta": await syncMetaAds(userId, accessToken); break;
    case "linkedin": await syncLinkedInAds(userId, accessToken); break;
    case "microsoft": await syncMicrosoftAds(userId, accessToken); break;
  }
}

async function upsertCampaign(
  userId: string,
  externalId: string,
  values: Omit<typeof campaignsTable.$inferInsert, "id" | "createdAt" | "updatedAt">,
): Promise<void> {
  const [existing] = await db
    .select({ id: campaignsTable.id })
    .from(campaignsTable)
    .where(and(eq(campaignsTable.userId, userId), eq(campaignsTable.externalId, externalId)));

  if (existing) {
    await db.update(campaignsTable).set({ ...values, updatedAt: new Date() }).where(eq(campaignsTable.id, existing.id));
  } else {
    await db.insert(campaignsTable).values({ ...values, externalId });
  }
}

async function syncGoogleAds(userId: string, accessToken: string): Promise<void> {
  const developerToken = process.env["GOOGLE_ADS_DEVELOPER_TOKEN"];
  if (!developerToken) throw new Error("GOOGLE_ADS_DEVELOPER_TOKEN not set");

  const custRes = await fetch("https://googleads.googleapis.com/v14/customers:listAccessibleCustomers", {
    headers: { Authorization: `Bearer ${accessToken}`, "developer-token": developerToken },
  });
  if (!custRes.ok) throw new Error(`Google Ads customer list: ${custRes.status}`);

  const { resourceNames } = (await custRes.json()) as { resourceNames: string[] };

  for (const resource of resourceNames.slice(0, 10)) {
    const customerId = resource.replace("customers/", "");
    const searchRes = await fetch(
      `https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "developer-token": developerToken, "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `SELECT campaign.id, campaign.name, campaign.status,
            metrics.cost_micros, metrics.clicks, metrics.impressions,
            metrics.ctr, metrics.average_cpc, metrics.conversions,
            metrics.conversion_value, metrics.cost_per_conversion
            FROM campaign
            WHERE segments.date DURING LAST_30_DAYS AND campaign.status != 'REMOVED'`,
        }),
      },
    );
    if (!searchRes.ok) continue;

    const data = (await searchRes.json()) as { results?: Array<{ campaign: Record<string, unknown>; metrics: Record<string, unknown> }> };
    for (const row of data.results ?? []) {
      const c = row.campaign;
      const m = row.metrics;
      const spend = Number(m["costMicros"] ?? 0) / 1_000_000;
      const clicks = Number(m["clicks"] ?? 0);
      const impressions = Number(m["impressions"] ?? 0);
      const leads = Number(m["conversions"] ?? 0);
      const revenue = Number(m["conversionValue"] ?? 0);
      const statusMap: Record<string, "active" | "paused" | "ended" | "draft"> = { ENABLED: "active", PAUSED: "paused", REMOVED: "ended" };

      await upsertCampaign(userId, String(c["id"]), {
        userId, name: String(c["name"]), platform: "google",
        status: statusMap[String(c["status"])] ?? "active",
        spend, clicks, impressions, leads: Math.round(leads), revenue,
        ctr: Number(m["ctr"] ?? 0) * 100, cpc: Number(m["averageCpc"] ?? 0) / 1_000_000,
        cpa: leads > 0 ? spend / leads : 0, roas: spend > 0 ? revenue / spend : 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        conversionRate: clicks > 0 ? (leads / clicks) * 100 : 0, budget: 0,
      });
    }
  }
}

async function syncMetaAds(userId: string, accessToken: string): Promise<void> {
  const accountsRes = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}`);
  if (!accountsRes.ok) throw new Error("Meta ad accounts fetch failed");

  const accountsData = (await accountsRes.json()) as { data: Array<Record<string, unknown>> };
  for (const account of (accountsData.data ?? []).slice(0, 5)) {
    const accountId = String(account["id"]);
    const campaignsRes = await fetch(
      `https://graph.facebook.com/v18.0/${accountId}/campaigns?` +
        `fields=id,name,status,insights{spend,clicks,impressions,ctr,cpm,actions,action_values}&` +
        `date_preset=last_30d&access_token=${accessToken}`,
    );
    if (!campaignsRes.ok) continue;

    const campaignsData = (await campaignsRes.json()) as { data: Array<Record<string, unknown>> };
    for (const c of campaignsData.data ?? []) {
      const insights = ((c["insights"] as Record<string, unknown>)?.["data"] as Record<string, unknown>[])?.[0] ?? {};
      const actions = (insights["actions"] as Array<Record<string, unknown>>) ?? [];
      const actionValues = (insights["action_values"] as Array<Record<string, unknown>>) ?? [];
      const leads = actions.filter(a => a["action_type"] === "lead" || a["action_type"] === "offsite_conversion.fb_pixel_lead").reduce((s, a) => s + Number(a["value"] ?? 0), 0);
      const revenue = actionValues.reduce((s, a) => s + Number(a["value"] ?? 0), 0);
      const spend = Number(insights["spend"] ?? 0);
      const clicks = Number(insights["clicks"] ?? 0);
      const impressions = Number(insights["impressions"] ?? 0);
      const statusMap: Record<string, "active" | "paused" | "ended" | "draft"> = { ACTIVE: "active", PAUSED: "paused", DELETED: "ended", ARCHIVED: "ended" };

      await upsertCampaign(userId, String(c["id"]), {
        userId, name: String(c["name"]), platform: "meta",
        status: statusMap[String(c["status"])] ?? "active",
        spend, clicks, impressions, leads: Math.round(leads), revenue,
        ctr: Number(insights["ctr"] ?? 0), cpc: clicks > 0 ? spend / clicks : 0,
        cpa: leads > 0 ? spend / leads : 0, roas: spend > 0 ? revenue / spend : 0,
        cpm: Number(insights["cpm"] ?? 0),
        conversionRate: clicks > 0 ? (leads / clicks) * 100 : 0, budget: 0,
      });
    }
  }
}

async function syncLinkedInAds(userId: string, accessToken: string): Promise<void> {
  const accountsRes = await fetch("https://api.linkedin.com/v2/adAccountsV2?q=search&search.type.values[0]=BUSINESS", {
    headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202305" },
  });
  if (!accountsRes.ok) throw new Error("LinkedIn ad accounts fetch failed");

  const accountsData = (await accountsRes.json()) as { elements: Array<Record<string, unknown>> };
  for (const account of (accountsData.elements ?? []).slice(0, 5)) {
    const accountId = String(account["id"]);
    const campaignsRes = await fetch(
      `https://api.linkedin.com/v2/adCampaignsV2?q=search&search.account.values[0]=urn:li:sponsoredAccount:${accountId}`,
      { headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202305" } },
    );
    if (!campaignsRes.ok) continue;

    const campaignsData = (await campaignsRes.json()) as { elements: Array<Record<string, unknown>> };
    for (const c of campaignsData.elements ?? []) {
      const campaignId = String(c["id"]);
      const analyticsRes = await fetch(
        `https://api.linkedin.com/v2/adAnalyticsV2?q=analytics&pivot=CAMPAIGN` +
          `&dateRange.start.day=1&dateRange.start.month=1&dateRange.start.year=${new Date().getFullYear()}` +
          `&campaigns[0]=urn:li:sponsoredCampaign:${campaignId}` +
          `&fields=costInLocalCurrency,clicks,impressions,externalWebsiteConversions`,
        { headers: { Authorization: `Bearer ${accessToken}`, "LinkedIn-Version": "202305" } },
      );
      const analyticsData = analyticsRes.ok ? ((await analyticsRes.json()) as { elements: Array<Record<string, unknown>> }) : { elements: [] };
      const analytics = analyticsData.elements?.[0] ?? {};
      const spend = Number(analytics["costInLocalCurrency"] ?? 0);
      const clicks = Number(analytics["clicks"] ?? 0);
      const impressions = Number(analytics["impressions"] ?? 0);
      const leads = Number(analytics["externalWebsiteConversions"] ?? 0);
      const statusStr = String(((c["status"] as Record<string, unknown>)?.["status"] as string) ?? "ACTIVE");
      const statusMap: Record<string, "active" | "paused" | "ended" | "draft"> = { ACTIVE: "active", PAUSED: "paused", ARCHIVED: "ended", COMPLETED: "ended", DRAFT: "draft" };
      const budget = Number(((c["totalBudget"] as Record<string, unknown>)?.["amount"] as number) ?? 0);

      await upsertCampaign(userId, campaignId, {
        userId, name: String(c["name"]), platform: "linkedin",
        status: statusMap[statusStr] ?? "active",
        spend, clicks, impressions, leads: Math.round(leads), revenue: 0,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
        cpc: clicks > 0 ? spend / clicks : 0,
        cpa: leads > 0 ? spend / leads : 0, roas: 0,
        cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
        conversionRate: clicks > 0 ? (leads / clicks) * 100 : 0, budget,
      });
    }
  }
}

async function syncMicrosoftAds(_userId: string, _accessToken: string): Promise<void> {
  throw new Error("Microsoft Ads sync requires the SOAP API. Use the microsoft-bingads Node SDK for full implementation.");
}

export default router;
