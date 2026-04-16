import './EmptyState.css'

export default function EmptyState({ icon = '📭', title, description, message, action }) {
  const text = description || message
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3 className="empty-title">{title}</h3>
      {text && <p className="empty-desc">{text}</p>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  )
}
