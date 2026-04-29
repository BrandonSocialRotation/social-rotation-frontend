// Login page - user authentication
// Form fields: email, password (with show/hide toggle)
// On success: saves token and redirects to analytics (or profile based on subscription status)
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../services/api'
import { usePublicClientPortalBranding, DEFAULT_AUTH_APP_NAME } from '../hooks/usePublicClientPortalBranding'
import './Auth.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { shellBrand } = usePublicClientPortalBranding({ documentTitleSuffix: 'Login' })

  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await authAPI.login(email, password)
      const { user, token } = response.data
      
      login(user, token)
      // Always redirect to analytics - users can view app but posting/scheduling will be blocked if subscription is canceled
      navigate('/analytics')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
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
        <h2>Login</h2>
        
        {error && <div className="error-message">{error}</div>}
        
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
          
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label htmlFor="password" style={{ marginBottom: 0 }}>Password</label>
              <Link 
                to="/forgot-password" 
                style={{ 
                  fontSize: '14px', 
                  color: '#667eea', 
                  textDecoration: 'none',
                  fontWeight: '500'
                }}
              >
                Forgot password?
              </Link>
            </div>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
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
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  )
}

export default Login
