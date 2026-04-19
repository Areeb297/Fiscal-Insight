import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectionsRouter from "./projections";
import employeesRouter from "./employees";
import subscriptionsRouter from "./subscriptions";
import salesSupportRouter from "./salesSupport";
import vendorSetupFeesRouter from "./vendorSetupFees";
import infrastructureCostsRouter from "./infrastructureCosts";
import quotationsRouter from "./quotations";
import adminRouter from "./admin";
import dashboardRouter from "./dashboard";
import authRouter from "./auth";
import invoicesRouter from "./invoices";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectionsRouter);
router.use(employeesRouter);
router.use(subscriptionsRouter);
router.use(salesSupportRouter);
router.use(vendorSetupFeesRouter);
router.use(infrastructureCostsRouter);
router.use(quotationsRouter);
router.use(adminRouter);
router.use(dashboardRouter);
router.use(authRouter);
router.use(invoicesRouter);

export default router;
