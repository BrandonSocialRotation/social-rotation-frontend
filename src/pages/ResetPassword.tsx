// Reset Password page - reset password using token from email
import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authAPI } from '../services/api'
import './Auth.css'

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.')
      setLoading(false)
      return
    }

    if (password !== passwordConfirmation) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    try {
      await authAPI.resetPassword(token, password, passwordConfirmation)
      setSuccess(true)
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <Link to="/" className="back-to-home">
          ← Back to Home
        </Link>
        <div className="auth-card">
          <h1>Social Rotation</h1>
          <h2>Password Reset Successful</h2>
          <div className="success-message" style={{ color: '#4caf50', backgroundColor: '#e8f5e9', padding: '12px', borderRadius: '4px', marginBottom: '16px' }}>
            Your password has been reset successfully. Redirecting to login...
          </div>
          <p className="auth-link">
            <Link to="/login">Go to Login</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <Link to="/" className="back-to-home">
        ← Back to Home
      </Link>
      <div className="auth-card">
        <h1>Social Rotation</h1>
        <h2>Reset Password</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        {!token ? (
          <div>
            <p>Invalid reset link. Please request a new password reset.</p>
            <p className="auth-link">
              <Link to="/forgot-password">Request Password Reset</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                    {showPassword && <line x1="1" y1="1" x2="23" y2="23"></line>}
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="passwordConfirmation">Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  id="passwordConfirmation"
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  placeholder="••••••••"
                  minLength={6}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                  aria-label={showPasswordConfirmation ? 'Hide password' : 'Show password'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                    {showPasswordConfirmation && <line x1="1" y1="1" x2="23" y2="23"></line>}
                  </svg>
                </button>
              </div>
            </div>
            
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        )}
        
        <p className="auth-link">
          <Link to="/login">Back to Login</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword

