import { Router } from "express";
import {
  createLifetimeCheckoutSession,
  getEntitlement,
  handleStripeWebhook,
} from "../controllers/billing.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { createBillingInvoice } from "../controllers/billing-invoice.controller";

const router = Router();

router.post("/webhook", handleStripeWebhook);

router.use(authMiddleware);
router.post("/lifetime/checkout", createLifetimeCheckoutSession);
router.get("/entitlement", getEntitlement);
router.post("/invoice", createBillingInvoice);

export default router;
