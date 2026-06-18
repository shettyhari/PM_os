/**
 * Windsor.ai API Service
 * Real endpoint: https://connectors.windsor.ai/all?api_key=KEY&date_preset=PRESET&fields=...
 * Confirmed working fields: source, campaign, spend, clicks, impressions, ctr, cpc, conversions, leads, date, account_name
 */

const WINDSOR_BASE = "https://connectors.windsor.ai/all";

export interface WindsorDataRow {
  source?: string;
  campaign?: string;
  account_name?: string;
  date?: string;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  ctr?: number | null;
  cpc?: number | null;
  conversions?: number | null;
  leads?: number | null;
  // Normalized fields added by our mapper
  connector?: string;
  campaign_name?: string;
  [key: string]: unknown;
}

export interface WindsorDataResponse {
  data: WindsorDataRow[];
  error?: string;
}

export const WINDSOR_CONNECTORS = [
  { id: "facebook", name: "Meta Ads", icon: "meta" },
  { id: "google", name: "Google Ads", icon: "google" },
  { id: "linkedin", name: "LinkedIn Ads", icon: "linkedin" },
  { id: "microsoft", name: "Microsoft Ads", icon: "microsoft" },
  { id: "tiktok", name: "TikTok Ads", icon: "tiktok" },
];

/** Map Windsor source strings to our internal connector names */
export function normalizeSource(source: string): string {
  const map: Record<string, string> = {
    facebook: "facebook",
    facebook_ads: "facebook",
    instagram: "facebook",
    google: "google",
    google_ads: "google",
    linkedin: "linkedin",
    linkedin_ads: "linkedin",
    bing: "microsoft",
    microsoft: "microsoft",
    microsoft_ads: "microsoft",
    tiktok: "tiktok",
    tiktok_ads: "tiktok",
  };
  return map[source.toLowerCase()] ?? source.toLowerCase();
}

/** Map our connector name to a display name */
export function connectorDisplayName(connector: string): string {
  const map: Record<string, string> = {
    facebook: "Meta Ads",
    google: "Google Ads",
    linkedin: "LinkedIn Ads",
    microsoft: "Microsoft Ads",
    tiktok: "TikTok Ads",
  };
  return map[connector] ?? connector;
}

function buildWindsorUrl(apiKey: string, fields: string, datePreset: string): string {
  const url = new URL(WINDSOR_BASE);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("date_preset", datePreset);
  url.searchParams.set("fields", fields);
  return url.toString();
}

function daysToPreset(days: number): string {
  if (days <= 7) return "last_7d";
  if (days <= 14) return "last_14d";
  if (days <= 30) return "last_30d";
  if (days <= 90) return "last_90d";
  return "last_30d";
}

/**
 * Validate a Windsor API key by making a lightweight request
 */
export async function validateWindsorKey(apiKey: string): Promise<{ valid: boolean; error?: string; sources?: string[] }> {
  try {
    const url = buildWindsorUrl(apiKey.trim(), "source,spend", "last_7d");
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    const json = (await res.json()) as { data?: WindsorDataRow[]; error?: string; message?: string };

    if (json.error?.toLowerCase().includes("api key") || json.message?.toLowerCase().includes("api key")) {
      return { valid: false, error: "Invalid API key — check your Windsor.ai account" };
    }

    if (json.message && !json.data) {
      return { valid: false, error: json.message };
    }

    const sources = [...new Set((json.data ?? []).map((r) => normalizeSource(String(r.source ?? ""))))].filter(Boolean);
    return { valid: true, sources };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Connection failed: ${msg}` };
  }
}

/**
 * Fetch all campaign data from Windsor for the given date range
 */
export async function fetchWindsorData(
  apiKey: string,
  _connector: string,
  days = 30,
  _limit = 5000,
): Promise<WindsorDataResponse> {
  const fields = "source,campaign,account_name,spend,impressions,clicks,ctr,cpc,conversions,leads,date";
  const datePreset = daysToPreset(days);
  const url = buildWindsorUrl(apiKey, fields, datePreset);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { data: [], error: `Windsor returned ${res.status}: ${text.slice(0, 200)}` };
  }

  const json = (await res.json()) as { data?: WindsorDataRow[]; error?: string; message?: string };

  if (json.error || (json.message && !json.data)) {
    return { data: [], error: json.error ?? json.message };
  }

  // Normalize field names so the rest of the app works consistently
  const rows = (json.data ?? []).map((r) => ({
    ...r,
    connector: normalizeSource(String(r.source ?? "")),
    campaign_name: String(r.campaign ?? "Unknown Campaign"),
    account_name: String(r.account_name ?? ""),
    spend: Number(r.spend ?? 0),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    ctr: Number(r.ctr ?? 0),
    cpc: Number(r.cpc ?? 0),
    conversions: r.conversions != null ? Number(r.conversions) : 0,
    leads: r.leads != null ? Number(r.leads) : 0,
  }));

  return { data: rows };
}

/**
 * Fetch just account names to see what's connected
 */
export async function fetchWindsorAccounts(
  apiKey: string,
): Promise<{ source: string; account_name: string; spend: number }[]> {
  const url = buildWindsorUrl(apiKey, "source,account_name,spend", "last_7d");
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: { source?: string; account_name?: string; spend?: number }[] };
  return (json.data ?? []).map((r) => ({
    source: normalizeSource(String(r.source ?? "")),
    account_name: String(r.account_name ?? ""),
    spend: Number(r.spend ?? 0),
  }));
}
