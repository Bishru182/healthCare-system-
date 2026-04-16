import { telemedicineApi } from './api'

export const telemedicineService = {
  createSession: (appointmentId) =>
    telemedicineApi.post('/sessions', { appointmentId }),
  listMine: () => telemedicineApi.get('/sessions/mine'),
  getById: (id) => telemedicineApi.get(`/sessions/${id}`),
  getByAppointment: (appointmentId) =>
    telemedicineApi.get(`/sessions/appointment/${appointmentId}`),
  getJoinInfo: (id) => telemedicineApi.get(`/sessions/${id}/join-info`),
  start: (id) => telemedicineApi.put(`/sessions/${id}/start`),
  end: (id, notes) => telemedicineApi.put(`/sessions/${id}/end`, { notes }),
}
