import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import './Schedule.css';

interface Bucket {
  id: number;
  name: string;
}

interface BucketImage {
  id: number;
  friendly_name: string;
  image?: {
    source_url?: string;
    file_path?: string;
  };
}

interface BucketSchedule {
  id: number;
  bucket_id: number;
  bucket_image_id: number | null;
  schedule: string;
  schedule_type: number;
  post_to: number;
  description: string;
  twitter_description: string;
  times_sent: number;
  skip_image: number;
  created_at: string;
  updated_at: string;
  bucket_name?: string;
  facebook_page_id?: string;
  linkedin_organization_urn?: string;
}

// Schedule types
const SCHEDULE_TYPE_ROTATION = 1;
const SCHEDULE_TYPE_ONCE = 2;
const SCHEDULE_TYPE_ANNUALLY = 3;

// Social media platforms
const PLATFORMS = {
  FACEBOOK: 1,
  TWITTER: 2,
  INSTAGRAM: 4,
  LINKEDIN: 8,
  GMB: 16,
  PINTEREST: 32,
};

export default function Schedule() {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<BucketSchedule | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);
  const [scheduleType, setScheduleType] = useState<number>(SCHEDULE_TYPE_ROTATION);
  const [time, setTime] = useState('12:00');
  const [description, setDescription] = useState('');
  const [twitterDescription, setTwitterDescription] = useState('');
  
  // Social media platform checkboxes
  const [facebook, setFacebook] = useState(true);
  const [twitter, setTwitter] = useState(true);
  const [instagram, setInstagram] = useState(false);
  const [linkedin, setLinkedin] = useState(false);
  const [gmb, setGmb] = useState(false);
  const [pinterest, setPinterest] = useState(false);
  
  // Page selection for Facebook and LinkedIn
  const [facebookPages, setFacebookPages] = useState<Array<{id: string; name: string}>>([]);
  const [linkedInOrganizations, setLinkedInOrganizations] = useState<Array<{urn: string; name: string}>>([]);
  const [selectedFacebookPageId, setSelectedFacebookPageId] = useState<string>('');
  const [selectedLinkedInOrgUrn, setSelectedLinkedInOrgUrn] = useState<string>('');
  const [loadingPages, setLoadingPages] = useState(false);
  
  const [error, setError] = useState('');

  // Fetch bucket images when bucket is selected
  const { data: bucketImagesData, isLoading: imagesLoading } = useQuery({
    queryKey: ['bucket_images', selectedBucket],
    queryFn: async () => {
      if (!selectedBucket) return [];
      const response = await api.get(`/buckets/${selectedBucket}/images`);
      return response.data.bucket_images as BucketImage[];
    },
    enabled: !!selectedBucket,
  });

  // Fetch all schedules
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['bucket_schedules'],
    queryFn: async () => {
      const response = await api.get('/bucket_schedules');
      return response.data.bucket_schedules as BucketSchedule[];
    },
  });

  // Fetch buckets for dropdown
  const { data: bucketsData } = useQuery({
    queryKey: ['buckets'],
    queryFn: async () => {
      const response = await api.get('/buckets');
      return response.data.buckets as Bucket[];
    },
  });

  // Create schedule mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/bucket_schedules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket_schedules'] });
      setShowCreateModal(false);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.response?.data?.errors?.join(', ') || 'Failed to create schedule');
    },
  });

  // Update schedule mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await api.patch(`/bucket_schedules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket_schedules'] });
      setEditingSchedule(null);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.response?.data?.errors?.join(', ') || 'Failed to update schedule');
    },
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/bucket_schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket_schedules'] });
    },
  });

  // Post now mutation
  const postNowMutation = useMutation({
    mutationFn: (id: number) => api.post(`/scheduler/post_now/${id}`),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['bucket_schedules'] });
      alert(`Post sent successfully!\n\nResults:\n${JSON.stringify(response.data.results, null, 2)}`);
    },
    onError: (err: any) => {
      alert(`Failed to post: ${err.response?.data?.details || err.response?.data?.error || 'Unknown error'}`);
    },
  });

  const resetForm = () => {
    setSelectedBucket(null);
    setSelectedImage(null);
    setScheduleType(SCHEDULE_TYPE_ROTATION);
    setTime('12:00');
    setDescription('');
    setTwitterDescription('');
    setFacebook(true);
    setTwitter(true);
    setInstagram(false);
    setLinkedin(false);
    setGmb(false);
    setPinterest(false);
    setFacebookPages([]);
    setLinkedInOrganizations([]);
    setSelectedFacebookPageId('');
    setSelectedLinkedInOrgUrn('');
    setError('');
    setEditingSchedule(null);
  };

  // Load schedule data into form for editing
  const loadScheduleForEdit = async (schedule: BucketSchedule) => {
    setEditingSchedule(schedule);
    setSelectedBucket(schedule.bucket_id);
    setSelectedImage(schedule.bucket_image_id);
    setScheduleType(schedule.schedule_type);
    
    // Parse cron string to get time
    const cronParts = schedule.schedule.split(' ');
    if (cronParts.length >= 2) {
      const minute = cronParts[0].padStart(2, '0');
      const hour = cronParts[1].padStart(2, '0');
      setTime(`${hour}:${minute}`);
    }
    
    setDescription(schedule.description || '');
    setTwitterDescription(schedule.twitter_description || schedule.description || '');
    
    // Set platform checkboxes based on post_to flags
    const hasFacebook = (schedule.post_to & PLATFORMS.FACEBOOK) !== 0;
    const hasLinkedIn = (schedule.post_to & PLATFORMS.LINKEDIN) !== 0;
    
    setFacebook(hasFacebook);
    setTwitter((schedule.post_to & PLATFORMS.TWITTER) !== 0);
    setInstagram((schedule.post_to & PLATFORMS.INSTAGRAM) !== 0);
    setLinkedin(hasLinkedIn);
    setGmb((schedule.post_to & PLATFORMS.GMB) !== 0);
    setPinterest((schedule.post_to & PLATFORMS.PINTEREST) !== 0);
    
    // Fetch pages/organizations if needed, then set the selected IDs
    if (hasFacebook) {
      try {
        setLoadingPages(true);
        const response = await api.get('/user_info/facebook_pages');
        const pages = response.data.pages || [];
        setFacebookPages(pages);
        if (schedule.facebook_page_id) {
          setSelectedFacebookPageId(schedule.facebook_page_id);
        } else if (pages.length > 0) {
          setSelectedFacebookPageId(pages[0].id);
        }
      } catch (err) {
        console.error('Error fetching Facebook pages:', err);
      } finally {
        setLoadingPages(false);
      }
    }
    
    if (hasLinkedIn) {
      try {
        setLoadingPages(true);
        const response = await api.get('/user_info/linkedin_organizations');
        const organizations = response.data.organizations || [];
        setLinkedInOrganizations(organizations);
        if (schedule.linkedin_organization_urn) {
          setSelectedLinkedInOrgUrn(schedule.linkedin_organization_urn);
        } else if (organizations.length > 0) {
          setSelectedLinkedInOrgUrn(organizations[0].urn);
        }
      } catch (err) {
        console.error('Error fetching LinkedIn organizations:', err);
      } finally {
        setLoadingPages(false);
      }
    }
  };

  // Reset image selection when bucket changes
  useEffect(() => {
    setSelectedImage(null);
  }, [selectedBucket]);

  // Fetch pages when Facebook or LinkedIn is checked
  useEffect(() => {
    const fetchPages = async () => {
      if (facebook && facebookPages.length === 0 && !loadingPages) {
        try {
          setLoadingPages(true);
          console.log('Fetching Facebook pages...');
          const response = await api.get('/user_info/facebook_pages');
          console.log('Facebook pages response:', response.data);
          const pages = response.data.pages || [];
          setFacebookPages(pages);
          // Auto-select first page if none selected
          if (!selectedFacebookPageId && pages.length > 0) {
            setSelectedFacebookPageId(pages[0].id);
          }
        } catch (err: any) {
          console.error('Error fetching Facebook pages:', err);
          console.error('Error response:', err.response?.data);
          // Don't block the form if pages can't be loaded
        } finally {
          setLoadingPages(false);
        }
      }
      
      if (linkedin && linkedInOrganizations.length === 0 && !loadingPages) {
        try {
          setLoadingPages(true);
          console.log('Fetching LinkedIn organizations...');
          const response = await api.get('/user_info/linkedin_organizations');
          console.log('LinkedIn organizations response:', response.data);
          const organizations = response.data.organizations || [];
          setLinkedInOrganizations(organizations);
          // Auto-select first organization if none selected
          if (!selectedLinkedInOrgUrn && organizations.length > 0) {
            setSelectedLinkedInOrgUrn(organizations[0].urn);
          }
        } catch (err: any) {
          console.error('Error fetching LinkedIn organizations:', err);
          console.error('Error response:', err.response?.data);
          // Don't block the form if organizations can't be loaded
        } finally {
          setLoadingPages(false);
        }
      }
    };

    fetchPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facebook, linkedin]);

  const calculatePostTo = () => {
    let postTo = 0;
    if (facebook) postTo |= PLATFORMS.FACEBOOK;
    if (twitter) postTo |= PLATFORMS.TWITTER;
    if (instagram) postTo |= PLATFORMS.INSTAGRAM;
    if (linkedin) postTo |= PLATFORMS.LINKEDIN;
    if (gmb) postTo |= PLATFORMS.GMB;
    if (pinterest) postTo |= PLATFORMS.PINTEREST;
    return postTo;
  };

  const generateCronString = () => {
    const [hour, minute] = time.split(':');
    
    if (scheduleType === SCHEDULE_TYPE_ROTATION) {
      // Daily at specified time
      return `${minute} ${hour} * * *`;
    } else if (scheduleType === SCHEDULE_TYPE_ONCE) {
      // Once at specified time (today)
      const now = new Date();
      return `${minute} ${hour} ${now.getDate()} ${now.getMonth() + 1} *`;
    } else {
      // Annually (every year on today's date)
      const now = new Date();
      return `${minute} ${hour} ${now.getDate()} ${now.getMonth() + 1} *`;
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedBucket) {
      setError('Please select a bucket');
      return;
    }

    // For ONCE and ANNUALLY schedules, require image selection
    if ((scheduleType === SCHEDULE_TYPE_ONCE || scheduleType === SCHEDULE_TYPE_ANNUALLY) && !selectedImage) {
      setError('Please select an image for "Once" or "Annually" schedules');
      return;
    }

    const postTo = calculatePostTo();
    if (postTo === 0) {
      setError('Please select at least one social media platform');
      return;
    }

    const cronString = generateCronString();

    const scheduleData: any = {
      bucket_id: selectedBucket,
      schedule: cronString,
      schedule_type: scheduleType,
      post_to: postTo,
      description: description,
      twitter_description: twitterDescription || description,
    };

    // Include bucket_image_id if a specific image is selected
    if (selectedImage) {
      scheduleData.bucket_image_id = selectedImage;
    }

    // Include page IDs if Facebook or LinkedIn is selected
    if (facebook && selectedFacebookPageId) {
      scheduleData.facebook_page_id = selectedFacebookPageId;
    }
    if (linkedin && selectedLinkedInOrgUrn) {
      scheduleData.linkedin_organization_urn = selectedLinkedInOrgUrn;
    }

    createMutation.mutate({
      bucket_schedule: scheduleData,
    });
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!editingSchedule) return;

    if (!selectedBucket) {
      setError('Please select a bucket');
      return;
    }

    // For ONCE and ANNUALLY schedules, require image selection
    if ((scheduleType === SCHEDULE_TYPE_ONCE || scheduleType === SCHEDULE_TYPE_ANNUALLY) && !selectedImage) {
      setError('Please select an image for "Once" or "Annually" schedules');
      return;
    }

    const postTo = calculatePostTo();
    if (postTo === 0) {
      setError('Please select at least one social media platform');
      return;
    }

    const cronString = generateCronString();

    const scheduleData: any = {
      schedule: cronString,
      schedule_type: scheduleType,
      post_to: postTo,
      description: description,
      twitter_description: twitterDescription || description,
    };

    // Include bucket_image_id if a specific image is selected
    if (selectedImage) {
      scheduleData.bucket_image_id = selectedImage;
    } else {
      // If switching to rotation, clear the image
      scheduleData.bucket_image_id = null;
    }

    // Include page IDs if Facebook or LinkedIn is selected
    if (facebook && selectedFacebookPageId) {
      scheduleData.facebook_page_id = selectedFacebookPageId;
    } else {
      scheduleData.facebook_page_id = null;
    }
    if (linkedin && selectedLinkedInOrgUrn) {
      scheduleData.linkedin_organization_urn = selectedLinkedInOrgUrn;
    } else {
      scheduleData.linkedin_organization_urn = null;
    }

    updateMutation.mutate({
      id: editingSchedule.id,
      data: { bucket_schedule: scheduleData },
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this schedule?')) {
      deleteMutation.mutate(id);
    }
  };

  const handlePostNow = (id: number) => {
    if (window.confirm('Post this content now to all selected social media platforms?')) {
      postNowMutation.mutate(id);
    }
  };

  const getScheduleTypeName = (type: number) => {
    switch (type) {
      case SCHEDULE_TYPE_ROTATION:
        return 'Rotation';
      case SCHEDULE_TYPE_ONCE:
        return 'Once';
      case SCHEDULE_TYPE_ANNUALLY:
        return 'Annually';
      default:
        return 'Unknown';
    }
  };

  const getPlatformNames = (postTo: number) => {
    const platforms = [];
    if (postTo & PLATFORMS.FACEBOOK) platforms.push('Facebook');
    if (postTo & PLATFORMS.TWITTER) platforms.push('X');
    if (postTo & PLATFORMS.INSTAGRAM) platforms.push('Instagram');
    if (postTo & PLATFORMS.LINKEDIN) platforms.push('LinkedIn');
    if (postTo & PLATFORMS.GMB) platforms.push('GMB');
    if (postTo & PLATFORMS.PINTEREST) platforms.push('Pinterest');
    return platforms.join(', ');
  };

  if (schedulesLoading) {
    return <div className="loading">Loading schedules...</div>;
  }

  const schedules = schedulesData || [];
  const buckets = bucketsData || [];

  return (
    <div className="schedule-page">
      <div className="page-header">
        <h1>Schedules</h1>
        <button onClick={() => setShowCreateModal(true)} className="create-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Create Schedule
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="empty-state">
          <p>No schedules yet. Create your first schedule to start automating posts!</p>
        </div>
      ) : (
        <div className="schedules-list">
          {schedules.map((schedule) => (
            <div key={schedule.id} className="schedule-card">
              <div className="schedule-header">
                <div className="schedule-type-badge" data-type={schedule.schedule_type}>
                  {getScheduleTypeName(schedule.schedule_type)}
                </div>
                <div className="schedule-actions">
                  <button
                    onClick={() => loadScheduleForEdit(schedule)}
                    className="edit-btn"
                    title="Edit schedule"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={() => handlePostNow(schedule.id)}
                    className="post-now-btn"
                    title="Post now"
                    disabled={postNowMutation.isPending}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="delete-btn"
                    title="Delete schedule"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div className="schedule-info">
                <div className="info-row">
                  <span className="label">Bucket:</span>
                  <span className="value">{schedule.bucket_name || `Bucket #${schedule.bucket_id}`}</span>
                </div>
                <div className="info-row">
                  <span className="label">Schedule:</span>
                  <span className="value">{schedule.schedule}</span>
                </div>
                <div className="info-row">
                  <span className="label">Platforms:</span>
                  <span className="value">{getPlatformNames(schedule.post_to)}</span>
                </div>
                {schedule.description && (
                  <div className="info-row">
                    <span className="label">Description:</span>
                    <span className="value">{schedule.description}</span>
                  </div>
                )}
                <div className="info-row">
                  <span className="label">Times Sent:</span>
                  <span className="value">{schedule.times_sent}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Schedule Modal */}
      {(showCreateModal || editingSchedule) && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingSchedule(null); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}</h2>
              <button onClick={() => { setShowCreateModal(false); setEditingSchedule(null); resetForm(); }} className="close-btn">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <form onSubmit={editingSchedule ? handleUpdate : handleCreate}>
              <div className="form-group">
                <label htmlFor="bucket">Bucket *</label>
                <select
                  id="bucket"
                  value={selectedBucket || ''}
                  onChange={(e) => setSelectedBucket(Number(e.target.value))}
                  required
                  disabled={!!editingSchedule}
                >
                  <option value="">Select a bucket</option>
                  {buckets.map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>
                      {bucket.name}
                    </option>
                  ))}
                </select>
                {editingSchedule && <small style={{ color: '#666', marginTop: '4px', display: 'block' }}>Bucket cannot be changed after creation</small>}
              </div>

              {selectedBucket && (
                <div className="form-group">
                  <label htmlFor="image">Select Image *</label>
                  {imagesLoading ? (
                    <div>Loading images...</div>
                  ) : (
                    <select
                      id="image"
                      value={selectedImage || ''}
                      onChange={(e) => setSelectedImage(e.target.value ? Number(e.target.value) : null)}
                      required={scheduleType === SCHEDULE_TYPE_ONCE || scheduleType === SCHEDULE_TYPE_ANNUALLY}
                    >
                      <option value="">
                        {scheduleType === SCHEDULE_TYPE_ROTATION 
                          ? 'All Images (Rotation)' 
                          : 'Select an image'}
                      </option>
                      {(bucketImagesData || []).map((image) => (
                        <option key={image.id} value={image.id}>
                          {image.friendly_name}
                        </option>
                      ))}
                    </select>
                  )}
                  {selectedBucket && !imagesLoading && (!bucketImagesData || bucketImagesData.length === 0) && (
                    <small className="error-text">This bucket has no images. Please add images first.</small>
                  )}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="scheduleType">Schedule Type *</label>
                <select
                  id="scheduleType"
                  value={scheduleType}
                  onChange={(e) => {
                    setScheduleType(Number(e.target.value));
                    // Clear image selection when switching to rotation
                    if (Number(e.target.value) === SCHEDULE_TYPE_ROTATION) {
                      setSelectedImage(null);
                    }
                  }}
                  required
                >
                  <option value={SCHEDULE_TYPE_ROTATION}>Rotation (Daily) - All Images</option>
                  <option value={SCHEDULE_TYPE_ONCE}>Once - Single Image</option>
                  <option value={SCHEDULE_TYPE_ANNUALLY}>Annually - Single Image</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="time">Time *</label>
                <input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Post To Platforms *</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={facebook} onChange={(e) => setFacebook(e.target.checked)} />
                    <span>Facebook</span>
                  </label>
                  {facebook && (
                    <div className="page-selection" style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
                      <select
                        value={selectedFacebookPageId}
                        onChange={(e) => setSelectedFacebookPageId(e.target.value)}
                        disabled={loadingPages}
                        style={{ width: '100%', padding: '6px', fontSize: '14px' }}
                      >
                        {loadingPages ? (
                          <option>Loading pages...</option>
                        ) : facebookPages.length === 0 ? (
                          <option>No pages available</option>
                        ) : (
                          <>
                            <option value="">Select a page...</option>
                            {facebookPages.map((page) => (
                              <option key={page.id} value={page.id}>
                                {page.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  )}
                  <label className="checkbox-label">
                    <input type="checkbox" checked={twitter} onChange={(e) => setTwitter(e.target.checked)} />
                    <span>X</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={instagram} onChange={(e) => setInstagram(e.target.checked)} />
                    <span>Instagram</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={linkedin} onChange={(e) => setLinkedin(e.target.checked)} />
                    <span>LinkedIn</span>
                  </label>
                  {linkedin && (
                    <div className="page-selection" style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '8px' }}>
                      <select
                        value={selectedLinkedInOrgUrn}
                        onChange={(e) => setSelectedLinkedInOrgUrn(e.target.value)}
                        disabled={loadingPages}
                        style={{ width: '100%', padding: '6px', fontSize: '14px' }}
                      >
                        {loadingPages ? (
                          <option>Loading organizations...</option>
                        ) : linkedInOrganizations.length === 0 ? (
                          <option>No organizations available</option>
                        ) : (
                          <>
                            <option value="">Select an organization...</option>
                            {linkedInOrganizations.map((org) => (
                              <option key={org.urn} value={org.urn}>
                                {org.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </div>
                  )}
                  <label className="checkbox-label">
                    <input type="checkbox" checked={gmb} onChange={(e) => setGmb(e.target.checked)} />
                    <span>Google My Business</span>
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={pinterest} onChange={(e) => setPinterest(e.target.checked)} />
                    <span>Pinterest</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description (optional)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Post description for Facebook, LinkedIn, etc."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="twitterDescription">X Description (optional)</label>
                <textarea
                  id="twitterDescription"
                  value={twitterDescription}
                  onChange={(e) => setTwitterDescription(e.target.value)}
                  placeholder="X-specific description (280 characters max)"
                  rows={2}
                  maxLength={280}
                />
                <small>{twitterDescription.length}/280 characters</small>
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => { setShowCreateModal(false); setEditingSchedule(null); resetForm(); }} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" disabled={editingSchedule ? updateMutation.isPending : createMutation.isPending} className="submit-btn">
                  {editingSchedule 
                    ? (updateMutation.isPending ? 'Updating...' : 'Update Schedule')
                    : (createMutation.isPending ? 'Creating...' : 'Create Schedule')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
