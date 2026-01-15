import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import './Schedule.css';

interface Bucket {
  id: number;
  name: string;
  is_global?: boolean;
}

interface BucketImage {
  id: number;
  friendly_name: string;
  image?: {
    source_url?: string;
    file_path?: string;
  };
}

interface ScheduleItem {
  id: number;
  bucket_image_id: number;
  schedule: string;
  description: string;
  twitter_description: string;
  position: number;
  bucket_image?: {
    id: number;
    friendly_name: string;
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
  name?: string;
  facebook_page_id?: string;
  linkedin_organization_urn?: string;
  schedule_items?: ScheduleItem[];
}

// Schedule type - only MULTIPLE is supported now
const SCHEDULE_TYPE_MULTIPLE = 4;

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
  const [selectedImages, setSelectedImages] = useState<number[]>([]); // Selected images from bucket
  const [scheduleName, setScheduleName] = useState('');
  
  // For multiple images with different times - array of {imageId, dateTime, description, twitterDescription}
  const [scheduleItems, setScheduleItems] = useState<Array<{
    imageId: number;
    dateTime: string;
    description: string;
    twitterDescription: string;
  }>>([]);
  
  // Social media platform checkboxes
  const [facebook, setFacebook] = useState(true);
  const [twitter, setTwitter] = useState(true);
  const [instagram, setInstagram] = useState(false);
  const [linkedin, setLinkedin] = useState(false);
  const [gmb, setGmb] = useState(false);
  const [pinterest, setPinterest] = useState(false);
  
  // Selected pages/organizations
  const [selectedFacebookPage, setSelectedFacebookPage] = useState<string>('');
  const [selectedLinkedInOrg, setSelectedLinkedInOrg] = useState<string>('');
  const [selectedInstagramAccount, setSelectedInstagramAccount] = useState<string>('');
  
  const [error, setError] = useState('');

  // Note: datetime-local input always uses browser's local timezone
  // This is the most reliable approach - what you see is what you get

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

  // Fetch buckets for dropdown (includes both user buckets and global buckets)
  const { data: bucketsData } = useQuery({
    queryKey: ['buckets'],
    queryFn: async () => {
      const response = await api.get('/buckets');
      const userBuckets = (response.data.buckets || []) as Bucket[];
      const globalBuckets = (response.data.global_buckets || []) as Bucket[];
      // Combine both arrays for the dropdown
      return [...userBuckets, ...globalBuckets];
    },
  });

  // Fetch Facebook pages (with Instagram accounts) - always fetch so we can show them
  const { data: facebookPagesData, isLoading: facebookPagesLoading, error: facebookPagesError } = useQuery({
    queryKey: ['facebook_pages'],
    queryFn: async () => {
      const response = await api.get('/user_info/facebook_pages');
      return response.data.pages as Array<{
        id: string;
        name: string;
        access_token: string;
        instagram_account?: { id: string; username: string };
      }>;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch LinkedIn organizations - always fetch so we can show them
  const { data: linkedinOrgsData, isLoading: linkedinOrgsLoading, error: linkedinOrgsError } = useQuery({
    queryKey: ['linkedin_organizations'],
    queryFn: async () => {
      const response = await api.get('/user_info/linkedin_organizations');
      return response.data.organizations as Array<{
        id: string;
        name: string;
        urn: string;
      }>;
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Create schedule mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/bucket_schedules', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket_schedules'] });
      setShowCreateModal(false);
      setEditingSchedule(null);
      resetForm();
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.response?.data?.errors?.join(', ') || 'Failed to create schedule';
      setError(errorMessage);
    },
  });

