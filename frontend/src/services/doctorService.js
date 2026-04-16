import { doctorApi } from './api'

export const doctorAuthService = {
  register: (data) => doctorApi.post('/register', data),
  login: (data) => doctorApi.post('/login', data),
}

export const doctorService = {
  // Public
  listAll: (params = {}) => doctorApi.get('/', { params }),
  getSpecialties: () => doctorApi.get('/specialties'),
  getById: (id) => doctorApi.get(`/${id}`),
  getAvailabilityByDoctor: (id) => doctorApi.get(`/${id}/availability`),

  // Self
  getMe: () => doctorApi.get('/me'),
  updateMe: (data) => doctorApi.put('/me', data),

  // Availability
  listMyAvailability: () => doctorApi.get('/availability/mine'),
  addSlot: (data) => doctorApi.post('/availability', data),
  updateSlot: (id, data) => doctorApi.put(`/availability/${id}`, data),
  deleteSlot: (id) => doctorApi.delete(`/availability/${id}`),

  // Prescriptions
  createPrescription: (data) => doctorApi.post('/prescriptions', data),
  listMyPrescriptions: () => doctorApi.get('/prescriptions/mine'),
  getPatientPrescriptions: (patientId) =>
    doctorApi.get(`/prescriptions/patient/${patientId}`),

  // Appointments
  listMyAppointments: (params = {}) =>
    doctorApi.get('/appointments/mine', { params }),
  acceptAppointment: (id) => doctorApi.put(`/appointments/${id}/accept`),
  rejectAppointment: (id) => doctorApi.put(`/appointments/${id}/reject`),
  completeAppointment: (id) => doctorApi.put(`/appointments/${id}/complete`),
}
