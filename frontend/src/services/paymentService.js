import axios from 'axios'

// Create isolated axios instance for payment service
const attachToken = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('medico_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )
  instance.interceptors.response.use(
    (res) => res,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('medico_token')
        localStorage.removeItem('medico_user')
        localStorage.removeItem('medico_role')
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )
  return instance
}

const paymentApi = attachToken(
  axios.create({ baseURL: 'http://localhost:3003/api/payments' })
)

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
