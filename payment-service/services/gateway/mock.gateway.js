// services/gateway/mock.gateway.js
// ─────────────────────────────────────────────
// Mock Payment Gateway
// Simulates a real payment provider for dev/test environments.
// Replace with Stripe or PayHere adapters as needed.
// ─────────────────────────────────────────────

import { v4 as uuidv4 } from 'uuid';

/**
 * Simulate charging a payment.
 * In a real integration this would call Stripe/PayHere APIs.
 *
 * @param {{ amount: number, currency: string, method: string }} payload
 * @returns {{ success: boolean, transactionId: string, gatewayRef: string }}
 */
export const chargePayment = async ({ amount, currency, method }) => {
  // Simulate network latency (50–150 ms)
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));

  // Simulate a 5 % random gateway failure (useful for testing failure paths)
  if (Math.random() < 0.05) {
    throw new Error('Mock gateway: transient failure – please retry');
  }

  const transactionId = `MOCK-TXN-${uuidv4().toUpperCase()}`;
  const gatewayRef    = `MOCK-REF-${Date.now()}`;

  console.log(
    `🔒  Mock gateway charged ${currency} ${amount} via ${method} → txn: ${transactionId}`
  );

  return { success: true, transactionId, gatewayRef };
};

/**
 * Simulate refunding a payment.
 *
 * @param {string} transactionId
 * @returns {{ success: boolean, refundId: string }}
 */
export const refundPayment = async (transactionId) => {
  await new Promise((r) => setTimeout(r, 50));

  const refundId = `MOCK-RFD-${uuidv4().toUpperCase()}`;
  console.log(`↩️   Mock gateway refunded txn ${transactionId} → refund: ${refundId}`);

  return { success: true, refundId };
};