  // Delete schedule mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/bucket_schedules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket_schedules'] });
    },
  });

  // Update schedule mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await api.patch(`/bucket_schedules/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bucket_schedules'] });
      setShowCreateModal(false);
      setEditingSchedule(null);
      resetForm();
    },
    onError: (err: any) => {
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.response?.data?.errors?.join(', ') || 'Failed to update schedule';
      setError(errorMessage);
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
      const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Unknown error';
      alert(`Failed to post: ${errorMessage}`);
    },
  });

  const resetForm = () => {
    setEditingSchedule(null);
    setSelectedBucket(null);
    setSelectedImages([]);
    setScheduleItems([]);
    setScheduleName('');
    setFacebook(true);
    setTwitter(true);
    setInstagram(false);
    setLinkedin(false);
    setGmb(false);
    setPinterest(false);
    setSelectedFacebookPage('');
    setSelectedLinkedInOrg('');
    setSelectedInstagramAccount('');
    setError('');
  };

  // Reset image selection when bucket changes
  useEffect(() => {
    setSelectedImages([]);
    setScheduleItems([]);
  }, [selectedBucket]);

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

  const generateCronString = (dateTimeStr: string) => {
    // Parse dateTime (format: YYYY-MM-DDTHH:mm from datetime-local input)
    // datetime-local input always gives time in browser's local timezone
    // We convert browser local time -> UTC for server-side cron matching
    
    try {
      // Parse the string manually
      const [datePart, timePart] = dateTimeStr.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      
      // Validate parsed values
      if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
        console.error('Invalid date/time values');
        const now = new Date();
        return `${now.getMinutes()} ${now.getHours()} ${now.getDate()} ${now.getMonth() + 1} *`;
      }
      
      // NO CONVERSION - Store EXACTLY as user entered it
      // Backend will check against user's timezone
      return `${minute} ${hour} ${day} ${month} *`;
    } catch (error) {
      console.error('Error in generateCronString:', error);
      // Fallback to current time (local, not UTC)
      const now = new Date();
      return `${now.getMinutes()} ${now.getHours()} ${now.getDate()} ${now.getMonth() + 1} *`;
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedBucket) {
      setError('Please select a bucket');
      return;
    }

    // Require at least one schedule item
    if (scheduleItems.length === 0) {
      setError('Please select at least one image and configure its schedule');
      return;
    }

    // Validate all items have image and time
    const invalidItems = scheduleItems.filter(item => !item.imageId || !item.dateTime);
    if (invalidItems.length > 0) {
      setError('Please ensure all selected images have a date and time configured');
      return;
    }

    const postTo = calculatePostTo();
    if (postTo === 0) {
      setError('Please select at least one social media platform');
      return;
    }

    // Create schedule with multiple items
    const scheduleData: any = {
      bucket_id: selectedBucket,
      schedule: generateCronString(scheduleItems[0].dateTime), // Use first item's time as base schedule
      schedule_type: SCHEDULE_TYPE_MULTIPLE,
      post_to: postTo,
      name: scheduleName || `Schedule ${new Date().toLocaleDateString()}`,
      description: '', // No global description for multiple images
      twitter_description: '', // No global description for multiple images
      schedule_items: scheduleItems.map((item) => ({
        bucket_image_id: item.imageId,
        schedule: generateCronString(item.dateTime),
        description: item.description || '',
        twitter_description: item.twitterDescription || item.description || ''
      }))
    };

    // Include page/organization selections
    // Edge case: If Facebook is selected but no page is chosen, warn user
    if (facebook && !selectedFacebookPage && facebookPagesData && facebookPagesData.length > 0) {
      setError('Please select a Facebook page when posting to Facebook');
      return;
    }
    
    if (facebook && selectedFacebookPage) {
      scheduleData.facebook_page_id = selectedFacebookPage;
    }
    
    // Edge case: If LinkedIn is selected but no organization is chosen, warn user
    if (linkedin && !selectedLinkedInOrg && linkedinOrgsData && linkedinOrgsData.length > 0) {
      setError('Please select a LinkedIn organization when posting to LinkedIn');
      return;
    }
    
    if (linkedin && selectedLinkedInOrg) {
      scheduleData.linkedin_organization_urn = selectedLinkedInOrg;
    }
    
    // For Instagram, use the Facebook page that has the Instagram account
    // Instagram posts through Facebook pages, so we need the page ID
    // Edge case: If Instagram is selected but no account is chosen, warn user
    if (instagram && !selectedInstagramAccount) {
      const hasInstagramAccounts = facebookPagesData?.some(p => p.instagram_account);
      if (hasInstagramAccounts) {
        setError('Please select an Instagram account when posting to Instagram');
        return;
      } else if (!facebookPagesData || facebookPagesData.length === 0) {
        setError('Please connect Facebook with an Instagram Business account first');
        return;
      }
    }
    
    if (instagram && selectedInstagramAccount) {
      // Find the page that has this Instagram account
      const pageWithInstagram = facebookPagesData?.find(p => p.instagram_account?.id === selectedInstagramAccount);
      if (pageWithInstagram) {
        scheduleData.facebook_page_id = pageWithInstagram.id;
      } else {
        // Edge case: Selected Instagram account not found in pages data
        setError('Selected Instagram account is no longer available. Please refresh and try again.');
        return;
      }
    }

    createMutation.mutate({
      bucket_schedule: scheduleData,
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

  const handleEdit = (schedule: BucketSchedule) => {
    setEditingSchedule(schedule);
    setSelectedBucket(schedule.bucket_id);
    setScheduleName(schedule.name || '');
    
    // Set platforms based on post_to flags
    setFacebook((schedule.post_to & PLATFORMS.FACEBOOK) !== 0);
    setTwitter((schedule.post_to & PLATFORMS.TWITTER) !== 0);
    setInstagram((schedule.post_to & PLATFORMS.INSTAGRAM) !== 0);
    setLinkedin((schedule.post_to & PLATFORMS.LINKEDIN) !== 0);
    setGmb((schedule.post_to & PLATFORMS.GMB) !== 0);
    setPinterest((schedule.post_to & PLATFORMS.PINTEREST) !== 0);
    
    // Set Facebook page and LinkedIn organization if they exist
    if (schedule.facebook_page_id) {
      setSelectedFacebookPage(schedule.facebook_page_id);
      // If Instagram is enabled, find the Instagram account for this page
      if ((schedule.post_to & PLATFORMS.INSTAGRAM) !== 0 && facebookPagesData) {
        const page = facebookPagesData.find(p => p.id === schedule.facebook_page_id);
        if (page?.instagram_account) {
          setSelectedInstagramAccount(page.instagram_account.id);
        }
      }
    }
    if (schedule.linkedin_organization_urn) {
      setSelectedLinkedInOrg(schedule.linkedin_organization_urn);
    }
    
    // Load schedule items if they exist
    if (schedule.schedule_items && schedule.schedule_items.length > 0) {
      const imageIds = schedule.schedule_items.map(item => item.bucket_image_id);
      setSelectedImages(imageIds);
      
      // Convert schedule items to the format used in the form
      const items = schedule.schedule_items.map(item => {
        // Parse cron string (UTC) to datetime-local format (user's timezone)
        const parts = item.schedule.split(' ');
        if (parts.length === 5) {
          const [minute, hour, day, month] = parts;
          const now = new Date();
          const year = now.getFullYear();
          const monthNum = month === '*' ? now.getMonth() + 1 : parseInt(month);
          const dayNum = day === '*' ? now.getDate() : parseInt(day);
          const hourNum = hour === '*' ? 12 : parseInt(hour);
          const minNum = minute === '*' ? 0 : parseInt(minute);
          
          // NO CONVERSION - Display time exactly as stored
          // Cron string stores time in user's timezone, display as-is
          const dateTimeStr = `${year}-${String(monthNum).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}T${String(hourNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`;
          
          return {
            imageId: item.bucket_image_id,
            dateTime: dateTimeStr,
            description: item.description || '',
            twitterDescription: item.twitter_description || ''
          };
        }
        // Fallback if cron parsing fails
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return {
          imageId: item.bucket_image_id,
          dateTime: `${year}-${month}-${day}T12:00`,
          description: item.description || '',
          twitterDescription: item.twitter_description || ''
        };
      });
      setScheduleItems(items);
    } else {
      // Legacy schedule - no schedule_items
      setSelectedImages(schedule.bucket_image_id ? [schedule.bucket_image_id] : []);
      setScheduleItems([]);
    }
    
    setShowCreateModal(true);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule) return;
    
    setError('');

    if (!selectedBucket) {
      setError('Please select a bucket');
      return;
    }

    // Require at least one schedule item
    if (scheduleItems.length === 0) {
      setError('Please select at least one image and configure its schedule');
      return;
    }

    // Validate all items have image and time
    const invalidItems = scheduleItems.filter(item => !item.imageId || !item.dateTime);
    if (invalidItems.length > 0) {
      setError('Please ensure all selected images have a date and time configured');
      return;
    }

    const postTo = calculatePostTo();
    if (postTo === 0) {
      setError('Please select at least one social media platform');
      return;
    }

    // Create update data
    const scheduleData: any = {
      bucket_id: selectedBucket,
      schedule: generateCronString(scheduleItems[0].dateTime), // Use first item's time as base schedule
      schedule_type: SCHEDULE_TYPE_MULTIPLE,
      post_to: postTo,
      name: scheduleName || `Schedule ${new Date().toLocaleDateString()}`,
      description: '',
      twitter_description: '',
      schedule_items: scheduleItems.map((item) => ({
        id: editingSchedule.schedule_items?.find(si => si.bucket_image_id === item.imageId)?.id, // Preserve existing IDs
        bucket_image_id: item.imageId,
        schedule: generateCronString(item.dateTime),
        description: item.description || '',
        twitter_description: item.twitterDescription || item.description || ''
      }))
    };

    // Include page/organization selections
    if (facebook && selectedFacebookPage) {
      scheduleData.facebook_page_id = selectedFacebookPage;
    }
    
    if (linkedin && selectedLinkedInOrg) {
      scheduleData.linkedin_organization_urn = selectedLinkedInOrg;
    }
    
    if (instagram && selectedInstagramAccount) {
      const pageWithInstagram = facebookPagesData?.find(p => p.instagram_account?.id === selectedInstagramAccount);
      if (pageWithInstagram) {
        scheduleData.facebook_page_id = pageWithInstagram.id;
      }
    }

    updateMutation.mutate({
      id: editingSchedule.id,
      data: { bucket_schedule: scheduleData }
    });
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

  // Parse cron string to readable date/time
  const getScheduledDateTime = (schedule: string): string => {
    if (!schedule) return 'Not scheduled';
    
    const parts = schedule.split(' ');
    if (parts.length !== 5) return schedule; // Return as-is if invalid format
    
    const [minute, hour, day, month] = parts;
    const hourNum = parseInt(hour);
    const minNum = parseInt(minute);
    const period = hourNum >= 12 ? 'PM' : 'AM';
    const displayHour = hourNum > 12 ? hourNum - 12 : (hourNum === 0 ? 12 : hourNum);
    
    // Check if it's a daily rotation (day and month are *)
    if (day === '*' && month === '*') {
      return `Daily at ${displayHour}:${minNum.toString().padStart(2, '0')} ${period}`;
    }
    
    // Specific date and time
    const now = new Date();
    const year = now.getFullYear();
    const monthNum = month === '*' ? now.getMonth() + 1 : parseInt(month);
    const dayNum = day === '*' ? now.getDate() : parseInt(day);
    
    const scheduleDate = new Date(year, monthNum - 1, dayNum, hourNum, minNum);
    
    return scheduleDate.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }) + ` at ${displayHour}:${minNum.toString().padStart(2, '0')} ${period}`;
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
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={async () => {
              try {
                const response = await api.post('/scheduler/process_now');
                alert(`Scheduler triggered!\n\nCheck backend logs to see if any posts were sent.\n\nResponse: ${JSON.stringify(response.data, null, 2)}`);
                queryClient.invalidateQueries({ queryKey: ['bucket_schedules'] });
              } catch (err: any) {
                alert(`Error: ${err.response?.data?.message || err.message}`);
              }
            }} 
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              cursor: 'pointer' 
            }}
          >
            Test Scheduler Now
          </button>
          <button onClick={() => setShowCreateModal(true)} className="create-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Schedule
          </button>
        </div>
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
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600' }}>
                    {schedule.name || `Schedule #${schedule.id}`}
                  </h3>
                  {schedule.schedule_items && schedule.schedule_items.length > 0 ? (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      {schedule.schedule_items.length} image{schedule.schedule_items.length !== 1 ? 's' : ''} scheduled
                    </div>
                  ) : (
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      {getScheduledDateTime(schedule.schedule)}
                    </div>
                  )}
                </div>
                <div className="schedule-actions">
                  <button
                    onClick={() => handleEdit(schedule)}
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
                  <span className="label">Platforms:</span>
                  <span className="value">{getPlatformNames(schedule.post_to)}</span>
                </div>
                {schedule.description && (
                  <div className="info-row">
                    <span className="label">Description:</span>
                    <span className="value">{schedule.description}</span>
                  </div>
                )}
                {schedule.schedule_items && schedule.schedule_items.length > 0 && (
                  <div className="info-row">
                    <span className="label">Scheduled Images:</span>
                    <div style={{ marginTop: '5px' }}>
                      {schedule.schedule_items.map((item: any, idx: number) => (
                        <div key={item.id || idx} style={{ 
                          marginBottom: '8px', 
                          padding: '8px', 
                          backgroundColor: '#f5f5f5', 
                          borderRadius: '4px',
                          fontSize: '13px'
                        }}>
                          <strong>{item.bucket_image?.friendly_name || `Image ${idx + 1}`}</strong>
                          <div style={{ color: '#666', marginTop: '4px' }}>
                            {getScheduledDateTime(item.schedule)}
                          </div>
                          {item.description && (
                            <div style={{ color: '#666', marginTop: '4px', fontSize: '12px' }}>
                              {item.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
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
      {showCreateModal && (
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
                <label htmlFor="scheduleName">Schedule Name *</label>
                <input
                  id="scheduleName"
                  type="text"
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="bucket">Bucket *</label>
                <select
                  id="bucket"
                  value={selectedBucket || ''}
                  onChange={(e) => setSelectedBucket(Number(e.target.value))}
                  required
                >
                  <option value="">Select a bucket</option>
                  {buckets.map((bucket) => (
                    <option key={bucket.id} value={bucket.id}>
                      {bucket.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBucket && (
                <div className="form-group">
                  {!imagesLoading && (!bucketImagesData || bucketImagesData.length === 0) ? (
                    <div style={{ 
                      padding: '12px', 
                      backgroundColor: '#fff3cd', 
                      border: '1px solid #ffc107', 
                      borderRadius: '4px',
                      color: '#856404'
                    }}>
                      <strong>No images in this bucket</strong>
                      <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>
                        This bucket doesn't have any images. Please add images to the bucket before creating a schedule.
                      </p>
                    </div>
                  ) : (
                    <>
                      <label>Select Images to Schedule *</label>
                      {imagesLoading ? (
                        <div>Loading images...</div>
                      ) : (
                        <>
                          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '10px', marginBottom: '15px' }}>
                            {(bucketImagesData || []).map((image) => (
                              <label key={image.id} style={{ display: 'block', marginBottom: '8px', cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={selectedImages.includes(image.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedImages([...selectedImages, image.id]);
                                      // Auto-add to scheduleItems with default time
                                      const now = new Date();
                                      now.setHours(12, 0, 0, 0);
                                      setScheduleItems([...scheduleItems, {
                                        imageId: image.id,
                                        dateTime: now.toISOString().slice(0, 16),
                                        description: '',
                                        twitterDescription: ''
                                      }]);
                                    } else {
                                      setSelectedImages(selectedImages.filter(id => id !== image.id));
                                      // Remove from scheduleItems
                                      setScheduleItems(scheduleItems.filter(item => item.imageId !== image.id));
                                    }
                                  }}
                                />
                                <span style={{ marginLeft: '8px' }}>{image.friendly_name}</span>
                              </label>
                            ))}
                          </div>
                          
                          {selectedImages.length > 0 && (
                            <>
                              <label style={{ marginTop: '20px', marginBottom: '10px', display: 'block', fontWeight: '600' }}>
                                Configure Each Image's Schedule:
                              </label>
                              {scheduleItems
                                .filter(item => selectedImages.includes(item.imageId))
                                .map((item, index) => {
                                  const image = (bucketImagesData || []).find(img => img.id === item.imageId);
                                  return (
                                    <div key={item.imageId} style={{ 
                                      border: '1px solid #ddd', 
                                      borderRadius: '4px', 
                                      padding: '15px', 
                                      marginBottom: '15px',
                                      backgroundColor: '#f9f9f9'
                                    }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                        <strong style={{ fontSize: '16px' }}>{image?.friendly_name || `Image ${index + 1}`}</strong>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSelectedImages(selectedImages.filter(id => id !== item.imageId));
                                            setScheduleItems(scheduleItems.filter(i => i.imageId !== item.imageId));
                                          }}
                                          style={{ 
                                            padding: '4px 8px', 
                                            backgroundColor: '#f44336', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '12px'
                                          }}
                                        >
                                          Remove
                                        </button>
                                      </div>
                                      
                                      <div style={{ marginBottom: '10px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Date & Time *</label>
                                        <input
                                          type="datetime-local"
                                          value={item.dateTime}
                                          onChange={(e) => {
                                            const newItems = [...scheduleItems];
                                            const itemIndex = newItems.findIndex(i => i.imageId === item.imageId);
                                            if (itemIndex >= 0) {
                                              newItems[itemIndex].dateTime = e.target.value;
                                              setScheduleItems(newItems);
                                            }
                                          }}
                                          required
                                          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                        />
                                      </div>
                                      
                                      <div style={{ marginBottom: '10px' }}>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Description</label>
                                        <textarea
                                          value={item.description}
                                          onChange={(e) => {
                                            const newItems = [...scheduleItems];
                                            const itemIndex = newItems.findIndex(i => i.imageId === item.imageId);
                                            if (itemIndex >= 0) {
                                              newItems[itemIndex].description = e.target.value;
                                              setScheduleItems(newItems);
                                            }
                                          }}
                                          rows={3}
                                          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                          placeholder="Post description for this image..."
                                        />
                                      </div>
                                      
                                      <div>
                                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Twitter Description (optional)</label>
                                        <textarea
                                          value={item.twitterDescription}
                                          onChange={(e) => {
                                            const newItems = [...scheduleItems];
                                            const itemIndex = newItems.findIndex(i => i.imageId === item.imageId);
                                            if (itemIndex >= 0) {
                                              newItems[itemIndex].twitterDescription = e.target.value;
                                              setScheduleItems(newItems);
                                            }
                                          }}
                                          rows={2}
                                          style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                                          placeholder="Twitter-specific description (280 char limit)..."
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                            </>
                          )}
                          
                          {selectedImages.length === 0 && (
                            <small style={{ color: '#666', display: 'block', marginTop: '10px' }}>
                              Select images above to configure their individual schedules
                            </small>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Post To Platforms *</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={facebook} onChange={(e) => setFacebook(e.target.checked)} />
                    <span>Facebook</span>
                  </label>
                  {facebook && (
                    <div className="platform-select" style={{ marginLeft: '20px', marginTop: '5px', marginBottom: '10px' }}>
                      {facebookPagesLoading ? (
                        <small>Loading pages...</small>
                      ) : facebookPagesError ? (
                        <small style={{ color: '#d32f2f' }}>
                          {(facebookPagesError as any).response?.data?.error || 'Failed to load Facebook pages'}
                        </small>
                      ) : facebookPagesData && facebookPagesData.length > 0 ? (
                        <select
                          value={selectedFacebookPage}
                          onChange={(e) => {
                            setSelectedFacebookPage(e.target.value);
                            // Auto-select Instagram if this page has an Instagram account
                            const page = facebookPagesData.find(p => p.id === e.target.value);
                            if (page?.instagram_account && !instagram) {
                              setInstagram(true);
                              setSelectedInstagramAccount(page.instagram_account.id);
                            }
                          }}
                          style={{ width: '100%', padding: '5px' }}
                        >
                          <option value="">Select Facebook Page</option>
                          {facebookPagesData.map((page) => (
                            <option key={page.id} value={page.id}>
                              {page.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <small style={{ color: '#666' }}>No Facebook pages found. Please connect Facebook first.</small>
                      )}
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
                  {instagram && (
                    <div className="platform-select" style={{ marginLeft: '20px', marginTop: '5px', marginBottom: '10px' }}>
                      {facebookPagesLoading ? (
                        <small>Loading Instagram accounts...</small>
                      ) : facebookPagesError ? (
                        <small style={{ color: '#d32f2f' }}>
                          {(facebookPagesError as any).response?.data?.error || 'Failed to load Instagram accounts'}
                        </small>
                      ) : facebookPagesData && facebookPagesData.some(p => p.instagram_account) ? (
                        <select
                          value={selectedInstagramAccount}
                          onChange={(e) => {
                            setSelectedInstagramAccount(e.target.value);
                            // Find the page with this Instagram account and select it
                            const page = facebookPagesData.find(p => p.instagram_account?.id === e.target.value);
                            if (page) {
                              setSelectedFacebookPage(page.id);
                              if (!facebook) setFacebook(true);
                            }
                          }}
                          style={{ width: '100%', padding: '5px' }}
                        >
                          <option value="">Select Instagram Account</option>
                          {facebookPagesData
                            .filter(page => page.instagram_account)
                            .map((page) => (
                              <option key={page.instagram_account!.id} value={page.instagram_account!.id}>
                                @{page.instagram_account!.username} (via {page.name})
                              </option>
                            ))}
                        </select>
                      ) : facebookPagesData && facebookPagesData.length > 0 ? (
                        <small style={{ color: '#666' }}>
                          Your Instagram account is not a Business or Creator account. Personal accounts cannot be posted to. 
                          Please change your account status if you want to be able to post.
                        </small>
                      ) : (
                        <small style={{ color: '#666' }}>
                          No Instagram accounts found. Instagram posting requires a Business or Creator account linked to a Facebook Page. 
                          Personal Instagram accounts cannot be used for API posting. Please convert your account to Business/Creator and link it to a Facebook Page.
                        </small>
                      )}
                    </div>
                  )}
                  <label className="checkbox-label">
                    <input type="checkbox" checked={linkedin} onChange={(e) => setLinkedin(e.target.checked)} />
                    <span>LinkedIn</span>
                  </label>
                  {linkedin && (
                    <div className="platform-select" style={{ marginLeft: '20px', marginTop: '5px', marginBottom: '10px' }}>
                      {linkedinOrgsLoading ? (
                        <small>Loading organizations...</small>
                      ) : linkedinOrgsError ? (
                        <small style={{ color: '#d32f2f' }}>
                          {(linkedinOrgsError as any).response?.data?.error || 'Failed to load LinkedIn organizations'}
                        </small>
                      ) : linkedinOrgsData && linkedinOrgsData.length > 0 ? (
                        <select
                          value={selectedLinkedInOrg}
                          onChange={(e) => setSelectedLinkedInOrg(e.target.value)}
                          style={{ width: '100%', padding: '5px' }}
                        >
                          <option value="">Select LinkedIn Organization (or use personal profile)</option>
                          {linkedinOrgsData.map((org) => (
                            <option key={org.urn} value={org.urn}>
                              {org.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <small style={{ color: '#666' }}>No LinkedIn organizations found. Will post to personal profile.</small>
                      )}
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
