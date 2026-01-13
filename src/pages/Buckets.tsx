// Buckets page - manage content collections
// Features: 
//   - List all user's buckets in a grid
//   - Create new bucket with modal form
//   - View bucket details (click card)
//   - Delete bucket
//   - Shows image count and schedule count for each bucket
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { bucketsAPI, api } from '../services/api'
import { useAuthStore } from '../store/authStore'
import './Buckets.css'

// TypeScript interface for Bucket data
interface Bucket {
  id: number
  name: string
  description: string
  user_id: number
  use_watermark: boolean
  post_once_bucket: boolean
  is_global?: boolean
  images_count: number
  schedules_count: number
  created_at: string
  owner?: {
    id: number
    name: string
    email: string
  }
}

function Buckets() {
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBucketName, setNewBucketName] = useState('')
  const [newBucketDescription, setNewBucketDescription] = useState('')
  const [isGlobalBucket, setIsGlobalBucket] = useState(false)
  const [error, setError] = useState('')
  
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)

  // Fetch user info to ensure super_admin is up to date
  const { data: userInfo } = useQuery({
    queryKey: ['user_info'],
    queryFn: async () => {
      const response = await api.get('/user_info')
      if (response.data?.user) {
        // Update auth store with latest user info including super_admin
        setUser(response.data.user)
        console.log('Updated user in auth store:', response.data.user)
        console.log('Super admin status:', response.data.user.super_admin)
      }
      return response.data
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Get super_admin from updated user or userInfo - check both boolean true and truthy
  const isSuperAdmin = Boolean(
    user?.super_admin === true || 
    userInfo?.user?.super_admin === true ||
    user?.account_id === 0 ||
    userInfo?.user?.account_id === 0
  )
  
  // Debug logging - more detailed
  console.log('=== SUPER ADMIN DEBUG ===')
  console.log('Current user from auth store:', JSON.stringify(user, null, 2))
  console.log('User info from query:', JSON.stringify(userInfo?.user, null, 2))
  console.log('user?.super_admin:', user?.super_admin, typeof user?.super_admin)
  console.log('userInfo?.user?.super_admin:', userInfo?.user?.super_admin, typeof userInfo?.user?.super_admin)
  console.log('user?.account_id:', user?.account_id)
  console.log('userInfo?.user?.account_id:', userInfo?.user?.account_id)
  console.log('Final isSuperAdmin:', isSuperAdmin)
  console.log('========================')

  // Fetch all buckets from API
  // GET /api/v1/buckets
  const { data: bucketsData, isLoading, error: bucketsError } = useQuery({
    queryKey: ['buckets'],
    queryFn: async () => {
      try {
        const response = await bucketsAPI.getAll()
        console.log('Buckets API response:', response.data)
        // Handle both old format (just buckets array) and new format (buckets + global_buckets)
        if (Array.isArray(response.data)) {
          // Old format - all buckets in one array
          return {
            buckets: response.data as Bucket[],
            global_buckets: [] as Bucket[]
          }
        }
        // New format - separate arrays
        return {
          buckets: (response.data?.buckets || []) as Bucket[],
          global_buckets: (response.data?.global_buckets || []) as Bucket[]
        }
      } catch (err: any) {
        console.error('Error fetching buckets:', err)
        console.error('Error response:', err.response?.data)
        throw err
      }
    },
    retry: false, // Don't retry on error - show error immediately
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  })

  // Create new bucket mutation
  // POST /api/v1/buckets
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string; is_global?: boolean }) =>
      bucketsAPI.create(data),
    onSuccess: () => {
      // Refresh buckets list
      queryClient.invalidateQueries({ queryKey: ['buckets'] })
      // Close modal and reset form
      setShowCreateModal(false)
      setNewBucketName('')
      setNewBucketDescription('')
      setIsGlobalBucket(false)
      setError('')
    },
    onError: (err: any) => {
      setError(err.response?.data?.errors?.join(', ') || err.response?.data?.error || 'Failed to create bucket')
    },
  })

  // Delete bucket mutation
  // DELETE /api/v1/buckets/:id
  const deleteMutation = useMutation({
    mutationFn: (id: number) => bucketsAPI.delete(id),
    onSuccess: () => {
      // Refresh buckets list
      queryClient.invalidateQueries({ queryKey: ['buckets'] })
    },
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!newBucketName.trim()) {
      setError('Bucket name is required')
      return
    }
    
    const createData: { name: string; description: string; is_global?: boolean } = {
      name: newBucketName,
      description: newBucketDescription,
    }
    
    // Only include is_global if user is super admin and checkbox is checked
    if (isSuperAdmin && isGlobalBucket) {
      createData.is_global = true
    }
    
    createMutation.mutate(createData)
  }

  const handleDelete = (id: number, name: string, isGlobal: boolean) => {
    if (isGlobal && !isSuperAdmin) {
      setError('Only super admins can delete global buckets')
      return
    }
    
    if (window.confirm(`Are you sure you want to delete "${name}"? This will delete all images and schedules.`)) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="loading">Loading buckets...</div>
  }

  if (bucketsError) {
    const errorMessage = bucketsError instanceof Error 
      ? bucketsError.message 
      : (bucketsError as any)?.response?.data?.error || (bucketsError as any)?.message || 'Unknown error'
    return (
      <div className="buckets-page">
        <div className="error-message" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Failed to load buckets</h2>
          <p>{errorMessage}</p>
          <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '1rem' }}>
            Status: {(bucketsError as any)?.response?.status || 'N/A'}
          </p>
          <button 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['buckets'] })}
            style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const buckets = bucketsData?.buckets || []
  const globalBuckets = bucketsData?.global_buckets || []

  return (
    <div className="buckets-page">
      <div className="page-header">
        <h1>Content Buckets</h1>
        {isSuperAdmin && (
          <span style={{ 
            marginRight: '1rem', 
            padding: '0.25rem 0.75rem', 
            background: '#4CAF50', 
            color: 'white', 
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}>
            🔑 Super Admin
          </span>
        )}
        <button onClick={() => setShowCreateModal(true)} className="create-btn">
          + Create New Bucket
        </button>
      </div>

      {/* Global Buckets Section (visible to all users) */}
      {globalBuckets.length > 0 && (
        <div className="buckets-section">
          <h2 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.5rem', verticalAlign: 'middle'}}>
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
            Global Buckets
            <span className="section-badge">Shared with all users</span>
          </h2>
          <div className="buckets-grid">
            {globalBuckets.map((bucket) => (
              <div key={bucket.id} className="bucket-card global-bucket">
                <div className="bucket-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3>{bucket.name}</h3>
                    <span className="global-badge" title="Global bucket - available to all users">🌐</span>
                  </div>
                  {isSuperAdmin && (
                    <button
                      onClick={() => handleDelete(bucket.id, bucket.name, true)}
                      className="delete-btn"
                      title="Delete global bucket"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  )}
                </div>
                
                {bucket.description && (
                  <p className="bucket-description">{bucket.description}</p>
                )}
                
                {bucket.owner && (
                  <p className="bucket-owner" style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                    Created by: {bucket.owner.name}
                  </p>
                )}
                
                <div className="bucket-stats">
                  <div className="stat">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.25rem'}}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="stat-value">{bucket.images_count}</span>
                    <span className="stat-label">Images</span>
                  </div>
                  <div className="stat">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.25rem'}}>
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span className="stat-value">{bucket.schedules_count}</span>
                    <span className="stat-label">Schedules</span>
                  </div>
                </div>
                
                <div className="bucket-footer">
                  <button 
                    className="view-btn"
                    onClick={() => navigate(`/buckets/${bucket.id}/images`)}
                  >
                    View Images →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User's Own Buckets Section */}
      <div className="buckets-section" style={{ marginTop: globalBuckets.length > 0 ? '3rem' : '0' }}>
        <h2 className="section-title">Your Buckets</h2>
        {buckets.length === 0 ? (
          <div className="empty-state">
            <p>No buckets yet. Create your first bucket to get started!</p>
          </div>
        ) : (
          <div className="buckets-grid">
            {buckets.map((bucket) => (
              <div key={bucket.id} className="bucket-card">
                <div className="bucket-header">
                  <h3>{bucket.name}</h3>
                  <button
                    onClick={() => handleDelete(bucket.id, bucket.name, false)}
                    className="delete-btn"
                    title="Delete bucket"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
                
                {bucket.description && (
                  <p className="bucket-description">{bucket.description}</p>
                )}
                
                <div className="bucket-stats">
                  <div className="stat">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.25rem'}}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                      <circle cx="8.5" cy="8.5" r="1.5"/>
                      <polyline points="21 15 16 10 5 21"/>
                    </svg>
                    <span className="stat-value">{bucket.images_count}</span>
                    <span className="stat-label">Images</span>
                  </div>
                  <div className="stat">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.25rem'}}>
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span className="stat-value">{bucket.schedules_count}</span>
                    <span className="stat-label">Schedules</span>
                  </div>
                </div>
                
                <div className="bucket-footer">
                  <button 
                    className="view-btn"
                    onClick={() => navigate(`/buckets/${bucket.id}/images`)}
                  >
                    View Images →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Bucket Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Bucket</h2>
              <button onClick={() => setShowCreateModal(false)} className="close-btn">
                ✕
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="bucketName">Bucket Name *</label>
                <input
                  id="bucketName"
                  type="text"
                  value={newBucketName}
                  onChange={(e) => setNewBucketName(e.target.value)}
                  placeholder="e.g., Summer Promotions"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="bucketDescription">Description (optional)</label>
                <textarea
                  id="bucketDescription"
                  value={newBucketDescription}
                  onChange={(e) => setNewBucketDescription(e.target.value)}
                  placeholder="Describe this content collection..."
                  rows={3}
                />
              </div>
              
              {isSuperAdmin && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isGlobalBucket}
                      onChange={(e) => setIsGlobalBucket(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span>Make this a global bucket (visible to all users)</span>
                  </label>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem', marginLeft: '1.5rem' }}>
                    Global buckets are shared with all users and can only be edited or deleted by super admins.
                  </p>
                </div>
              )}
              
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="submit-btn"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Bucket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Buckets