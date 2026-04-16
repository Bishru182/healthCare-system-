import './PaymentStatus.css'

export default function PaymentStatus({ status }) {
  const statusConfig = {
    pending: { label: 'Pending', class: 'status-pending', icon: '⏳' },
    completed: { label: 'Completed', class: 'status-completed', icon: '✓' },
    failed: { label: 'Failed', class: 'status-failed', icon: '✕' },
  }

  const config = statusConfig[status] || { label: status, class: 'status-unknown', icon: '?' }

  return (
    <span className={`payment-status ${config.class}`}>
      <span className="status-icon">{config.icon}</span>
      {config.label}
    </span>
  )
}
