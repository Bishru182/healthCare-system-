// services/paymentGateway/stripeService.js
// ─────────────────────────────────────────────
// Stripe gateway implementation (test mode only)
// ─────────────────────────────────────────────

import Stripe from 'stripe';
import paymentConfig from '../../config/payment.js';

let stripeClient = null;

const isSandboxMode = () =>
  paymentConfig.stripe.sandboxMode || !paymentConfig.stripe.secretKey;

const appendQueryParams = (baseUrl, params) => {
  const separator = baseUrl.includes('?') ? '&' : '?';
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  return `${baseUrl}${query ? `${separator}${query}` : ''}`;
};

const parseRawBodyJson = (rawBody) => {
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch (_error) {
    return null;
  }
};

const buildSandboxEvent = ({ body, rawBody }) => {
  const payload = body && Object.keys(body).length ? body : parseRawBodyJson(rawBody) || {};
  const status = String(payload?.status || '').toUpperCase();
  const eventType =
    payload?.eventType ||
    payload?.type ||
    (status === 'SUCCESS'
      ? 'checkout.session.completed'
      : status === 'FAILED'
        ? 'payment_intent.payment_failed'
        : 'sandbox.event.ignored');

  const metadata = {
    paymentId: payload?.paymentId || payload?.metadata?.paymentId || null,
    appointmentId: payload?.appointmentId || payload?.metadata?.appointmentId || null,
  };

  if (eventType === 'checkout.session.completed') {
    return {
      type: eventType,
      data: {
        object: {
          id:
            payload?.gatewaySessionId ||
            payload?.sessionId ||
            `cs_test_sandbox_${Date.now()}`,
          payment_intent:
            payload?.transactionId ||
            payload?.paymentIntentId ||
            `pi_test_sandbox_${Date.now()}`,
          metadata,
        },
      },
    };
  }

  if (eventType === 'payment_intent.payment_failed') {
    return {
      type: eventType,
      data: {
        object: {
          id:
            payload?.transactionId ||
            payload?.paymentIntentId ||
            `pi_test_failed_${Date.now()}`,
          metadata,
          last_payment_error: {
            message: payload?.reason || 'Sandbox Stripe payment failed.',
          },
        },
      },
    };
  }

  return {
    type: eventType,
    data: {
      object: payload,
    },
  };
};

const getStripeClient = () => {
  if (!stripeClient) {
    const secretKey = paymentConfig.stripe.secretKey;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured.');
    }

    // Guardrail: this integration is intentionally test-mode only.
    if (!secretKey.startsWith('sk_test_')) {
      throw new Error('Stripe integration requires a test key (sk_test_*).');
    }

    stripeClient = new Stripe(secretKey);
  }

  return stripeClient;
};

export const createPayment = async ({
  paymentId,
  appointmentId,
  amount,
  currency,
  successUrl,
  cancelUrl,
}) => {
  if (isSandboxMode()) {
    const sandboxSessionId = `cs_test_sandbox_${Date.now()}_${paymentId}`;
    const sandboxRedirectUrl = appendQueryParams(successUrl, {
      sandbox: true,
      provider: 'STRIPE',
      paymentId,
      appointmentId,
      sessionId: sandboxSessionId,
    });

    return {
      gatewaySessionId: sandboxSessionId,
      redirectUrl: sandboxRedirectUrl,
      rawResponse: {
        mode: 'sandbox',
        provider: 'STRIPE',
        sessionId: sandboxSessionId,
        paymentId,
        appointmentId,
        amount,
        currency,
        successUrl,
        cancelUrl,
      },
    };
  }

  const stripe = getStripeClient();

  const lineAmount = Math.round(Number(amount) * 100);
  if (!Number.isFinite(lineAmount) || lineAmount <= 0) {
    throw new Error('Invalid amount for Stripe checkout session.');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: String(currency || 'USD').toLowerCase(),
          product_data: {
            name: `Appointment Payment (${appointmentId})`,
          },
          unit_amount: lineAmount,
        },
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      paymentId,
      appointmentId,
    },
    payment_intent_data: {
      metadata: {
        paymentId,
        appointmentId,
      },
    },
  });

  return {
    gatewaySessionId: session.id,
    redirectUrl: session.url || null,
    rawResponse: session,
  };
};

export const verifyPayment = async ({ headers, rawBody, body }) => {
  if (isSandboxMode()) {
    return buildSandboxEvent({ rawBody, body });
  }

  const stripe = getStripeClient();
  const signature = headers['stripe-signature'];

  if (!signature) {
    throw new Error('Missing Stripe-Signature header.');
  }

  if (!paymentConfig.stripe.webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
  }

  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    paymentConfig.stripe.webhookSecret
  );
};

export const handleWebhook = async ({ headers, rawBody, body }) => {
  const event = await verifyPayment({ headers, rawBody, body });

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    return {
      status: 'SUCCESS',
      paymentId: session?.metadata?.paymentId || null,
      appointmentId: session?.metadata?.appointmentId || null,
      transactionId: session?.payment_intent
        ? String(session.payment_intent)
        : null,
      gatewaySessionId: session?.id || null,
      eventType: event.type,
      gatewayResponse: event,
    };
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;

    return {
      status: 'FAILED',
      paymentId: intent?.metadata?.paymentId || null,
      appointmentId: intent?.metadata?.appointmentId || null,
      transactionId: intent?.id || null,
      failureReason:
        intent?.last_payment_error?.message || 'Stripe payment failed.',
      eventType: event.type,
      gatewayResponse: event,
    };
  }

  return {
    status: 'IGNORED',
    eventType: event.type,
    gatewayResponse: event,
  };
};

export default {
  createPayment,
  verifyPayment,
  handleWebhook,
};
