// Login page - user authentication
// Form fields: email, password (with show/hide toggle)
// On success: saves token and redirects to dashboard or profile based on subscription status
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { authAPI } from '../services/api'
import api from '../services/api'
import './Auth.css'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
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
      
      // Check subscription status before redirecting
      // Skip subscription check for user_info endpoint so we can check status
      try {
        const subscriptionResponse = await api.get('/subscriptions')
        const subscription = subscriptionResponse.data?.subscription
        
        // If subscription is canceled or inactive, redirect to profile to resubscribe
        if (subscription && (subscription.status === 'canceled' || subscription.status === 'past_due' || subscription.status === 'unpaid' || subscription.status === 'incomplete' || subscription.status === 'incomplete_expired')) {
          navigate('/profile')
        } else if (!subscription) {
          // No subscription - redirect to register
          navigate('/register')
        } else {
          // Active subscription - go to dashboard
          navigate('/dashboard')
        }
      } catch (subErr: any) {
        // If subscription check fails, try to go to dashboard
        // The API interceptor will handle 403 errors and redirect appropriately
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Social Rotation</h1>
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
            <label htmlFor="password">Password</label>
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
          
          <button type="submit" disabled={loading} className="submit-btn">
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
