import axios from 'axios'

// ── Intercept every request and attach JWT ──
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
  // Global 401 handler — clear storage and go to login
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

export const patientApi = attachToken(
  axios.create({ baseURL: 'http://localhost:3002/api/patients' })
)

export const appointmentApi = attachToken(
  axios.create({ baseURL: 'http://localhost:3001/api/appointments' })
)

export const paymentApi = attachToken(
  axios.create({ baseURL: 'http://localhost:3003/api/payments' })
)
