import { patientApi } from './api'

export const authService = {
  register: (data) => patientApi.post('/register', data),
  login: (data) => patientApi.post('/login', data),
}

export const patientService = {
  getProfile: () => patientApi.get('/me'),
  updateProfile: (data) => patientApi.put('/me', data),
  deleteAccount: () => patientApi.delete('/me'),

  // Reports
  uploadReport: (formData) =>
    patientApi.post('/reports', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getReports: () => patientApi.get('/reports'),
  deleteReport: (id) => patientApi.delete(`/reports/${id}`),

  // Records
  getHistory: () => patientApi.get('/history'),
  getPrescriptions: () => patientApi.get('/prescriptions'),
}
