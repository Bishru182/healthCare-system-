import axios from 'axios'

const normalizeApiBase = (value, fallback) => {
  const selected = (value || fallback).trim()
  return selected.endsWith('/') ? selected.slice(0, -1) : selected
}

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

const PATIENT_BASE = normalizeApiBase(import.meta.env.VITE_PATIENT_API, '/api/patients')
const APPOINTMENT_BASE = normalizeApiBase(import.meta.env.VITE_APPOINTMENT_API, '/api/appointments')
const PAYMENT_BASE = normalizeApiBase(import.meta.env.VITE_PAYMENT_API, '/api/payments')
const DOCTOR_BASE = normalizeApiBase(import.meta.env.VITE_DOCTOR_API, '/api/doctors')
const TELEMEDICINE_BASE = normalizeApiBase(import.meta.env.VITE_TELEMEDICINE_API, '/api/telemedicine')

export const patientApi = attachToken(axios.create({ baseURL: PATIENT_BASE }))
export const appointmentApi = attachToken(axios.create({ baseURL: APPOINTMENT_BASE }))
export const paymentApi = attachToken(axios.create({ baseURL: PAYMENT_BASE }))
export const doctorApi = attachToken(axios.create({ baseURL: DOCTOR_BASE }))
export const telemedicineApi = attachToken(axios.create({ baseURL: TELEMEDICINE_BASE }))
