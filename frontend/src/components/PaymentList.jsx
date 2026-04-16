import { Link } from 'react-router-dom'
import PaymentStatus from './PaymentStatus'
import './PaymentList.css'

export default function PaymentList({ payments, isLoading }) {
  if (isLoading) {
    return (
      <div className="payment-list-loading">
        <div className="spinner-small"></div>
        <p>Loading payments...</p>
      </div>
    )
  }

  if (!payments || payments.length === 0) {
    return (
      <div className="payment-list-empty">
        <div className="empty-icon">💳</div>
        <h3>No payments yet</h3>
        <p>You haven't made any payments. Book an appointment to get started.</p>
      </div>
    )
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="payment-list-wrapper">
      <table className="payment-table">
        <thead>
          <tr>
            <th>Amount</th>
            <th>Status</th>
            <th>Method</th>
            <th>Date & Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment._id} className="payment-row">
              <td className="payment-amount">
                <span className="amount-currency">{payment.currency || 'USD'}</span>
                <span className="amount-value">{payment.amount.toFixed(2)}</span>
              </td>
              <td className="payment-status-cell">
                <PaymentStatus status={payment.status} />
              </td>
              <td className="payment-method">
                {payment.paymentMethod || 'N/A'}
              </td>
              <td className="payment-date">
                <div className="date-time">
                  <div>{formatDate(payment.createdAt)}</div>
                  <div className="time">{formatTime(payment.createdAt)}</div>
                </div>
              </td>
              <td className="payment-action">
                <Link to={`/patient/payments/${payment._id}`} className="btn btn-sm btn-secondary">
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
