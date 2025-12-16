import { useState } from 'react'
import './InfoIcon.css'

interface InfoIconProps {
  content: string
  title?: string
}

export default function InfoIcon({ content, title = 'Information' }: InfoIconProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="info-icon-container">
      <button
        className="info-icon-button"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        aria-label="Show information"
        type="button"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
      </button>
      {showTooltip && (
        <div className="info-tooltip">
          <div className="info-tooltip-header">
            <strong>{title}</strong>
            <button
              className="info-tooltip-close"
              onClick={() => setShowTooltip(false)}
              aria-label="Close"
            >
              ×
            </button>
          </div>
          <div className="info-tooltip-content">
            {content}
          </div>
        </div>
      )}
    </div>
  )
}

