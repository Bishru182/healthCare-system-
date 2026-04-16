import { appointmentApi } from './api'

export const appointmentService = {
  create: (data) => appointmentApi.post('/', data),
  deleteById: (id) => appointmentApi.delete(`/${id}`),
  getByPatient: async (patientId) => {
    const res = await appointmentApi.get(`/patient/${patientId}`)
    return res.data?.appointments || []
  },
  getById: (id) => appointmentApi.get(`/${id}`),
  updateById: (id, data) => appointmentApi.put(`/${id}`, data),
}
