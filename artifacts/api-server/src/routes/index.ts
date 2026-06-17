import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/require-auth";
import healthRouter from "./health";
import authRouter from "./auth";
import oauthRouter from "./oauth";
import dashboardRouter from "./dashboard";
import campaignsRouter from "./campaigns";
import metricsRouter from "./metrics";
import aiRouter from "./ai";
import crmRouter from "./crm";
import alertsRouter from "./alerts";
import integrationsRouter from "./integrations";
import reportsRouter from "./reports";
import usersRouter from "./users";

const router: IRouter = Router();

// Public routes (no auth required)
router.use(healthRouter);
router.use(authRouter);
router.use(oauthRouter); // OAuth callback is public; individual routes self-protect

// Protected routes
router.use(requireAuth);
router.use(dashboardRouter);
router.use(campaignsRouter);
router.use(metricsRouter);
router.use(aiRouter);
router.use(crmRouter);
router.use(alertsRouter);
router.use(integrationsRouter);
router.use(reportsRouter);
router.use(usersRouter);

export default router;
