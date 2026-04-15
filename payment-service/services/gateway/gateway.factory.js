// services/gateway/gateway.factory.js
// ─────────────────────────────────────────────
// Gateway Factory
// Returns the correct payment gateway adapter based on
// the PAYMENT_PROVIDER environment variable.
// ─────────────────────────────────────────────

import * as mockGateway from './mock.gateway.js';
import { PAYMENT_PROVIDER } from '../../config/constants.js';

/**
 * Returns the active gateway adapter.
 * Extend this to add Stripe / PayHere adapters.
 */
const getGateway = () => {
  const provider = (process.env.PAYMENT_PROVIDER || PAYMENT_PROVIDER.MOCK).toLowerCase();

  switch (provider) {
    case PAYMENT_PROVIDER.STRIPE:
      // TODO: import and return stripe.gateway.js when implementing live Stripe
      console.warn('⚠️  Stripe gateway not yet implemented – falling back to mock');
      return mockGateway;

    case PAYMENT_PROVIDER.PAYHERE:
      // TODO: import and return payhere.gateway.js
      console.warn('⚠️  PayHere gateway not yet implemented – falling back to mock');
      return mockGateway;

    case PAYMENT_PROVIDER.MOCK:
    default:
      return mockGateway;
  }
};

export default getGateway;
