import './Spinner.css'

export default function Spinner({ size = 'md', text = '' }) {
  return (
    <div className="spinner-wrapper">
      <div className={`spinner spinner-${size}`} aria-label="Loading" />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  )
}
