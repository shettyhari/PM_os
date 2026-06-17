import { Router } from "express";

const router = Router();

router.get("/metrics/attribution", async (req, res) => {
  try {
    const model = (req.query.model as string) || "data_driven";

    const models: Record<string, { channels: { channel: string; conversions: number; revenue: number; percentage: number; color: string }[] }> = {
      data_driven: {
        channels: [
          { channel: "Google Search", conversions: 68, revenue: 850000, percentage: 42, color: "#4285F4" },
          { channel: "Meta Retargeting", conversions: 38, revenue: 520000, percentage: 24, color: "#0082FB" },
          { channel: "Google Display", conversions: 22, revenue: 280000, percentage: 14, color: "#34A853" },
          { channel: "LinkedIn Ads", conversions: 18, revenue: 390000, percentage: 11, color: "#0A66C2" },
          { channel: "Microsoft Search", conversions: 14, revenue: 180000, percentage: 9, color: "#00A4EF" },
        ],
      },
      first_click: {
        channels: [
          { channel: "Google Search", conversions: 82, revenue: 1020000, percentage: 51, color: "#4285F4" },
          { channel: "Meta Ads", conversions: 35, revenue: 440000, percentage: 22, color: "#0082FB" },
          { channel: "LinkedIn Ads", conversions: 21, revenue: 450000, percentage: 13, color: "#0A66C2" },
          { channel: "Google Display", conversions: 14, revenue: 180000, percentage: 9, color: "#34A853" },
          { channel: "Microsoft Search", conversions: 8, revenue: 100000, percentage: 5, color: "#00A4EF" },
        ],
      },
      last_click: {
        channels: [
          { channel: "Meta Retargeting", conversions: 58, revenue: 720000, percentage: 36, color: "#0082FB" },
          { channel: "Google Search", conversions: 48, revenue: 620000, percentage: 30, color: "#4285F4" },
          { channel: "LinkedIn Ads", conversions: 26, revenue: 560000, percentage: 16, color: "#0A66C2" },
          { channel: "Google Display", conversions: 18, revenue: 230000, percentage: 11, color: "#34A853" },
          { channel: "Microsoft Search", conversions: 10, revenue: 130000, percentage: 6, color: "#00A4EF" },
        ],
      },
      linear: {
        channels: [
          { channel: "Google Search", conversions: 58, revenue: 720000, percentage: 36, color: "#4285F4" },
          { channel: "Meta Ads", conversions: 42, revenue: 530000, percentage: 26, color: "#0082FB" },
          { channel: "LinkedIn Ads", conversions: 28, revenue: 600000, percentage: 17, color: "#0A66C2" },
          { channel: "Google Display", conversions: 22, revenue: 280000, percentage: 14, color: "#34A853" },
          { channel: "Microsoft Search", conversions: 10, revenue: 130000, percentage: 6, color: "#00A4EF" },
        ],
      },
    };

    const data = models[model] || models.data_driven;
    const totalConversions = data.channels.reduce((s, c) => s + c.conversions, 0);
    const totalRevenue = data.channels.reduce((s, c) => s + c.revenue, 0);

    res.json({ model, channels: data.channels, totalConversions, totalRevenue });
  } catch (err) {
    req.log.error({ err }, "Failed to get attribution");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/metrics/funnel", async (req, res) => {
  try {
    const funnel = [
      { stage: "Impressions", count: 2450000, percentage: 100, dropoff: 0 },
      { stage: "Clicks", count: 48200, percentage: 1.97, dropoff: 98.03 },
      { stage: "Landing Page", count: 38560, percentage: 1.57, dropoff: 0.4 },
      { stage: "Form Start", count: 9640, percentage: 0.39, dropoff: 1.18 },
      { stage: "Leads", count: 4820, percentage: 0.20, dropoff: 0.19 },
      { stage: "MQL", count: 1688, percentage: 0.07, dropoff: 0.13 },
      { stage: "Sales", count: 337, percentage: 0.014, dropoff: 0.056 },
    ];
    res.json(funnel);
  } catch (err) {
    req.log.error({ err }, "Failed to get conversion funnel");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/metrics/forecast", async (req, res) => {
  try {
    const days = parseInt((req.query.days as string) || "30");
    const forecast = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i + 1);
      const noise = 0.9 + Math.random() * 0.2;
      const trend = 1 + (i / days) * 0.08;
      return {
        date: date.toISOString().split("T")[0],
        predictedSpend: Math.round(42500 * noise * trend),
        predictedLeads: Math.round(138 * noise * trend),
        predictedRevenue: Math.round(204000 * noise * trend),
        predictedRoas: Number((4.8 * noise).toFixed(2)),
        confidence: Math.round(85 - i * (15 / days)),
      };
    });
    res.json(forecast);
  } catch (err) {
    req.log.error({ err }, "Failed to get forecast");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
