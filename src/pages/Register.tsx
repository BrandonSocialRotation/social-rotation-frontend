// Register page - new user signup with payment collection
// Multi-step form: Account info -> Payment info -> Process payment
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import api from '../services/api'
import './Auth.css'

function Register() {
  const [step, setStep] = useState(1) // 1: Account info, 2: Payment info
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [accountType, setAccountType] = useState('personal') // 'personal' or 'agency'
  const [companyName, setCompanyName] = useState('')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  const [subAccountCount, setSubAccountCount] = useState(1) // For agency accounts
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [pendingRegistrationId, setPendingRegistrationId] = useState<number | null>(null) // Store pending registration ID

  // Fetch plans to calculate pricing
  const [plans, setPlans] = useState<any[]>([])
  const [plansLoading, setPlansLoading] = useState(false)

  useEffect(() => {
    // Fetch plans when account type changes
    if (accountType) {
      setPlansLoading(true)
      api.get(`/plans?account_type=${accountType}`)
        .then((response) => {
          setPlans(response.data.plans || [])
        })
        .catch((err) => {
          console.error('Failed to load plans:', err)
        })
        .finally(() => {
          setPlansLoading(false)
        })
    }
  }, [accountType])

  // Calculate price based on account type and user count
  const calculatePrice = () => {
    if (accountType === 'personal') {
      const plan = plans.find((p: any) => p.plan_type === 'personal' && p.supports_per_user_pricing)
      if (plan) {
        const basePrice = plan.base_price_cents || 0
        // For personal, we start with 1 user (base price only)
        let total = basePrice
        if (billingPeriod === 'annual') {
          // Annual: pay for 10 months, get 12 (2 months free)
          // Return the TOTAL annual price, not monthly equivalent
          total = Math.round(total * 10) // $49/month × 10 months = $490/year
        }
        return total
      }
      // Default fallback
      if (billingPeriod === 'annual') {
        return 49000 // $490/year (49 * 10)
      }
      return 4900 // Default $49/month
    } else {
      // Agency - find appropriate plan based on sub-account count
      const plan = plans.find((p: any) => p.plan_type === 'agency')
      if (plan) {
        const price = plan.price_cents || 9900
        if (billingPeriod === 'annual') {
          return Math.round(price * 10) // 2 months free
        }
        return price
      }
      if (billingPeriod === 'annual') {
        return 99000 // $990/year
      }
      return 9900 // Default to Agency Starter
    }
  }

  const formatPrice = (cents: number) => {
    const dollars = cents / 100
    const period = billingPeriod === 'annual' ? 'year' : 'month'
    return `$${dollars.toFixed(2)}/${period}`
  }

  // Step 1: Create account
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (password !== passwordConfirmation) {
      setError('Passwords do not match')
      return
    }
    
    setLoading(true)

    try {
      const response = await authAPI.register(name, email, password, accountType, companyName)
      
      // New flow: registration returns pending_registration_id (no token yet)
      const pendingId = response.data.pending_registration_id
      const checkoutUrl = response.data.checkout_url
      
      if (checkoutUrl) {
        // If checkout_url is provided, redirect immediately (plan was selected during registration)
        window.location.href = checkoutUrl
        return
      }
      
      if (pendingId) {
        // Store pending registration ID for plan selection step
        setPendingRegistrationId(pendingId)
        // Move to payment step
        setStep(2)
        setLoading(false) // Reset loading before moving to next step
      } else {
        throw new Error('Registration failed - no pending registration ID received')
      }
    } catch (err: any) {
      // Show detailed error messages
      console.error('=== Registration Error Debug ===')
      console.error('Full error object:', err)
      console.error('Error response:', err.response)
      console.error('Error response data:', err.response?.data)
      console.error('Error response status:', err.response?.status)
      console.error('Error message:', err.message)
      
      const errorData = err.response?.data || err.data
      let errorMessage = 'Registration failed. Please try again.'
      
      if (errorData) {
        console.error('Processing errorData:', errorData)
        
        // Try multiple error formats - prioritize message field
        if (errorData.message && typeof errorData.message === 'string' && errorData.message.length > 0 && errorData.message !== 'Registration failed') {
          errorMessage = errorData.message
          console.log('Using errorData.message:', errorMessage)
        } else if (errorData.details && Array.isArray(errorData.details) && errorData.details.length > 0) {
          errorMessage = errorData.details.join('. ')
          console.log('Using errorData.details:', errorMessage)
        } else if (errorData.errors && typeof errorData.errors === 'object' && Object.keys(errorData.errors).length > 0) {
          // Handle Rails error format
          const errorStrings: string[] = []
          Object.keys(errorData.errors).forEach((field) => {
            const fieldErrors = errorData.errors[field]
            if (Array.isArray(fieldErrors)) {
              fieldErrors.forEach((msg: string) => {
                errorStrings.push(`${field.charAt(0).toUpperCase() + field.slice(1)} ${msg}`)
              })
            } else if (typeof fieldErrors === 'string') {
              errorStrings.push(`${field.charAt(0).toUpperCase() + field.slice(1)} ${fieldErrors}`)
            } else {
              errorStrings.push(`${field}: ${JSON.stringify(fieldErrors)}`)
            }
          })
          if (errorStrings.length > 0) {
            errorMessage = errorStrings.join('. ')
            console.log('Using errorData.errors:', errorMessage)
          }
        }
      } else if (err.message) {
        errorMessage = err.message
        console.log('Using err.message:', errorMessage)
      }
      
      console.error('Final error message to display:', errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Process payment and create subscription
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setProcessingPayment(true)

    try {
      // Get the appropriate plan
      let plan
      if (accountType === 'personal') {
        plan = plans.find((p: any) => p.plan_type === 'personal' && p.supports_per_user_pricing)
      } else {
        // For agency, find plan that matches sub-account count
        // Find the smallest plan that can accommodate the requested sub-account count
        const agencyPlans = plans.filter((p: any) => p.plan_type === 'agency').sort((a: any, b: any) => (a.max_users || 0) - (b.max_users || 0))
        plan = agencyPlans.find((p: any) => subAccountCount <= (p.max_users || 999)) || agencyPlans[0]
      }

      if (!plan) {
        throw new Error('No plan found for your account type. Please refresh the page and try again.')
      }

      if (!pendingRegistrationId) {
        throw new Error('Registration session expired. Please register again.')
      }

      // Create checkout session using pending registration
      const checkoutResponse = await api.post('/subscriptions/checkout_session_for_pending', {
        pending_registration_id: pendingRegistrationId,
        plan_id: plan.id,
        billing_period: billingPeriod,
        user_count: accountType === 'personal' ? 1 : subAccountCount
      })

      if (checkoutResponse.data?.checkout_url) {
        // Redirect to Stripe Checkout
        window.location.href = checkoutResponse.data.checkout_url
      } else {
        throw new Error('Failed to create checkout session. Please try again.')
      }
    } catch (err: any) {
      // Show detailed error messages for payment
      const errorData = err.response?.data
      let errorMessage = 'Payment setup failed. Please try again.'
      
      if (errorData) {
        if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.details) {
          errorMessage = Array.isArray(errorData.details) 
            ? errorData.details.join('. ')
            : errorData.details
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
      setProcessingPayment(false)
    }
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
      setError('')
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ maxWidth: '600px' }}>
        <h1>Social Rotation</h1>
        <h2>Create Account</h2>
        
        {/* Progress indicator */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <div style={{ 
            width: '30px', 
            height: '30px', 
            borderRadius: '50%', 
            background: step >= 1 ? '#007bff' : '#ddd',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>1</div>
          <div style={{ 
            width: '30px', 
            height: '30px', 
            borderRadius: '50%', 
            background: step >= 2 ? '#007bff' : '#ddd',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>2</div>
        </div>
        
        {error && (
          <div className="error-message" style={{ 
            padding: '15px', 
            marginBottom: '20px', 
            background: '#fee', 
            border: '1px solid #fcc', 
            borderRadius: '5px', 
            color: '#c33',
            fontSize: '0.95em',
            lineHeight: '1.5'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {step === 1 && (
          <form onSubmit={handleAccountSubmit}>
            <div className="form-group">
              <label htmlFor="accountType">Account Type</label>
              <select
                id="accountType"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                required
              >
                <option value="personal">Personal Account</option>
                <option value="agency">Agency/Reseller Account</option>
              </select>
              <small style={{color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block'}}>
                {accountType === 'agency' 
                  ? 'Manage multiple client accounts' 
                  : 'Single user account for personal use'}
              </small>
            </div>

            {accountType === 'agency' && (
              <div className="form-group">
                <label htmlFor="companyName">Company/Agency Name</label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="Your Agency Name"
                />
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="name">Your Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your Name"
              />
            </div>
            
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
              <label htmlFor="passwordConfirmation">Confirm Password</label>
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
              {loading ? 'Creating account...' : 'Continue to Payment'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handlePaymentSubmit}>
            <h3 style={{ marginBottom: '20px' }}>Payment Information</h3>
            
            {accountType === 'personal' && (
              <>
                <div className="form-group">
                  <label style={{ marginBottom: '15px', display: 'block', fontWeight: 'bold' }}>Select Billing Period</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    {/* Monthly Card */}
                    <div
                      onClick={() => setBillingPeriod('monthly')}
                      style={{
                        padding: '20px',
                        border: billingPeriod === 'monthly' ? '3px solid #007bff' : '2px solid #ddd',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: billingPeriod === 'monthly' ? '#f0f7ff' : '#fff',
                        transition: 'all 0.2s',
                        boxShadow: billingPeriod === 'monthly' ? '0 4px 12px rgba(0,123,255,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.3em', color: '#007bff' }}>Monthly</h3>
                        {billingPeriod === 'monthly' && (
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: '#007bff', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>✓</div>
                        )}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '2em', fontWeight: 'bold', color: '#333' }}>
                          $49<span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>/month</span>
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: '#666' }}>
                          Base price
                        </p>
                      </div>
                      <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', fontWeight: 'bold' }}>Pricing Structure:</p>
                        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '0.85em', color: '#666', lineHeight: '1.6' }}>
                          <li>Base: $49/month</li>
                          <li>+ $15/user (first 10 users)</li>
                          <li>+ $10/user (after 10 users)</li>
                        </ul>
                        <p style={{ margin: '15px 0 0 0', fontSize: '0.9em', fontWeight: 'bold', color: '#333' }}>
                          Starting at: $49/month
                        </p>
                      </div>
                    </div>

                    {/* Annual Card */}
                    <div
                      onClick={() => setBillingPeriod('annual')}
                      style={{
                        padding: '20px',
                        border: billingPeriod === 'annual' ? '3px solid #28a745' : '2px solid #ddd',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: billingPeriod === 'annual' ? '#f0fff4' : '#fff',
                        transition: 'all 0.2s',
                        boxShadow: billingPeriod === 'annual' ? '0 4px 12px rgba(40,167,69,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
                        position: 'relative'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#28a745',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75em',
                        fontWeight: 'bold'
                      }}>
                        BEST VALUE
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', marginTop: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.3em', color: '#28a745' }}>Annual</h3>
                        {billingPeriod === 'annual' && (
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: '#28a745', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>✓</div>
                        )}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '2em', fontWeight: 'bold', color: '#333' }}>
                          $490<span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>/year</span>
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: '#28a745', fontWeight: 'bold' }}>
                          Save 2 months! (Pay for 10, get 12)
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.8em', color: '#666' }}>
                          Equivalent to $40.83/month
                        </p>
                      </div>
                      <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', fontWeight: 'bold' }}>Pricing Structure:</p>
                        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '0.85em', color: '#666', lineHeight: '1.6' }}>
                          <li>Base: $49/month × 10 = $490/year</li>
                          <li>+ $15/user (first 10 users)</li>
                          <li>+ $10/user (after 10 users)</li>
                        </ul>
                        <p style={{ margin: '15px 0 0 0', fontSize: '0.9em', fontWeight: 'bold', color: '#333' }}>
                          Starting at: $490/year
                        </p>
                        <p style={{ margin: '10px 0 0 0', fontSize: '0.85em', color: '#28a745', fontWeight: 'bold' }}>
                          💰 Save $98/year vs monthly!
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {accountType === 'agency' && (
              <>
                <div className="form-group">
                  <label htmlFor="subAccountCount" style={{ marginBottom: '15px', display: 'block', fontWeight: 'bold' }}>Number of Sub-Accounts</label>
                  <select
                    id="subAccountCount"
                    value={subAccountCount}
                    onChange={(e) => setSubAccountCount(parseInt(e.target.value))}
                    required
                    style={{ marginBottom: '20px' }}
                  >
                    <option value="5">5 sub-accounts - Agency Starter</option>
                    <option value="15">15 sub-accounts - Agency Professional</option>
                    <option value="50">50 sub-accounts - Agency Enterprise</option>
                  </select>
                  <small style={{color: '#666', fontSize: '0.85rem', marginTop: '0.25rem', display: 'block', marginBottom: '15px'}}>
                    You can add more sub-accounts later by upgrading your plan
                  </small>
                </div>

                <div className="form-group">
                  <label style={{ marginBottom: '15px', display: 'block', fontWeight: 'bold' }}>Select Billing Period</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    {/* Monthly Card */}
                    <div
                      onClick={() => setBillingPeriod('monthly')}
                      style={{
                        padding: '20px',
                        border: billingPeriod === 'monthly' ? '3px solid #007bff' : '2px solid #ddd',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: billingPeriod === 'monthly' ? '#f0f7ff' : '#fff',
                        transition: 'all 0.2s',
                        boxShadow: billingPeriod === 'monthly' ? '0 4px 12px rgba(0,123,255,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.3em', color: '#007bff' }}>Monthly</h3>
                        {billingPeriod === 'monthly' && (
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: '#007bff', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>✓</div>
                        )}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '2em', fontWeight: 'bold', color: '#333' }}>
                          {(() => {
                            const plan = plans.find((p: any) => {
                              if (p.plan_type === 'agency') {
                                return subAccountCount <= (p.max_users || 999)
                              }
                              return false
                            })
                            const price = plan?.price_cents || 9900
                            return `$${(price / 100).toFixed(0)}`
                          })()}
                          <span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>/month</span>
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: '#666' }}>
                          {(() => {
                            const plan = plans.find((p: any) => {
                              if (p.plan_type === 'agency') {
                                return subAccountCount <= (p.max_users || 999)
                              }
                              return false
                            })
                            return plan?.name || 'Agency Starter'
                          })()}
                        </p>
                      </div>
                      <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', fontWeight: 'bold' }}>What's Included:</p>
                        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '0.85em', color: '#666', lineHeight: '1.6' }}>
                          <li>Up to {subAccountCount} sub-accounts</li>
                          <li>Manage multiple client accounts</li>
                          <li>All social media platforms</li>
                          <li>Full scheduling features</li>
                        </ul>
                        <p style={{ margin: '15px 0 0 0', fontSize: '0.9em', fontWeight: 'bold', color: '#333' }}>
                          {(() => {
                            const plan = plans.find((p: any) => {
                              if (p.plan_type === 'agency') {
                                return subAccountCount <= (p.max_users || 999)
                              }
                              return false
                            })
                            const price = plan?.price_cents || 9900
                            return `Starting at: $${(price / 100).toFixed(0)}/month`
                          })()}
                        </p>
                      </div>
                    </div>

                    {/* Annual Card */}
                    <div
                      onClick={() => setBillingPeriod('annual')}
                      style={{
                        padding: '20px',
                        border: billingPeriod === 'annual' ? '3px solid #28a745' : '2px solid #ddd',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        background: billingPeriod === 'annual' ? '#f0fff4' : '#fff',
                        transition: 'all 0.2s',
                        boxShadow: billingPeriod === 'annual' ? '0 4px 12px rgba(40,167,69,0.15)' : '0 2px 4px rgba(0,0,0,0.1)',
                        position: 'relative'
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: '#28a745',
                        color: 'white',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75em',
                        fontWeight: 'bold'
                      }}>
                        BEST VALUE
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', marginTop: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.3em', color: '#28a745' }}>Annual</h3>
                        {billingPeriod === 'annual' && (
                          <div style={{ 
                            width: '24px', 
                            height: '24px', 
                            borderRadius: '50%', 
                            background: '#28a745', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>✓</div>
                        )}
                      </div>
                      <div style={{ marginBottom: '15px' }}>
                        <p style={{ margin: '0 0 5px 0', fontSize: '2em', fontWeight: 'bold', color: '#333' }}>
                          {(() => {
                            const plan = plans.find((p: any) => {
                              if (p.plan_type === 'agency') {
                                return subAccountCount <= (p.max_users || 999)
                              }
                              return false
                            })
                            const monthlyPrice = plan?.price_cents || 9900
                            const annualPrice = Math.round(monthlyPrice * 10)
                            return `$${(annualPrice / 100).toFixed(0)}`
                          })()}
                          <span style={{ fontSize: '0.5em', fontWeight: 'normal', color: '#666' }}>/year</span>
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: '#28a745', fontWeight: 'bold' }}>
                          Save 2 months! (Pay for 10, get 12)
                        </p>
                        <p style={{ margin: '5px 0 0 0', fontSize: '0.8em', color: '#666' }}>
                          {(() => {
                            const plan = plans.find((p: any) => {
                              if (p.plan_type === 'agency') {
                                return subAccountCount <= (p.max_users || 999)
                              }
                              return false
                            })
                            const monthlyPrice = plan?.price_cents || 9900
                            const annualPrice = Math.round(monthlyPrice * 10)
                            const monthlyEquivalent = (annualPrice / 12 / 100).toFixed(2)
                            return `Equivalent to $${monthlyEquivalent}/month`
                          })()}
                        </p>
                      </div>
                      <div style={{ borderTop: '1px solid #eee', paddingTop: '15px' }}>
                        <p style={{ margin: '0 0 8px 0', fontSize: '0.9em', fontWeight: 'bold' }}>What's Included:</p>
                        <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '0.85em', color: '#666', lineHeight: '1.6' }}>
                          <li>Up to {subAccountCount} sub-accounts</li>
                          <li>Manage multiple client accounts</li>
                          <li>All social media platforms</li>
                          <li>Full scheduling features</li>
                        </ul>
                        <p style={{ margin: '15px 0 0 0', fontSize: '0.9em', fontWeight: 'bold', color: '#333' }}>
                          {(() => {
                            const plan = plans.find((p: any) => {
                              if (p.plan_type === 'agency') {
                                return subAccountCount <= (p.max_users || 999)
                              }
                              return false
                            })
                            const monthlyPrice = plan?.price_cents || 9900
                            const annualPrice = Math.round(monthlyPrice * 10)
                            return `Starting at: $${(annualPrice / 100).toFixed(0)}/year`
                          })()}
                        </p>
                        <p style={{ margin: '10px 0 0 0', fontSize: '0.85em', color: '#28a745', fontWeight: 'bold' }}>
                          💰 Save {(() => {
                            const plan = plans.find((p: any) => {
                              if (p.plan_type === 'agency') {
                                return subAccountCount <= (p.max_users || 999)
                              }
                              return false
                            })
                            const monthlyPrice = plan?.price_cents || 9900
                            const savings = Math.round(monthlyPrice * 2)
                            return `$${(savings / 100).toFixed(0)}/year vs monthly!`
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div style={{ 
              padding: '20px', 
              background: '#e7f3ff', 
              borderRadius: '8px', 
              marginBottom: '20px',
              border: '1px solid #b3d9ff'
            }}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Payment Method</p>
              <p style={{ margin: '0', fontSize: '0.9em', color: '#666' }}>
                You'll be redirected to Stripe's secure checkout page to enter your payment information.
                Your subscription will start immediately after payment.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={handleBack}
                disabled={processingPayment}
                className="submit-btn"
                style={{ background: '#6c757d', flex: 1 }}
              >
                Back
              </button>
              <button 
                type="submit" 
                disabled={processingPayment || plansLoading} 
                className="submit-btn"
                style={{ flex: 2 }}
              >
                {processingPayment ? 'Processing...' : plansLoading ? 'Loading plans...' : `Continue to Payment - ${formatPrice(calculatePrice())}`}
              </button>
            </div>
          </form>
        )}
        
        <p className="auth-link" style={{ marginTop: '20px' }}>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
