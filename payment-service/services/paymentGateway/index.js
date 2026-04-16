// services/paymentGateway/index.js
// ─────────────────────────────────────────────
// Gateway Factory for online providers
// ─────────────────────────────────────────────

import stripeService from './stripeService.js';
import payhereService from './payhereService.js';

const providers = Object.freeze({
  STRIPE: stripeService,
  PAYHERE: payhereService,
});

export const normalizeProvider = (provider = '') =>
  String(provider).trim().toUpperCase();

const getPaymentGateway = (provider) => {
  const normalizedProvider = normalizeProvider(provider);
  const gateway = providers[normalizedProvider];

  if (!gateway) {
    throw new Error(`Unsupported payment gateway provider: ${provider}`);
  }

  return gateway;
};

export default getPaymentGateway;
