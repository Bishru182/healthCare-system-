// services/paymentGateway/payhereService.js
// ─────────────────────────────────────────────
// PayHere gateway placeholder
// Keeps the provider contract stable while implementation is pending.
// ─────────────────────────────────────────────

export const createPayment = async ({ paymentId, appointmentId }) => {
  return {
    gatewaySessionId: `PAYHERE-STUB-${paymentId}`,
    redirectUrl: null,
    rawResponse: {
      provider: 'PAYHERE',
      mode: 'stub',
      paymentId,
      appointmentId,
      message: 'PayHere integration is not implemented yet.',
    },
  };
};

export const verifyPayment = async ({ headers, body }) => {
  return {
    verified: true,
    headers,
    payload: body,
  };
};

export const handleWebhook = async ({ body }) => {
  const status = String(body?.status || '').toUpperCase();

  if (status === 'SUCCESS') {
    return {
      status: 'SUCCESS',
      paymentId: body?.paymentId || null,
      appointmentId: body?.appointmentId || null,
      transactionId: body?.transactionId || null,
      eventType: 'payhere.payment.success',
      gatewayResponse: body,
    };
  }

  if (status === 'FAILED') {
    return {
      status: 'FAILED',
      paymentId: body?.paymentId || null,
      appointmentId: body?.appointmentId || null,
      transactionId: body?.transactionId || null,
      failureReason: body?.reason || 'PayHere payment failed.',
      eventType: 'payhere.payment.failed',
      gatewayResponse: body,
    };
  }

  return {
    status: 'IGNORED',
    eventType: 'payhere.event.ignored',
    gatewayResponse: body,
  };
};

export default {
  createPayment,
  verifyPayment,
  handleWebhook,
};
