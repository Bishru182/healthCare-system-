import { appointmentApi } from './api'

export const appointmentService = {
  create: (data) => appointmentApi.post('/', data),
  deleteById: (id) => appointmentApi.delete(`/${id}`),
  getById: (id) => appointmentApi.get(`/${id}`),
  updateById: (id, data) => appointmentApi.put(`/${id}`, data),
}
