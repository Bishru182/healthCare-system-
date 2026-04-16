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

// Base URLs – override per environment. Default to direct localhost ports (docker-compose).
const PATIENT_BASE       = import.meta.env.VITE_PATIENT_API       || 'http://localhost:3001/api/patients'
const APPOINTMENT_BASE   = import.meta.env.VITE_APPOINTMENT_API   || 'http://localhost:3002/api/appointments'
const PAYMENT_BASE       = import.meta.env.VITE_PAYMENT_API       || 'http://localhost:3003/api/payments'
const DOCTOR_BASE        = import.meta.env.VITE_DOCTOR_API        || 'http://localhost:3004/api/doctors'
const TELEMEDICINE_BASE  = import.meta.env.VITE_TELEMEDICINE_API  || 'http://localhost:3005/api/telemedicine'

export const patientApi = attachToken(axios.create({ baseURL: PATIENT_BASE }))
export const appointmentApi = attachToken(axios.create({ baseURL: APPOINTMENT_BASE }))
export const paymentApi = attachToken(axios.create({ baseURL: PAYMENT_BASE }))
export const doctorApi = attachToken(axios.create({ baseURL: DOCTOR_BASE }))
export const telemedicineApi = attachToken(axios.create({ baseURL: TELEMEDICINE_BASE }))
