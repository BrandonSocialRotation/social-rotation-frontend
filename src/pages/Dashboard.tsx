// Dashboard page - Hootsuite-style analytics overview
import React from 'react'
import { useAuthStore } from '../store/authStore'
import { useQuery } from '@tanstack/react-query'
import api from '../services/api'
import './Dashboard.css'

interface PlatformAnalytics {
  platform: string
  posts: number
  engagement: number
  followers: number
  new_followers: number
  likes?: number
  comments?: number
  shares?: number
}

interface OverallAnalytics {
  posts: {
    total: number
    facebook: number
    instagram: number
    twitter: number
    linkedin: number
  }
  engagement: {
    total: number
    facebook: number
    instagram: number
    twitter: number
    linkedin: number
  }
  followers: {
    total: number
    facebook: number
    instagram: number
    twitter: number
    linkedin: number
  }
  new_followers: {
    total: number
    facebook: number
    instagram: number
    twitter: number
    linkedin: number
  }
  platforms: {
    facebook: any
    instagram: any
    twitter: any
    linkedin: any
  }
}

function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const [selectedRange, setSelectedRange] = React.useState<'7d' | '28d' | '90d'>('7d')

  // Fetch overall analytics
  const { data: overallAnalytics } = useQuery<OverallAnalytics>({
    queryKey: ['analytics_overall', selectedRange],
    queryFn: async () => {
      try {
        const response = await api.get('/analytics/overall', { params: { range: selectedRange } })
        return response.data
      } catch (error: any) {
        if (error.response?.status === 403 && error.response?.data?.subscription_required) {
          return null
        }
        return null
      }
    },
    retry: false,
  })

  // Fetch platform-specific analytics
  const platforms = ['facebook', 'instagram', 'twitter', 'linkedin']
  const platformQueries = platforms.map(platform => ({
    platform,
    query: useQuery<PlatformAnalytics>({
      queryKey: ['analytics_platform', platform, selectedRange],
      queryFn: async () => {
        try {
          const response = await api.get(`/analytics/platform/${platform}`, { params: { range: selectedRange } })
          return response.data
        } catch (error: any) {
          return null
        }
      },
      retry: false,
    })
  }))

  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return '—'
    return num.toLocaleString()
  }

  const formatChange = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return '—'
    const sign = num > 0 ? '+' : ''
    return `${sign}${num.toLocaleString()}`
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Analytics Overview</h1>
          <p style={{ color: '#666', marginTop: '0.5rem' }}>
            {user?.reseller ? 'Manage your agency and sub-accounts' : "Track your social media performance"}
          </p>
        </div>
        <div className="range-selector">
          <button 
            className={selectedRange === '7d' ? 'active' : ''}
            onClick={() => setSelectedRange('7d')}
          >
            7 Days
          </button>
          <button 
            className={selectedRange === '28d' ? 'active' : ''}
            onClick={() => setSelectedRange('28d')}
          >
            28 Days
          </button>
          <button 
            className={selectedRange === '90d' ? 'active' : ''}
            onClick={() => setSelectedRange('90d')}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* Overall Summary Cards */}
      {overallAnalytics && (
        <div className="overall-summary">
          <h2>Overall Performance</h2>
          <div className="stats-grid">
            <div className="stat-card large">
              <div className="stat-card-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
                <h3>Posts via Social Rotation</h3>
              </div>
              <p className="stat-number">{formatNumber(overallAnalytics.posts?.total)}</p>
              <p className="stat-label">Posts scheduled through this platform</p>
            </div>

            <div className="stat-card large">
              <div className="stat-card-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <h3>Total Engagement</h3>
              </div>
              <p className="stat-number">{formatNumber(overallAnalytics.engagement?.total)}</p>
              <p className="stat-label">All account engagement (all posts)</p>
            </div>

            <div className="stat-card large">
              <div className="stat-card-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <h3>Total Followers</h3>
              </div>
              <p className="stat-number">{formatNumber(overallAnalytics.followers?.total)}</p>
              <p className="stat-label">Across all accounts</p>
            </div>

            <div className="stat-card large">
              <div className="stat-card-header">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <h3>New Followers</h3>
              </div>
              <p className="stat-number">{formatChange(overallAnalytics.new_followers?.total)}</p>
              <p className="stat-label">Last {selectedRange}</p>
            </div>
          </div>
        </div>
      )}

      {/* Platform-Specific Analytics */}
      <div className="platform-analytics">
        <h2>Platform Performance</h2>
        <div className="platforms-grid">
          {platformQueries.map(({ platform, query }) => {
            const data = query.data
            const isLoading = query.isLoading
            
            if (isLoading) {
              return (
                <div key={platform} className="platform-card">
                  <div className="platform-header">
                    <h3>{platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
                  </div>
                  <p>Loading...</p>
                </div>
              )
            }

            if (!data) {
              return null
            }

            return (
              <div key={platform} className="platform-card">
                <div className="platform-header">
                  <h3>{platform.charAt(0).toUpperCase() + platform.slice(1)}</h3>
                  <div className={`platform-status ${data.posts > 0 ? 'active' : 'inactive'}`}>
                    {data.posts > 0 ? '●' : '○'}
                  </div>
                </div>
                
                <div className="platform-metrics">
                  <div className="metric-row">
                    <span className="metric-label">Posts (via Social Rotation)</span>
                    <span className="metric-value">{formatNumber(data.posts)}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Engagement</span>
                    <span className="metric-value">{formatNumber(data.engagement)}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Followers</span>
                    <span className="metric-value">{formatNumber(data.followers)}</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">New Followers</span>
                    <span className="metric-value change">{formatChange(data.new_followers)}</span>
                  </div>
                  {data.likes !== undefined && (
                    <div className="metric-row">
                      <span className="metric-label">Likes</span>
                      <span className="metric-value">{formatNumber(data.likes)}</span>
                    </div>
                  )}
                  {data.comments !== undefined && (
                    <div className="metric-row">
                      <span className="metric-label">Comments</span>
                      <span className="metric-value">{formatNumber(data.comments)}</span>
                    </div>
                  )}
                  {data.shares !== undefined && (
                    <div className="metric-row">
                      <span className="metric-label">Shares</span>
                      <span className="metric-value">{formatNumber(data.shares)}</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

export default Dashboard
