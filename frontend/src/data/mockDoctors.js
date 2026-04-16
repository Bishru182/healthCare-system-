// Mock doctors — used until Doctor Service is integrated
// doctorId values are valid 24-char hex MongoDB ObjectIds

const mockDoctors = [
  {
    id: '6612ab34cd56ef7890ab1234',
    name: 'Dr. Sarah Perera',
    specialty: 'Cardiologist',
    experience: '12 years',
    rating: 4.9,
    avatar: 'SP',
  },
  {
    id: '6612ab34cd56ef7890ab5678',
    name: 'Dr. Nimal Silva',
    specialty: 'Dermatologist',
    experience: '8 years',
    rating: 4.7,
    avatar: 'NS',
  },
  {
    id: '6612ab34cd56ef7890ab9999',
    name: 'Dr. Ayesha Khan',
    specialty: 'Cardiologist',
    experience: '15 years',
    rating: 4.8,
    avatar: 'AK',
  },
]

export const specialties = [...new Set(mockDoctors.map((d) => d.specialty))]

export default mockDoctors
