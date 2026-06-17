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
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const userId = req.user!.id;
    const { geminiApiKey } = req.body as { geminiApiKey?: string };

    await db
      .insert(userSettingsTable)
      .values({ userId, geminiApiKey: geminiApiKey ?? null })
      .onConflictDoUpdate({
        target: userSettingsTable.userId,
        set: {
          geminiApiKey: geminiApiKey ?? null,
          updatedAt: new Date(),
        },
      });

    res.json({ success: true, geminiApiKeySet: !!geminiApiKey });
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
