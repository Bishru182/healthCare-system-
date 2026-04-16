import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { paymentService } from '../../services/paymentService'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import PaymentList from '../../components/PaymentList'
import Spinner from '../../components/Spinner'
import './PaymentHistory.css'

export default function PaymentHistoryPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const toast = useToast()
  const patientId = user?._id || user?.id
  const [payments, setPayments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, pending, completed, failed
  const [gatewayBanner, setGatewayBanner] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const gateway = params.get('gateway')
    const provider = params.get('provider')

    if (!gateway) {
      setGatewayBanner(null)
      return
    }

    if (gateway === 'success') {
      setGatewayBanner({
        type: 'success',
        text: `${provider || 'Payment gateway'} checkout completed. Payment status will update shortly.`,
      })
      toast.success('Gateway checkout completed')
    } else if (gateway === 'cancelled') {
      setGatewayBanner({
        type: 'warning',
        text: 'Gateway checkout was cancelled. You can retry online payment anytime.',
      })
      toast.info('Gateway checkout cancelled')
    }

    // Keep URLs clean after user sees feedback.
    navigate(location.pathname, { replace: true })
  }, [location.pathname, location.search, navigate, toast])

  useEffect(() => {
    if (!patientId) {
      setIsLoading(false)
      return
    }

    const fetchPayments = async () => {
      setIsLoading(true)
      try {
        const data = await paymentService.getByPatient(patientId)
        setPayments(data || [])
      } catch (err) {
        console.error('Failed to fetch payments:', err)
        toast.error('Failed to load payment history')
      } finally {
        setIsLoading(false)
      }
    }

    fetchPayments()
  }, [patientId, toast])

  const filteredPayments = filter === 'all'
    ? payments
    : payments.filter((p) => p.status === filter)

  const stats = {
    total: payments.length,
    completed: payments.filter((p) => p.status === 'completed').length,
    pending: payments.filter((p) => p.status === 'pending').length,
    failed: payments.filter((p) => p.status === 'failed').length,
  }

  const totalAmount = payments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="dashboard-page fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Payment History</h1>
        <p className="page-subtitle">
          Manage and track all your payments. View details or process new payments.
        </p>
      </div>

      {/* Stats Cards */}
      {gatewayBanner && (
        <div className={`gateway-banner gateway-banner-${gatewayBanner.type}`}>
          {gatewayBanner.text}
        </div>
      )}

      <div className="payment-stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-total">💳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Payments</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-completed">✓</div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-pending">⏳</div>
          <div className="stat-content">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-failed">✕</div>
          <div className="stat-content">
            <div className="stat-value">{stats.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>

        <div className="stat-card stat-total-amount">
          <div className="stat-icon stat-amount">💰</div>
          <div className="stat-content">
            <div className="stat-value">${totalAmount.toFixed(2)}</div>
            <div className="stat-label">Total Paid</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="payment-actions">
        <Link to="/patient/payments/make" className="btn btn-primary">
          + Make New Payment
        </Link>
      </div>

      {/* Filters */}
      <div className="payment-filters">
        <div className="filter-group">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button
            className={`filter-btn ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({stats.completed})
          </button>
          <button
            className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button
            className={`filter-btn ${filter === 'failed' ? 'active' : ''}`}
            onClick={() => setFilter('failed')}
          >
            Failed ({stats.failed})
          </button>
        </div>
      </div>

      {/* Payment List */}
      <div className="card">
        <PaymentList payments={filteredPayments} isLoading={isLoading} />
      </div>
    </div>
  )
}
