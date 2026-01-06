// Dashboard page - overview of user's content and activity
// Shows: clickable stat cards that navigate to their respective pages
// Cards: Buckets → /buckets, Schedules → /schedule, Marketplace → /marketplace
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import './Dashboard.css'

function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const navigate = useNavigate()
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d')
  const [showPlatformFilter, setShowPlatformFilter] = useState(false)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set())

  // Fetch user info to get connected platforms
  const { data: userInfo } = useQuery({
    queryKey: ['user_info'],
    queryFn: async () => {
      const response = await api.get('/user_info')
      return response.data
    },
  })

  // Get connected platforms
  const connectedPlatforms = userInfo?.user ? [
    { key: 'instagram', name: 'Instagram', connected: userInfo.user.instagram_connected },
    { key: 'facebook', name: 'Facebook', connected: userInfo.user.facebook_connected },
    { key: 'twitter', name: 'Twitter', connected: userInfo.user.twitter_connected },
    { key: 'linkedin', name: 'LinkedIn', connected: userInfo.user.linkedin_connected },
  ].filter(p => p.connected) : []

  // Initialize selected platforms to all connected platforms on first load
  useEffect(() => {
    if (connectedPlatforms.length > 0 && selectedPlatforms.size === 0) {
      setSelectedPlatforms(new Set(connectedPlatforms.map(p => p.key)))
    }
  }, [connectedPlatforms.length])

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

  // Overall analytics from selected platforms
  // Allow query to run even if no platforms selected (backend will default to all connected)
  const { data: overallAnalytics, isLoading: isLoadingAnalytics } = useQuery({
    queryKey: ['analytics_overall', timeRange, Array.from(selectedPlatforms).sort().join(',')],
    queryFn: async () => {
      const params: any = { range: timeRange }
      if (selectedPlatforms.size > 0) {
        params.platforms = Array.from(selectedPlatforms)
      }
      const response = await api.get('/analytics/overall', { params })
      return response.data
    },
    enabled: !!user, // Only need user to be loaded
  })

  const getTimeRangeLabel = (range: string) => {
    switch (range) {
      case '24h':
        return 'Last 24 hours'
      case '7d':
        return 'Last 7 days'
      case '30d':
        return 'Last 30 days'
      default:
        return 'Last 7 days'
    }
  }

  const togglePlatform = (platformKey: string) => {
    const newSelected = new Set(selectedPlatforms)
    if (newSelected.has(platformKey)) {
      newSelected.delete(platformKey)
    } else {
      newSelected.add(platformKey)
    }
    setSelectedPlatforms(newSelected)
  }

  // Use overall analytics data
  const analyticsData = overallAnalytics ? {
    engagement_rate: overallAnalytics.engagement_rate,
    likes: overallAnalytics.total_likes,
    comments: overallAnalytics.total_comments,
    shares: overallAnalytics.total_shares,
    followers: overallAnalytics.total_followers,
  } : null

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
      <div className="dashboard-header">
        <div>
          <h1>Welcome back, {user?.name}!</h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>
            {user?.reseller ? 'Manage your agency and sub-accounts' : "Here's an overview of your content"}
          </p>
        </div>
        <div className="time-range-dropdown-wrapper">
          <select
            id="time-range"
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as '24h' | '7d' | '30d')}
            className="time-range-dropdown"
          >
            <option value="24h">Last 24 hours</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
          </select>
        </div>
      </div>
      
      <div className="dashboard-filters">
        <div className="time-range-label">
          Showing: <strong>{getTimeRangeLabel(timeRange)}</strong>
        </div>
        {connectedPlatforms.length > 0 && (
          <div className="platform-filter-wrapper">
            <button
              className="platform-filter-button"
              onClick={() => setShowPlatformFilter(!showPlatformFilter)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 13 8 21 12 13 22 3"/>
              </svg>
              Filter Platforms
              {selectedPlatforms.size > 0 && (
                <span className="platform-filter-badge">{selectedPlatforms.size}</span>
              )}
            </button>
            {showPlatformFilter && (
              <div className="platform-filter-dropdown">
                <div className="platform-filter-header">
                  <strong>Select Platforms</strong>
                  <button
                    className="platform-filter-close"
                    onClick={() => setShowPlatformFilter(false)}
                  >
                    ×
                  </button>
                </div>
                <div className="platform-filter-options">
                  {connectedPlatforms.map((platform) => (
                    <label key={platform.key} className="platform-filter-option">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.has(platform.key)}
                        onChange={() => togglePlatform(platform.key)}
                      />
                      <span>{platform.name}</span>
                    </label>
                  ))}
                </div>
                {selectedPlatforms.size === 0 && (
                  <div className="platform-filter-warning">
                    Please select at least one platform
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="stats-grid">
        {/* Hootsuite-style Analytics */}
        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <h3>Engagement Rate</h3>
          </div>
          <p className="stat-number">
            {isLoadingAnalytics ? 'Loading...' : (analyticsData?.engagement_rate ? `${analyticsData.engagement_rate}%` : '—')}
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
            <h3>Likes</h3>
          </div>
          <p className="stat-number">
            {isLoadingAnalytics ? 'Loading...' : (analyticsData?.likes?.toLocaleString() ?? '—')}
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <h3>Comments</h3>
          </div>
          <p className="stat-number">
            {isLoadingAnalytics ? 'Loading...' : (analyticsData?.comments?.toLocaleString() ?? '—')}
          </p>
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
          <p className="stat-number">
            {isLoadingAnalytics ? 'Loading...' : (analyticsData?.shares?.toLocaleString() ?? '—')}
          </p>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h3>Followers</h3>
          </div>
          <p className="stat-number">
            {isLoadingAnalytics ? 'Loading...' : (analyticsData?.followers?.toLocaleString() ?? '—')}
          </p>
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
