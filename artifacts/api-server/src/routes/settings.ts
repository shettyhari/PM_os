import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/settings", async (req, res) => {
  try {
    const userId = req.user!.id;
    const [row] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId));

    res.json({
      geminiApiKeySet: !!row?.geminiApiKey,
      googleClientIdSet: !!(row?.googleClientId || process.env["GOOGLE_CLIENT_ID"]),
      googleClientSecretSet: !!(row?.googleClientSecret || process.env["GOOGLE_CLIENT_SECRET"]),
      metaAppIdSet: !!(row?.metaAppId || process.env["META_APP_ID"]),
      metaAppSecretSet: !!(row?.metaAppSecret || process.env["META_APP_SECRET"]),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const userId = req.user!.id;
    const {
      geminiApiKey,
      googleClientId,
      googleClientSecret,
      metaAppId,
      metaAppSecret,
    } = req.body as {
      geminiApiKey?: string | null;
      googleClientId?: string | null;
      googleClientSecret?: string | null;
      metaAppId?: string | null;
      metaAppSecret?: string | null;
    };

    const [existing] = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId));

    const values = {
      geminiApiKey: geminiApiKey !== undefined ? (geminiApiKey || null) : existing?.geminiApiKey,
      googleClientId: googleClientId !== undefined ? (googleClientId || null) : existing?.googleClientId,
      googleClientSecret: googleClientSecret !== undefined ? (googleClientSecret || null) : existing?.googleClientSecret,
      metaAppId: metaAppId !== undefined ? (metaAppId || null) : existing?.metaAppId,
      metaAppSecret: metaAppSecret !== undefined ? (metaAppSecret || null) : existing?.metaAppSecret,
      updatedAt: new Date(),
    };

    await db
      .insert(userSettingsTable)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: userSettingsTable.userId,
        set: values,
      });

    res.json({
      success: true,
      geminiApiKeySet: !!(values.geminiApiKey),
      googleClientIdSet: !!(values.googleClientId || process.env["GOOGLE_CLIENT_ID"]),
      metaAppIdSet: !!(values.metaAppId || process.env["META_APP_ID"]),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
