/**
 * Windsor.ai API Service
 * Fetches marketing data from Windsor.ai and stores in PostgreSQL
 * Windsor API docs: https://windsor.ai/api-fields/
 */

const WINDSOR_BASE = "https://connectors.windsor.ai/api/v1";

export interface WindsorDataRow {
  date?: string;
  connector?: string;
  account_id?: string;
  account_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  status?: string;
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  cpm?: number;
  conversions?: number;
  conversion_value?: number;
  roas?: number;
  cpa?: number;
  reach?: number;
  frequency?: number;
  leads?: number;
  revenue?: number;
  [key: string]: unknown;
}

export interface WindsorDataResponse {
  data: WindsorDataRow[];
  error?: string;
}

export const WINDSOR_CONNECTORS = [
  { id: "facebook_ads", name: "Meta Ads", icon: "meta" },
  { id: "google_ads", name: "Google Ads", icon: "google" },
  { id: "linkedin_ads", name: "LinkedIn Ads", icon: "linkedin" },
  { id: "microsoft_ads", name: "Microsoft Ads", icon: "microsoft" },
  { id: "google_analytics_4", name: "Google Analytics 4", icon: "ga4" },
  { id: "tiktok_ads", name: "TikTok Ads", icon: "tiktok" },
  { id: "google_search_console", name: "Search Console", icon: "gsc" },
];

const CAMPAIGN_FIELDS = [
  "date",
  "connector",
  "account_id",
  "account_name",
  "campaign_id",
  "campaign_name",
  "status",
  "spend",
  "impressions",
  "clicks",
  "ctr",
  "cpc",
  "cpm",
  "conversions",
  "conversion_value",
  "roas",
  "cpa",
  "reach",
  "leads",
  "revenue",
].join(",");

function getDateRange(days = 30): { dateFrom: string; dateTo: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    dateFrom: from.toISOString().split("T")[0]!,
    dateTo: to.toISOString().split("T")[0]!,
  };
}

/**
 * Validate a Windsor API key by making a lightweight request
 */
export async function validateWindsorKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const { dateFrom, dateTo } = getDateRange(7);
    const url = `${WINDSOR_BASE}/${encodeURIComponent(apiKey)}?connector=facebook_ads&fields=date,spend&date_from=${dateFrom}&date_to=${dateTo}&_limit=1`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (res.status === 401 || res.status === 403) {
      return { valid: false, error: "Invalid API key" };
    }

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      if (text.toLowerCase().includes("invalid") || text.toLowerCase().includes("unauthorized")) {
        return { valid: false, error: "Invalid API key" };
      }
    }

    return { valid: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { valid: false, error: `Connection failed: ${msg}` };
  }
}

/**
 * Fetch data from Windsor for a specific connector and date range
 */
export async function fetchWindsorData(
  apiKey: string,
  connector: string,
  days = 30,
  limit = 5000,
): Promise<WindsorDataResponse> {
  const { dateFrom, dateTo } = getDateRange(days);
  const url = `${WINDSOR_BASE}/${encodeURIComponent(apiKey)}?connector=${connector}&fields=${CAMPAIGN_FIELDS}&date_from=${dateFrom}&date_to=${dateTo}&_limit=${limit}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { data: [], error: `Windsor returned ${res.status}: ${text.slice(0, 200)}` };
  }

  const json = (await res.json()) as { data?: WindsorDataRow[] } | WindsorDataRow[];
  const rows = Array.isArray(json) ? json : (json as { data?: WindsorDataRow[] }).data ?? [];
  return { data: rows };
}

/**
 * Fetch aggregated summary across all connectors
 */
export async function fetchWindsorSummary(
  apiKey: string,
  days = 7,
): Promise<{ connector: string; spend: number; clicks: number; impressions: number; conversions: number; revenue: number; roas: number }[]> {
  const results: { connector: string; spend: number; clicks: number; impressions: number; conversions: number; revenue: number; roas: number }[] = [];

  for (const conn of WINDSOR_CONNECTORS.slice(0, 4)) {
    try {
      const { data } = await fetchWindsorData(apiKey, conn.id, days, 1000);
      if (data.length === 0) continue;

      const spend = data.reduce((s, r) => s + Number(r.spend ?? 0), 0);
      const clicks = data.reduce((s, r) => s + Number(r.clicks ?? 0), 0);
      const impressions = data.reduce((s, r) => s + Number(r.impressions ?? 0), 0);
      const conversions = data.reduce((s, r) => s + Number(r.conversions ?? 0), 0);
      const revenue = data.reduce((s, r) => s + Number(r.revenue ?? r.conversion_value ?? 0), 0);

      results.push({
        connector: conn.id,
        spend,
        clicks,
        impressions,
        conversions,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
      });
    } catch {
      // skip failed connectors
    }
  }

  return results;
}
