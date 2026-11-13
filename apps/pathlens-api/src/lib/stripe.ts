import Stripe from "stripe";

function requiredStripeEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export const stripe = new Stripe(requiredStripeEnv("STRIPE_SECRET_KEY"), {
  maxNetworkRetries: 0,
  timeout: 15_000,
});
