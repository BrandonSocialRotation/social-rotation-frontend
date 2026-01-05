// Dashboard page - overview of user's content and activity
// Shows: clickable stat cards that navigate to their respective pages
// Cards: Buckets → /buckets, Schedules → /schedule, Marketplace → /marketplace
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import './Dashboard.css'

function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()

  // Fetch sub-accounts count (for resellers)
  const { data: subAccountsData } = useQuery({
    queryKey: ['sub_accounts'],
    queryFn: async () => {
      const response = await api.get('/sub_accounts')
      return response.data
    },
    enabled: !!user?.reseller,
  })

  const subAccountsCount = subAccountsData?.sub_accounts?.length || 0

  // Instagram analytics summary (mock until live creds)
  const { data: igSummary } = useQuery({
    queryKey: ['analytics_instagram_summary', '7d'],
    queryFn: async () => {
      const response = await api.get('/analytics/instagram/summary', { params: { range: '7d' } })
      return response.data?.metrics
    },
  })

  // Fetch posts count
  const { data: postsData } = useQuery({
    queryKey: ['analytics_posts_count'],
    queryFn: async () => {
      const response = await api.get('/analytics/posts_count')
      return response.data
    },
  })

  return (
    <div className="dashboard">
      <h1>Welcome back, {user?.name}!</h1>
      <p style={{ color: '#666', marginTop: '0.5rem' }}>
        {user?.reseller ? 'Manage your agency and sub-accounts' : "Here's an overview of your content"}
      </p>
      
      <div className="stats-grid">
        {/* Hootsuite-style Analytics */}
        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 22V11m0 0c0-2.8 2.2-5 5-5s5 2.2 5 5v11M7 11H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3M17 22V11m0 0h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"/>
            </svg>
            <h3>Engagement Rate</h3>
          </div>
          <p className="stat-number">{igSummary?.engagement_rate ? `${igSummary.engagement_rate}%` : '—'}</p>
          <p className="stat-label">Last 7 days</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <h3>Likes</h3>
          </div>
          <p className="stat-number">{igSummary?.likes?.toLocaleString() ?? '—'}</p>
          <p className="stat-label">Last 7 days</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>Comments</h3>
          </div>
          <p className="stat-number">{igSummary?.comments?.toLocaleString() ?? '—'}</p>
          <p className="stat-label">Last 7 days</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
              <polyline points="16 6 12 2 8 6"/>
              <line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            <h3>Shares</h3>
          </div>
          <p className="stat-number">{igSummary?.shares?.toLocaleString() ?? '—'}</p>
          <p className="stat-label">Last 7 days</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h3>Profile Visits</h3>
          </div>
          <p className="stat-number">{igSummary?.profile_visits?.toLocaleString() ?? '—'}</p>
          <p className="stat-label">Last 7 days</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            <h3>Followers</h3>
          </div>
          <p className="stat-number">{igSummary?.followers?.toLocaleString() ?? '—'}</p>
          <p className="stat-label">Current total</p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <h3>Posts</h3>
          </div>
          <p className="stat-number">{postsData?.total_posts?.toLocaleString() ?? '—'}</p>
          <p className="stat-label">Total from app</p>
        </div>
        {/* Sub-Accounts Card - Only for resellers */}
        {user?.reseller && (
          <div 
            className="stat-card clickable"
            onClick={() => navigate('/sub-accounts')}
            role="button"
            tabIndex={0}
          >
            <div className="stat-card-header">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <h3>Sub-Accounts</h3>
            </div>
            <p className="stat-number">{subAccountsCount}</p>
            <p className="stat-label">Client accounts</p>
            <div className="card-arrow">→</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
