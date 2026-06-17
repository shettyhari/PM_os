import { Router, type IRouter } from "express";
import healthRouter from "./health";
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

router.use(healthRouter);
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
