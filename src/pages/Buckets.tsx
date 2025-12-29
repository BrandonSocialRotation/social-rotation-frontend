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
import { bucketsAPI } from '../services/api'
import './Buckets.css'

// TypeScript interface for Bucket data
interface Bucket {
  id: number
  name: string
  description: string
  user_id: number
  use_watermark: boolean
  post_once_bucket: boolean
  images_count: number
  schedules_count: number
  created_at: string
}

function Buckets() {
  const navigate = useNavigate()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBucketName, setNewBucketName] = useState('')
  const [newBucketDescription, setNewBucketDescription] = useState('')
  const [error, setError] = useState('')
  
  const queryClient = useQueryClient()

  // Fetch all buckets from API
  // GET /api/v1/buckets
  const { data: bucketsData, isLoading } = useQuery({
    queryKey: ['buckets'],
    queryFn: async () => {
      const response = await bucketsAPI.getAll()
      return response.data.buckets as Bucket[]
    },
  })

  // Create new bucket mutation
  // POST /api/v1/buckets
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      bucketsAPI.create(data),
    onSuccess: () => {
      // Refresh buckets list
      queryClient.invalidateQueries({ queryKey: ['buckets'] })
      // Close modal and reset form
      setShowCreateModal(false)
      setNewBucketName('')
      setNewBucketDescription('')
      setError('')
    },
    onError: (err: any) => {
      setError(err.response?.data?.errors?.join(', ') || 'Failed to create bucket')
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
    
    createMutation.mutate({
      name: newBucketName,
      description: newBucketDescription,
    })
  }

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? This will delete all images and schedules.`)) {
      deleteMutation.mutate(id)
    }
  }

  if (isLoading) {
    return <div className="loading">Loading buckets...</div>
  }

  const buckets = bucketsData || []

  return (
    <div className="buckets-page">
      <div className="page-header">
        <h1>Buckets</h1>
        <button onClick={() => setShowCreateModal(true)} className="create-btn">
          + Create New Bucket
        </button>
      </div>

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
                  onClick={() => handleDelete(bucket.id, bucket.name)}
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