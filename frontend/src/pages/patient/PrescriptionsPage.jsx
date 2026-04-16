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
          message="Prescriptions issued by your doctors will appear here."
        />
      ) : (
        <div className="rx-grid">
          {prescriptions.map((p) => (
            <div key={p._id || p.id} className="rx-card card">
              <div className="rx-header">
                <div className="rx-icon">💊</div>
                <div>
                  <h3 className="rx-med">{p.diagnosis || 'Prescription'}</h3>
                  <p className="rx-doc">Issued by Dr. {p.doctorName}</p>
                </div>
              </div>
              <div className="rx-body">
                {(p.medications || []).map((m, i) => (
                  <div key={i} className="rx-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <span className="rx-label">{m.name} — {m.dosage}</span>
                    <span className="rx-value" style={{ fontSize: '0.85rem', color: '#475569' }}>
                      {m.frequency} · for {m.duration}{m.instructions ? ` · ${m.instructions}` : ''}
                    </span>
                  </div>
                ))}
                <div className="rx-row" style={{ marginTop: 6 }}>
                  <span className="rx-label">Date</span>
                  <span className="rx-value">{formatDate(p.issuedDate || p.createdAt)}</span>
                </div>
                {p.notes && (
                  <div className="rx-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                    <span className="rx-label">Notes</span>
                    <span className="rx-value" style={{ fontSize: '0.85rem' }}>{p.notes}</span>
                  </div>
                )}
              </div>
              <div className="rx-footer">
                <span className="badge badge-confirmed">Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
