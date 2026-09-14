import type { Request, Response } from "express";
import Stripe from "stripe";
import type { AuthRequest } from "../lib/jwt";
import {
  getAccountEntitlement,
  grantAccountLifetimeEntitlement,
} from "../models/billing.model";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is missing");
  return new Stripe(key);
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing`);
  return value;
}

export async function createLifetimeCheckoutSession(
  req: AuthRequest,
  res: Response
) {
  const user = req.user;
  if (!user?.id || !user.email) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const priceId = getRequiredEnv("STRIPE_LIFETIME_PRICE_ID");
    const frontendUrl = getRequiredEnv("FRONTEND_URL").replace(/\/$/, "");
    const account = await getAccountEntitlement(user.id);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    if (account.lifetimeAccess) {
      return res.status(409).json({
        success: false,
        message: "This account already has lifetime access.",
      });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: priceId, quantity: 1 }],
      billing_address_collection: "required",
      customer: account.stripeCustomerId ?? undefined,
      customer_email: account.stripeCustomerId ? undefined : user.email,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        price_id: priceId,
      },
      success_url: `${frontendUrl}/checkout?checkout=success`,
      cancel_url: `${frontendUrl}/checkout?checkout=cancelled`,
    });

    return res.status(201).json({
      success: true,
      data: { checkout_url: session.url, session_id: session.id },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message:
        error instanceof Error ? error.message : "Unable to start checkout.",
    });
  }
}

export async function getEntitlement(req: AuthRequest, res: Response) {
  if (!req.user?.id) {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  try {
    const entitlement = await getAccountEntitlement(req.user.id);
    if (!entitlement) {
      return res.status(404).json({
        success: false,
        message: "Account not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user_id: entitlement.id,
        lifetime_access: entitlement.lifetimeAccess,
        stripe_customer_id: entitlement.stripeCustomerId,
        stripe_payment_id: entitlement.stripePaymentId,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Unable to load entitlement.",
    });
  }
}

export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (typeof signature !== "string" || !secret) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid webhook request." });
  }

  try {
    const event = getStripe().webhooks.constructEvent(
      req.body,
      signature,
      secret
    );

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object as Stripe.Checkout.Session;
      const priceId = session.metadata?.price_id;
      const userId = session.metadata?.user_id;

      if (
        session.mode === "payment" &&
        session.payment_status === "paid" &&
        priceId === process.env.STRIPE_LIFETIME_PRICE_ID &&
        userId
      ) {
        const customerId =
          typeof session.customer === "string" ? session.customer : null;
        const paymentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

        // The update is safe to repeat when Stripe retries the same event.
        await grantAccountLifetimeEntitlement({
          userId,
          stripeCustomerId: customerId,
          stripePaymentId: paymentId,
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: "Webhook signature verification failed.",
    });
  }
}
