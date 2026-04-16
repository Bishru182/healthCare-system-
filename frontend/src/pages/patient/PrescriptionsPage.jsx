import { useState, useEffect } from 'react'
import { patientService } from '../../services/patientService'
import { useToast } from '../../context/ToastContext'
import Spinner from '../../components/Spinner'
import EmptyState from '../../components/EmptyState'
import './PatientDashboard.css'
import './Prescriptions.css'

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([])
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    patientService.getPrescriptions()
      .then(({ data }) => setPrescriptions(data.prescriptions || []))
      .catch(() => toast.error('Failed to load prescriptions.'))
      .finally(() => setLoading(false))
  }, [])

  const formatDate = (str) => new Date(str).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  if (loading) return <Spinner size="lg" text="Loading prescriptions..." />

  return (
    <div className="dashboard-page fade-in">
      <div className="page-header">
        <h1 className="page-title">Prescriptions</h1>
        <p className="page-subtitle">Your prescribed medications and dosage instructions.</p>
      </div>

      {prescriptions.length === 0 ? (
        <EmptyState
          icon="💊"
          title="No prescriptions on record"
          description="Your prescriptions will appear here after your appointments."
        />
      ) : (
        <>
          <div className="rx-grid">
            {prescriptions.map((p) => (
              <div key={p.id} className="rx-card card">
                <div className="rx-header">
                  <div className="rx-icon">💊</div>
                  <div>
                    <h3 className="rx-med">{p.medication}</h3>
                    <p className="rx-doc">Prescribed by {p.prescribedBy}</p>
                  </div>
                </div>
                <div className="rx-body">
                  <div className="rx-row">
                    <span className="rx-label">Dosage</span>
                    <span className="rx-value">{p.dosage}</span>
                  </div>
                  <div className="rx-row">
                    <span className="rx-label">Duration</span>
                    <span className="rx-value">{p.duration}</span>
                  </div>
                  <div className="rx-row">
                    <span className="rx-label">Date</span>
                    <span className="rx-value">{formatDate(p.date)}</span>
                  </div>
                </div>
                <div className="rx-footer">
                  <span className="badge badge-confirmed">Active</span>
                </div>
              </div>
            ))}
          </div>

          <div className="rx-notice">
            <span>ℹ️</span>
            <p>Currently showing mock prescription data. Real data will be available after Doctor Service integration.</p>
          </div>
        </>
      )}
    </div>
  )
}
