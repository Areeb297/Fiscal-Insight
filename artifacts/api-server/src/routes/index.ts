import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectionsRouter from "./projections";
import employeesRouter from "./employees";
import subscriptionsRouter from "./subscriptions";
import salesSupportRouter from "./salesSupport";
import quotationsRouter from "./quotations";
import adminRouter from "./admin";
import chatRouter from "./chat";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectionsRouter);
router.use(employeesRouter);
router.use(subscriptionsRouter);
router.use(salesSupportRouter);
router.use(quotationsRouter);
router.use(adminRouter);
router.use(chatRouter);
router.use(dashboardRouter);

export default router;
