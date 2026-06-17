import { Router } from "express";

const router = Router();

router.get("/users/me", async (req, res) => {
  try {
    res.json({
      id: 1,
      name: "Arjun Sharma",
      email: "arjun@performanceos.ai",
      role: "admin",
      organization: "PerformanceOS AI",
      avatarUrl: null,
      theme: "dark",
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get current user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
