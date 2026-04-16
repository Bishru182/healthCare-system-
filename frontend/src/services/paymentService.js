import { paymentApi } from './api'

export const paymentService = {
  /**
   * Create a new payment for an appointment
   * @param {string} appointmentId - The appointment ID
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency code (default: USD)
   * @param {string} paymentMethod - Payment method (default: credit_card)
   * @returns {Promise}
   */
  create: async (appointmentId, amount, currency = 'USD', paymentMethod = 'credit_card') => {
    const res = await paymentApi.post('/create', {
      appointmentId,
      amount,
      currency,
      paymentMethod,
    })
    return res.data.data
  },

  /**
   * Initiate online payment checkout via gateway provider
   * @param {string} appointmentId - The appointment ID
   * @param {string} provider - Gateway provider (default: STRIPE)
   * @returns {Promise<{paymentId: string, redirectUrl: string | null}>}
   */
  initiateOnline: async (appointmentId, provider = 'STRIPE') => {
    const res = await paymentApi.post('/initiate-online', {
      appointmentId,
      provider,
    })
    return res.data
  },

  /**
   * Get all payments for the current patient
   * @param {string} patientId - The patient ID
   * @returns {Promise}
   */
  getByPatient: async (patientId) => {
    const res = await paymentApi.get(`/patient/${patientId}`)
    return res.data.data
  },

  /**
   * Get all payments (admin only)
   * @returns {Promise}
   */
  getAll: async () => {
    const res = await paymentApi.get('/')
    return res.data.data
  },

  /**
   * Get a single payment by ID
   * @param {string} paymentId - The payment ID
   * @returns {Promise}
   */
  getById: async (paymentId) => {
    const res = await paymentApi.get(`/${paymentId}`)
    return res.data.data
  },

  /**
   * Confirm a pending payment (simulate successful payment)
   * @param {string} paymentId - The payment ID
   * @returns {Promise}
   */
  confirm: async (paymentId) => {
    const res = await paymentApi.post('/confirm', { paymentId })
    return res.data.data
  },

  /**
   * Fail a pending payment
   * @param {string} paymentId - The payment ID
   * @param {string} reason - Optional reason for failure
   * @returns {Promise}
   */
  fail: async (paymentId, reason = '') => {
    const res = await paymentApi.post('/fail', { paymentId, reason })
    return res.data.data
  },
}
