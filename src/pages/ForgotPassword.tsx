// Forgot Password page - request password reset
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import { usePublicClientPortalBranding, DEFAULT_AUTH_APP_NAME } from '../hooks/usePublicClientPortalBranding'
import './Auth.css'

function ForgotPassword() {
  const { shellBrand } = usePublicClientPortalBranding({ documentTitleSuffix: 'Forgot password' })
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await authAPI.forgotPassword(email)
      setMessage(response.data.message || 'If an account with that email exists, a password reset link has been sent.')
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <Link to="/" className="back-to-home">
        ← Back to Home
      </Link>
      <div
        className="auth-card"
        style={
          shellBrand?.primary_color
            ? { borderTop: `4px solid ${shellBrand.primary_color}` }
            : undefined
        }
      >
        {shellBrand?.logo_url ? (
          <div className="auth-brand-logo-wrap">
            <img src={shellBrand.logo_url} alt="" className="auth-brand-logo" />
          </div>
        ) : null}
        <h1>{shellBrand?.app_name ?? DEFAULT_AUTH_APP_NAME}</h1>
        <h2>Forgot Password</h2>
        
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message" style={{ color: '#4caf50', backgroundColor: '#e8f5e9', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="submit-btn"
            style={
              shellBrand?.primary_color
                ? {
                    background: shellBrand.primary_color,
                    borderColor: shellBrand.primary_color,
                  }
                : undefined
            }
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        
        <p className="auth-link">
          Remember your password? <Link to="/login">Login</Link>
        </p>
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword


