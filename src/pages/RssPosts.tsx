import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import './RssPosts.css';

interface RssPost {
  id: number;
  title: string;
  description: string;
  content: string;
  image_url: string | null;
  original_url: string;
  published_at: string;
  is_viewed: boolean;
  short_title: string;
  short_description: string;
  has_image: boolean;
  display_image_url: string | null;
  social_media_content: string;
  formatted_published_at: string;
  relative_published_at: string;
  recent: boolean;
  created_at: string;
  updated_at: string;
}

interface RssFeed {
  id: number;
  name: string;
  url: string;
  description: string;
}

const RssPosts: React.FC = () => {
  const { feedId } = useParams<{ feedId: string }>();
  const navigate = useNavigate();
  const { user: _user } = useAuthStore();
  const [posts, setPosts] = useState<RssPost[]>([]);
  const [feed, setFeed] = useState<RssFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'viewed' | 'unviewed'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showBucketModal, setShowBucketModal] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState<number[]>([]);
  const [buckets, setBuckets] = useState<any[]>([]);
  const [newBucketName, setNewBucketName] = useState('');
  const [selectedImages, setSelectedImages] = useState<any[]>([]);

  useEffect(() => {
    if (feedId) {
      fetchPosts();
      fetchFeed();
    }
  }, [feedId, filter, page]);

  const fetchFeed = async () => {
    try {
      const response = await api.get(`/rss_feeds/${feedId}`);
      setFeed(response.data.rss_feed);
    } catch (error) {
      console.error('Error fetching feed:', error);
    }
  };

  const fetchBuckets = async () => {
    try {
      const response = await api.get('/buckets');
      setBuckets(response.data);
    } catch (error) {
      console.error('Error fetching buckets:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '20'
      });
      
      if (filter !== 'all') {
        params.append('viewed', filter === 'viewed' ? 'true' : 'false');
      }
      
      const response = await api.get(`/rss_feeds/${feedId}/posts?${params}`);
      setPosts(response.data.posts);
      setTotalPages(response.data.pagination.total_pages);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkViewed = async (postId: number) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (post?.is_viewed) {
        // Toggle back to unviewed
        await api.post(`/rss_posts/${postId}/mark_unviewed`);
      } else {
        // Mark as viewed
        await api.post(`/rss_posts/${postId}/mark_viewed`);
      }
      fetchPosts(); // Refresh the list
    } catch (error) {
      console.error('Error toggling post view status:', error);
    }
  };

  const handleMakeBucket = () => {
    if (selectedPosts.length === 0) {
      alert('Please select at least one post to add to a bucket');
      return;
    }
    
    // Get selected posts with images
    const postsWithImages = posts.filter(post => 
      selectedPosts.includes(post.id) && post.has_image
    );
    
    setSelectedImages(postsWithImages);
    setShowBucketModal(true);
    fetchBuckets();
  };

  const handleAddToExistingBucket = async (bucketId: number) => {
    try {
      for (const postId of selectedPosts) {
        const post = posts.find(p => p.id === postId);
        if (post && post.has_image) {
          // Create image record
          const imageResponse = await api.post('/images', {
            file_path: post.display_image_url || post.image_url,
            friendly_name: post.short_title || post.title.substring(0, 30)
          });
          
          // Add to bucket
          await api.post(`/buckets/${bucketId}/images`, {
            image_id: imageResponse.data.id,
            friendly_name: post.short_title || post.title.substring(0, 30)
          });
        }
      }
      
      // Mark posts as viewed
      for (const postId of selectedPosts) {
        await api.post(`/rss_posts/${postId}/mark_viewed`);
      }
      
      alert(`✅ Added ${selectedPosts.length} posts to bucket successfully!`);
      setShowBucketModal(false);
      setSelectedPosts([]);
      fetchPosts();
    } catch (error: any) {
      console.error('Error adding to bucket:', error);
      const errorMessage = error.response?.data?.error || 'Failed to add to bucket';
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleCreateNewBucket = async () => {
    if (!newBucketName.trim()) {
      alert('Please enter a bucket name');
      return;
    }
    
    try {
      // Create new bucket
      const bucketResponse = await api.post('/buckets', {
        name: newBucketName,
        description: `Created from RSS feed: ${feed?.name}`
      });
      
      const bucketId = bucketResponse.data.bucket.id;
      
      // Add selected images to the new bucket
      for (const postId of selectedPosts) {
        const post = posts.find(p => p.id === postId);
        if (post && post.has_image) {
          // Create image record
          const imageResponse = await api.post('/images', {
            file_path: post.display_image_url || post.image_url,
            friendly_name: post.short_title || post.title.substring(0, 30)
          });
          
          // Add to bucket
          await api.post(`/buckets/${bucketId}/images`, {
            image_id: imageResponse.data.id,
            friendly_name: post.short_title || post.title.substring(0, 30)
          });
        }
      }
      
      // Mark posts as viewed
      for (const postId of selectedPosts) {
        await api.post(`/rss_posts/${postId}/mark_viewed`);
      }
      
      const viewBucket = confirm(`✅ Created bucket "${newBucketName}" with ${selectedPosts.length} posts!\n\nWould you like to view the bucket?`);
      
      if (viewBucket) {
        navigate(`/buckets/${bucketId}/images`);
      }
      
      setShowBucketModal(false);
      setSelectedPosts([]);
      setNewBucketName('');
      fetchPosts();
    } catch (error: any) {
      console.error('Error creating bucket:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create bucket';
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const togglePostSelection = (postId: number) => {
    setSelectedPosts(prev => 
      prev.includes(postId) 
        ? prev.filter(id => id !== postId)
        : [...prev, postId]
    );
  };

  const removeImageFromSelection = (postId: number) => {
    setSelectedImages(prev => prev.filter(img => img.id !== postId));
    setSelectedPosts(prev => prev.filter(id => id !== postId));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string | null | undefined, maxLength: number = 150) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="rss-posts-container">
        <div className="loading">Loading posts...</div>
      </div>
    );
  }

  return (
    <div className="rss-posts-container">
      <div className="rss-posts-header">
        <div className="header-left">
          <button 
            className="back-button"
            onClick={() => navigate('/rss-feeds')}
          >
            ← Back to RSS Feeds
          </button>
          <div className="feed-info">
            <h1>{feed?.name || 'RSS Posts'}</h1>
            {feed?.description && <p>{feed.description}</p>}
          </div>
        </div>
      </div>

      <div className="posts-controls">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Posts
          </button>
          <button 
            className={`filter-tab ${filter === 'unviewed' ? 'active' : ''}`}
            onClick={() => setFilter('unviewed')}
          >
            Unviewed
          </button>
          <button 
            className={`filter-tab ${filter === 'viewed' ? 'active' : ''}`}
            onClick={() => setFilter('viewed')}
          >
            Viewed
          </button>
        </div>
        
        {selectedPosts.length > 0 && (
          <div className="selection-actions">
            <span className="selection-count">
              {selectedPosts.length} post{selectedPosts.length !== 1 ? 's' : ''} selected
            </span>
            <button 
              className="btn btn-primary"
              onClick={handleMakeBucket}
            >
              Make Bucket ({selectedPosts.length})
            </button>
          </div>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📰</div>
          <h3>No Posts Found</h3>
          <p>No posts match your current filter.</p>
        </div>
      ) : (
        <div className="posts-grid">
          {posts.map((post) => (
            <div key={post.id} className={`post-card ${selectedPosts.includes(post.id) ? 'selected' : ''}`}>
              <div className="post-header">
                <div className="post-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedPosts.includes(post.id)}
                    onChange={() => togglePostSelection(post.id)}
                  />
                </div>
                <h3 className="post-title">{post.title}</h3>
                <div className="post-status">
                  <span className={`status-badge ${post.is_viewed ? 'viewed' : 'unviewed'}`}>
                    {post.is_viewed ? 'Viewed' : 'Unviewed'}
                  </span>
                </div>
              </div>

              {post.display_image_url && (
                <div className="post-image">
                  <img 
                    src={post.display_image_url} 
                    alt={post.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="post-content">
                <p className="post-description">
                  {truncateText(post.description || post.content)}
                </p>
                
                <div className="post-meta">
                  <span className="post-date">
                    {formatDate(post.published_at)}
                  </span>
                  {post.original_url && (
                    <a 
                      href={post.original_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="original-link"
                    >
                      View Original
                    </a>
                  )}
                </div>
              </div>

              <div className="post-actions">
                <button 
                  className={`btn ${post.is_viewed ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => handleMarkViewed(post.id)}
                >
                  {post.is_viewed ? 'Mark as Unviewed' : 'Mark as Viewed'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="pagination-btn"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>
          <button 
            className="pagination-btn"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Bucket Creation Modal */}
      {showBucketModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create Bucket from RSS Posts</h2>
              <button 
                className="modal-close"
                onClick={() => setShowBucketModal(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="bucket-options">
                <h3>Choose an option:</h3>
                
                {/* Add to Existing Bucket */}
                <div className="option-section">
                  <h4>Add to Existing Bucket</h4>
                  {buckets.length > 0 ? (
                    <div className="bucket-list">
                      {buckets.map((bucket) => (
                        <button
                          key={bucket.id}
                          className="bucket-option"
                          onClick={() => handleAddToExistingBucket(bucket.id)}
                        >
                          <strong>{bucket.name}</strong>
                          <span>{bucket.description}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p>No existing buckets found.</p>
                  )}
                </div>
                
                {/* Create New Bucket */}
                <div className="option-section">
                  <h4>Create New Bucket</h4>
                  <div className="new-bucket-form">
                    <input
                      type="text"
                      placeholder="Enter bucket name"
                      value={newBucketName}
                      onChange={(e) => setNewBucketName(e.target.value)}
                      className="bucket-name-input"
                    />
                    <button
                      className="btn btn-primary"
                      onClick={handleCreateNewBucket}
                      disabled={!newBucketName.trim()}
                    >
                      Create New Bucket
                    </button>
                  </div>
                </div>
                
                {/* Show Selected Images */}
                {selectedImages.length > 0 && (
                  <div className="selected-images">
                    <h4>Images to be added ({selectedImages.length}):</h4>
                    <div className="image-preview-grid">
                      {selectedImages.map((post) => (
                        <div key={post.id} className="image-preview">
                          <img src={post.display_image_url} alt={post.title} />
                          <div className="image-info">
                            <p className="image-title">{post.short_title || post.title.substring(0, 30)}</p>
                            <button
                              className="remove-image-btn"
                              onClick={() => removeImageFromSelection(post.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RssPosts;
