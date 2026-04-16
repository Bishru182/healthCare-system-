import { useEffect, useMemo, useState } from 'react'
import { doctorService } from '../../services/doctorService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import './AdminDoctorVerification.css'

const formatDateTime = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'N/A'

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminDoctorVerification() {
  const [pendingDoctors, setPendingDoctors] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [verifyingDoctorId, setVerifyingDoctorId] = useState('')
  const toast = useToast()

  const pendingCount = useMemo(() => pendingDoctors.length, [pendingDoctors])

  const loadPendingDoctors = async () => {
    setIsLoading(true)
    try {
      const { data } = await doctorService.listPendingForVerification()
      setPendingDoctors(data.doctors || [])
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load pending doctors.'
      toast.error(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadPendingDoctors()
  }, [])

  const handleVerifyDoctor = async (doctor) => {
    setVerifyingDoctorId(doctor._id)
    try {
      await doctorService.verifyDoctor(doctor._id)
      setPendingDoctors((prev) => prev.filter((item) => item._id !== doctor._id))
      toast.success(`Dr. ${doctor.name} has been verified.`)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to verify doctor.'
      toast.error(msg)
    } finally {
      setVerifyingDoctorId('')
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-page">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Doctor Verification</h1>
        <p className="page-subtitle">
          Review newly registered doctors and approve them before they appear in booking pages.
        </p>
      </div>

      <div className="verification-summary-grid">
        <div className="verification-summary-card">
          <span className="verification-summary-label">Pending approvals</span>
          <span className="verification-summary-value">{pendingCount}</span>
        </div>
      </div>

      <div className="card">
        {pendingDoctors.length === 0 ? (
          <EmptyState
            title="No pending doctors"
            message="All registered doctors are currently verified."
          />
        ) : (
          <div className="verification-table">
            <div className="verification-row verification-row-head">
              <div>Doctor</div>
              <div>Specialty</div>
              <div>Experience</div>
              <div>Fee</div>
              <div>Requested</div>
              <div>Action</div>
            </div>

            {pendingDoctors.map((doctor) => (
              <div key={doctor._id} className="verification-row">
                <div>
                  <p className="doctor-name">Dr. {doctor.name}</p>
                  <p className="doctor-email">{doctor.email}</p>
                </div>
                <div>{doctor.specialty || 'N/A'}</div>
                <div>{doctor.experience || 0} yrs</div>
                <div>{doctor.consultationFee ? `LKR ${doctor.consultationFee}` : 'N/A'}</div>
                <div>{formatDateTime(doctor.createdAt)}</div>
                <div>
                  <button
                    className="btn btn-primary"
                    disabled={verifyingDoctorId === doctor._id}
                    onClick={() => handleVerifyDoctor(doctor)}
                  >
                    {verifyingDoctorId === doctor._id ? 'Verifying...' : 'Verify Doctor'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
