import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
// import { useAuthStore } from '../store/authStore';
import './Profile.css';

// interface User {
//   id: number;
//   name: string;
//   email: string;
//   timezone: string;
//   watermark_opacity: number;
//   watermark_scale: number;
//   watermark_offset_x: number;
//   watermark_offset_y: number;
// }

interface ConnectedAccounts {
  facebook_connected: boolean;
  twitter_connected: boolean;
  linkedin_connected: boolean;
  google_connected: boolean;
  instagram_connected: boolean;
  tiktok_connected: boolean;
  youtube_connected: boolean;
}

export default function Profile() {
  const queryClient = useQueryClient();
  // const _authUser = useAuthStore((state) => state.user);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [timezone, setTimezone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);

  // Fetch user info
  const { data: userData, isLoading } = useQuery({
    queryKey: ['user_info'],
    queryFn: async () => {
      const response = await api.get('/user_info');
      return response.data;
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (userData?.user) {
      setName(userData.user.name || '');
      setEmail(userData.user.email || '');
      setTimezone(userData.user.timezone || 'UTC');
    }
  }, [userData]);

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.patch('/user_info', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err: any) => {
      setError(err.response?.data?.errors?.join(', ') || 'Failed to update profile');
    },
  });

  // Disconnect mutations
  const disconnectFacebookMutation = useMutation({
    mutationFn: () => api.post('/user_info/disconnect_facebook'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      setSuccess('Facebook disconnected successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const disconnectXMutation = useMutation({
    mutationFn: () => api.post('/user_info/disconnect_twitter'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      setSuccess('X disconnected successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const disconnectLinkedInMutation = useMutation({
    mutationFn: () => api.post('/user_info/disconnect_linkedin'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      setSuccess('LinkedIn disconnected successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const disconnectGoogleMutation = useMutation({
    mutationFn: () => api.post('/user_info/disconnect_google'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      setSuccess('Google My Business disconnected successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const disconnectTikTokMutation = useMutation({
    mutationFn: () => api.post('/user_info/disconnect_tiktok'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      setSuccess('TikTok disconnected successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const disconnectYouTubeMutation = useMutation({
    mutationFn: () => api.post('/user_info/disconnect_youtube'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      setSuccess('YouTube disconnected successfully!');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    updateMutation.mutate({
      name,
      email,
      timezone,
    });
  };

  const handleConnectPlatform = async (platform: string) => {
    setError('');
    setSuccess('');
    setConnectingPlatform(platform);
    
    try {
      let response;
      
      switch (platform) {
        case 'Facebook':
          response = await api.get('/oauth/facebook/login');
          break;
        case 'LinkedIn':
          response = await api.get('/oauth/linkedin/login');
          break;
        case 'Google My Business':
          response = await api.get('/oauth/google/login');
          break;
        case 'X':
          response = await api.get('/oauth/twitter/login');
          break;
        case 'TikTok':
          response = await api.get('/oauth/tiktok/login');
          break;
        case 'YouTube':
          response = await api.get('/oauth/youtube/login');
          break;
        default:
          return;
      }
      
      console.log(`${platform} OAuth response:`, response.data);
      
      if (response.data?.oauth_url) {
        // Open OAuth URL in popup window
        const width = 600;
        const height = 700;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;
        
        const popup = window.open(
          response.data.oauth_url,
          'OAuth',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!popup) {
          setError('Popup blocked. Please allow popups for this site and try again.');
          return;
        }
        
        // Listen for OAuth completion
        const messageHandler = (event: MessageEvent) => {
          if (event.data.type === 'oauth_success') {
            queryClient.invalidateQueries({ queryKey: ['user_info'] });
            setSuccess(`${platform} connected successfully!`);
            setTimeout(() => setSuccess(''), 3000);
            window.removeEventListener('message', messageHandler);
          }
        };
        window.addEventListener('message', messageHandler);
      } else {
        setError(`No OAuth URL received from server for ${platform}. Please check backend configuration.`);
        console.error('Missing oauth_url in response:', response.data);
      }
    } catch (err: any) {
      console.error(`Error connecting ${platform}:`, err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          `Failed to connect ${platform}. Please check your browser console for details.`;
      setError(`${errorMessage} (Status: ${err.response?.status || 'Unknown'})`);
    } finally {
      setConnectingPlatform(null);
    }
  };
  
  // Check for OAuth success/error in URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    
    if (success) {
      const messages: Record<string, string> = {
        facebook_connected: 'Facebook connected successfully!',
        linkedin_connected: 'LinkedIn connected successfully!',
        google_connected: 'Google My Business connected successfully!',
      };
      setSuccess(messages[success] || 'Account connected successfully!');
      setTimeout(() => setSuccess(''), 3000);
      
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
    }
    
    if (error) {
      const messages: Record<string, string> = {
        invalid_state: 'OAuth validation failed. Please try again.',
        user_not_found: 'User session expired. Please login again.',
        facebook_auth_failed: 'Facebook authentication failed.',
        linkedin_auth_failed: 'LinkedIn authentication failed.',
        google_auth_failed: 'Google authentication failed.',
      };
      setError(messages[error] || 'Authentication failed. Please try again.');
      
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
    }
  }, [queryClient]);

  if (isLoading) {
    return <div className="loading">Loading profile...</div>;
  }

  // const _user = userData?.user as User;
  const connectedAccounts = userData?.connected_accounts as ConnectedAccounts;

  return (
    <div className="profile-page">
      <h1>Profile Settings</h1>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {/* Account Information */}
      <div className="profile-section">
        <h2>Account Information</h2>
        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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
            />
          </div>

          <div className="form-group">
            <label htmlFor="timezone">Timezone</label>
            <select
              id="timezone"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              <option value="UTC">UTC</option>
              <option value="America/New_York">Eastern Time</option>
              <option value="America/Chicago">Central Time</option>
              <option value="America/Denver">Mountain Time</option>
              <option value="America/Los_Angeles">Pacific Time</option>
            </select>
          </div>

          <button type="submit" className="save-btn" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      {/* Connected Accounts */}
      <div className="profile-section">
        <h2>Connected Social Media Accounts</h2>
        <p className="section-description">
          Connect your social media accounts to enable automated posting.
        </p>

        <div className="accounts-grid">
          {/* Facebook */}
          <div className="account-card">
            <div className="account-header">
              <div className="account-icon facebook">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <div className="account-info">
                <h3>Facebook</h3>
                <span className={`status ${connectedAccounts?.facebook_connected ? 'connected' : 'disconnected'}`}>
                  {connectedAccounts?.facebook_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            {connectedAccounts?.facebook_connected ? (
              <button
                onClick={() => disconnectFacebookMutation.mutate()}
                className="disconnect-btn"
                disabled={disconnectFacebookMutation.isPending}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => handleConnectPlatform('Facebook')}
                className="connect-btn"
                disabled={connectingPlatform === 'Facebook'}
              >
                {connectingPlatform === 'Facebook' ? 'Connecting...' : 'Connect Facebook'}
              </button>
            )}
          </div>

          {/* X (Twitter) */}
          <div className="account-card">
            <div className="account-header">
              <div className="account-icon twitter">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <div className="account-info">
                <h3>X (Twitter)</h3>
                <span className={`status ${connectedAccounts?.twitter_connected ? 'connected' : 'disconnected'}`}>
                  {connectedAccounts?.twitter_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            {connectedAccounts?.twitter_connected ? (
              <button
                onClick={() => disconnectXMutation.mutate()}
                className="disconnect-btn"
                disabled={disconnectXMutation.isPending}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => handleConnectPlatform('X')}
                className="connect-btn"
                disabled={connectingPlatform === 'X'}
              >
                {connectingPlatform === 'X' ? 'Connecting...' : 'Connect X'}
              </button>
            )}
          </div>

          {/* LinkedIn */}
          <div className="account-card">
            <div className="account-header">
              <div className="account-icon linkedin">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <div className="account-info">
                <h3>LinkedIn</h3>
                <span className={`status ${connectedAccounts?.linkedin_connected ? 'connected' : 'disconnected'}`}>
                  {connectedAccounts?.linkedin_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            {connectedAccounts?.linkedin_connected ? (
              <button
                onClick={() => disconnectLinkedInMutation.mutate()}
                className="disconnect-btn"
                disabled={disconnectLinkedInMutation.isPending}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => handleConnectPlatform('LinkedIn')}
                className="connect-btn"
                disabled={connectingPlatform === 'LinkedIn'}
              >
                {connectingPlatform === 'LinkedIn' ? 'Connecting...' : 'Connect LinkedIn'}
              </button>
            )}
          </div>

          {/* Google My Business */}
          <div className="account-card">
            <div className="account-header">
              <div className="account-icon google">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div className="account-info">
                <h3>Google My Business</h3>
                <span className={`status ${connectedAccounts?.google_connected ? 'connected' : 'disconnected'}`}>
                  {connectedAccounts?.google_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            {connectedAccounts?.google_connected ? (
              <button
                onClick={() => disconnectGoogleMutation.mutate()}
                className="disconnect-btn"
                disabled={disconnectGoogleMutation.isPending}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => handleConnectPlatform('Google My Business')}
                className="connect-btn"
                disabled={connectingPlatform === 'Google My Business'}
              >
                {connectingPlatform === 'Google My Business' ? 'Connecting...' : 'Connect Google'}
              </button>
            )}
          </div>

          {/* Instagram */}
          <div className="account-card">
            <div className="account-header">
              <div className="account-icon instagram">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div className="account-info">
                <h3>Instagram</h3>
                <span className={`status ${connectedAccounts?.instagram_connected ? 'connected' : 'disconnected'}`}>
                  {connectedAccounts?.instagram_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            <p className="account-note">Connected via Facebook</p>
          </div>

          {/* TikTok */}
          <div className="account-card">
            <div className="account-header">
              <div className="account-icon tiktok">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </div>
              <div className="account-info">
                <h3>TikTok</h3>
                <span className={`status ${connectedAccounts?.tiktok_connected ? 'connected' : 'disconnected'}`}>
                  {connectedAccounts?.tiktok_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            {connectedAccounts?.tiktok_connected ? (
              <button
                onClick={() => disconnectTikTokMutation.mutate()}
                className="disconnect-btn"
                disabled={disconnectTikTokMutation.isPending}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => handleConnectPlatform('TikTok')}
                className="connect-btn"
                disabled={connectingPlatform === 'TikTok'}
              >
                {connectingPlatform === 'TikTok' ? 'Connecting...' : 'Connect TikTok'}
              </button>
            )}
          </div>

          {/* YouTube */}
          <div className="account-card">
            <div className="account-header">
              <div className="account-icon youtube">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </div>
              <div className="account-info">
                <h3>YouTube</h3>
                <span className={`status ${connectedAccounts?.youtube_connected ? 'connected' : 'disconnected'}`}>
                  {connectedAccounts?.youtube_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            {connectedAccounts?.youtube_connected ? (
              <button
                onClick={() => disconnectYouTubeMutation.mutate()}
                className="disconnect-btn"
                disabled={disconnectYouTubeMutation.isPending}
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => handleConnectPlatform('YouTube')}
                className="connect-btn"
                disabled={connectingPlatform === 'YouTube'}
              >
                {connectingPlatform === 'YouTube' ? 'Connecting...' : 'Connect YouTube'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Plans */}
      <SubscriptionPlansSection />
    </div>
  );
}

// Subscription Plans Component
function SubscriptionPlansSection() {
  const [loadingCheckout, setLoadingCheckout] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  // Get user account type
  const { data: userData } = useQuery({
    queryKey: ['user_info'],
    queryFn: async () => {
      const response = await api.get('/user_info');
      return response.data;
    },
  });

  const accountType = userData?.user?.account_type || 'personal'; // 'personal' or 'agency'
  const currentUserCount = userData?.user?.account?.users?.length || 1;

  // Fetch plans based on account type
  const { data: plansData, isLoading: plansLoading } = useQuery({
    queryKey: ['plans', accountType],
    queryFn: async () => {
      const response = await api.get(`/plans?account_type=${accountType}`);
      return response.data;
    },
    enabled: !!accountType, // Only fetch when account type is known
  });

  // Fetch current subscription
  const { data: subscriptionData } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      try {
        const response = await api.get('/subscriptions');
        return response.data;
      } catch (err: any) {
        if (err.response?.status === 404) {
          return { subscription: null };
        }
        throw err;
      }
    },
  });

  // Calculate price for a plan based on user count
  const calculatePrice = (plan: any, userCount: number, period: 'monthly' | 'annual') => {
    if (!plan.supports_per_user_pricing) {
      return plan.price_cents;
    }

    const basePrice = plan.base_price_cents || 0;
    const additionalUsers = Math.max(userCount - 1, 0);
    
    let total = basePrice;
    if (additionalUsers > 0) {
      // First 10 additional users
      const usersAtRegularPrice = Math.min(additionalUsers, 10);
      total += usersAtRegularPrice * (plan.per_user_price_cents || 0);
      
      // Users after 10
      if (additionalUsers > 10) {
        const usersAtDiscountedPrice = additionalUsers - 10;
        total += usersAtDiscountedPrice * (plan.per_user_price_after_10_cents || 0);
      }
    }
    
    // Apply annual discount (2 months free = 10/12)
    if (period === 'annual') {
      total = Math.round(total * 10 / 12);
    }
    
    return total;
  };

  const formatPrice = (cents: number, period: 'monthly' | 'annual') => {
    const dollars = cents / 100;
    const periodText = period === 'annual' ? 'year' : 'month';
    return `$${dollars.toFixed(2)}/${periodText}`;
  };

  const handleSubscribe = async (planId: number) => {
    setLoadingCheckout(planId);
    try {
      const response = await api.post('/subscriptions/checkout_session', { 
        plan_id: planId,
        billing_period: billingPeriod
      });
      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        alert('Failed to create checkout session. Please try again.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      alert(err.response?.data?.error || 'Failed to start checkout. Please try again.');
    } finally {
      setLoadingCheckout(null);
    }
  };

  const plans = plansData?.plans || [];
  const currentSubscription = subscriptionData?.subscription;

  return (
    <div className="profile-section">
      <h2>Subscription Plans</h2>
      <p className="section-description">
        Choose a plan that fits your needs. All plans include RSS feeds and analytics.
      </p>

      {currentSubscription && (
        <div className="current-subscription">
          <h3>Current Plan: {currentSubscription.plan?.name || 'Active Subscription'}</h3>
          <p>
            Status: <span className={`status ${currentSubscription.status}`}>{currentSubscription.status}</span>
          </p>
          {currentSubscription.current_period_end && (
            <p>
              Renews: {new Date(currentSubscription.current_period_end).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      <div className="account-type-info">
        <p>
          <strong>Account Type:</strong> {accountType === 'agency' ? 'Agency' : 'Personal'}
          {accountType === 'agency' && (
            <span className="info-text"> - Plans are based on maximum sub-accounts you can manage</span>
          )}
        </p>
      </div>

      {/* Billing Period Selector - only show for per-user pricing plans */}
      {plans.some((p: any) => p.supports_per_user_pricing) && (
        <div className="billing-period-selector" style={{ marginBottom: '20px', padding: '15px', background: '#f5f5f5', borderRadius: '8px' }}>
          <label style={{ marginRight: '15px', fontWeight: 'bold' }}>Billing Period:</label>
          <label style={{ marginRight: '20px', cursor: 'pointer' }}>
            <input
              type="radio"
              value="monthly"
              checked={billingPeriod === 'monthly'}
              onChange={(e) => setBillingPeriod(e.target.value as 'monthly' | 'annual')}
              style={{ marginRight: '5px' }}
            />
            Monthly
          </label>
          <label style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              value="annual"
              checked={billingPeriod === 'annual'}
              onChange={(e) => setBillingPeriod(e.target.value as 'monthly' | 'annual')}
              style={{ marginRight: '5px' }}
            />
            Annual <span style={{ color: '#28a745', fontWeight: 'bold' }}>(2 months free!)</span>
          </label>
        </div>
      )}

      {plansLoading ? (
        <div className="loading">Loading plans...</div>
      ) : plans.length === 0 ? (
        <p>No plans available for this type.</p>
      ) : (
        <div className="plans-grid">
          {plans.map((plan: any) => {
            const calculatedPrice = plan.supports_per_user_pricing 
              ? calculatePrice(plan, currentUserCount, billingPeriod)
              : plan.price_cents;
            const displayPrice = formatPrice(calculatedPrice, billingPeriod);
            
            return (
            <div key={plan.id} className="plan-card">
              <div className="plan-header">
                <h3>{plan.name}</h3>
                <div className="plan-price">
                  {plan.supports_per_user_pricing ? (
                    <>
                      <span className="price">{displayPrice}</span>
                      <span className="period" style={{ fontSize: '0.9em', color: '#666' }}>
                        ({currentUserCount} user{currentUserCount !== 1 ? 's' : ''})
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="price">{plan.formatted_price}</span>
                      <span className="period">/month</span>
                    </>
                  )}
                </div>
              </div>
              
              {plan.supports_per_user_pricing && (
                <div className="pricing-breakdown" style={{ marginBottom: '15px', padding: '10px', background: '#f9f9f9', borderRadius: '5px', fontSize: '0.9em' }}>
                  <p style={{ margin: '5px 0' }}><strong>Pricing:</strong></p>
                  <p style={{ margin: '5px 0' }}>Base: ${(plan.base_price_cents / 100).toFixed(2)}/{billingPeriod === 'annual' ? 'year' : 'month'}</p>
                  <p style={{ margin: '5px 0' }}>+ ${(plan.per_user_price_cents / 100).toFixed(2)}/user (first 10 users)</p>
                  <p style={{ margin: '5px 0' }}>+ ${(plan.per_user_price_after_10_cents / 100).toFixed(2)}/user (after 10 users)</p>
                  {billingPeriod === 'annual' && (
                    <p style={{ margin: '5px 0', color: '#28a745', fontWeight: 'bold' }}>✓ 2 months free with annual billing!</p>
                  )}
                </div>
              )}
              
              <div className="plan-features">
                {plan.plan_type === 'personal' ? (
                  <div className="feature">
                    <span className="feature-label">Plan Type:</span>
                    <span className="feature-value">Personal Use</span>
                  </div>
                ) : plan.plan_type === 'agency' ? (
                  <div className="feature">
                    <span className="feature-label">Max Sub-Accounts:</span>
                    <span className="feature-value">{plan.max_users}</span>
                  </div>
                ) : (
                  <>
                    {plan.max_locations > 0 && (
                      <div className="feature">
                        <span className="feature-label">Max Locations:</span>
                        <span className="feature-value">{plan.max_locations}</span>
                      </div>
                    )}
                    <div className="feature">
                      <span className="feature-label">Max Users:</span>
                      <span className="feature-value">{plan.max_users}</span>
                    </div>
                  </>
                )}
                <div className="feature">
                  <span className="feature-label">Max Buckets:</span>
                  <span className="feature-value">{plan.max_buckets}</span>
                </div>
                <div className="feature">
                  <span className="feature-label">Images per Bucket:</span>
                  <span className="feature-value">{plan.max_images_per_bucket}</span>
                </div>
                
                <div className="feature-list">
                  <h4>Features:</h4>
                  <ul>
                    {plan.features?.rss && <li>✓ RSS Feeds</li>}
                    {plan.features?.marketplace && <li>✓ Marketplace</li>}
                    {plan.features?.watermark && <li>✓ Watermarking</li>}
                    {plan.features?.analytics && <li>✓ Analytics</li>}
                    {plan.features?.white_label && <li>✓ White Label</li>}
                    {plan.features?.ai_copywriting && <li>✓ AI Copywriting</li>}
                    {plan.features?.ai_image_gen && <li>✓ AI Image Generation</li>}
                  </ul>
                </div>
              </div>

              <button
                className="subscribe-btn"
                onClick={() => handleSubscribe(plan.id)}
                disabled={loadingCheckout === plan.id}
              >
                {loadingCheckout === plan.id
                  ? 'Loading...'
                  : `Subscribe - ${displayPrice}`}
              </button>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

