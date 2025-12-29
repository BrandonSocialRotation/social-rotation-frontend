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
  pinterest_connected: boolean;
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

  // Check for success message from URL params (Stripe redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'subscription_active') {
      setSuccess('Subscription activated successfully! Welcome to Social Rotation.');
      // Clean up URL
      window.history.replaceState({}, '', '/profile');
      // Refresh subscription data
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    }
    if (urlParams.get('error') === 'subscription_canceled') {
      setError('Payment was canceled. Please try again.');
      window.history.replaceState({}, '', '/profile');
    }
  }, [queryClient]);

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

  const disconnectInstagramMutation = useMutation({
    mutationFn: () => api.post('/user_info/disconnect_instagram'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      setSuccess('Instagram disconnected successfully!');
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

  const disconnectPinterestMutation = useMutation({
    mutationFn: () => api.post('/user_info/disconnect_pinterest'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      setSuccess('Pinterest disconnected successfully!');
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
        case 'Instagram':
          // Instagram uses Facebook API - check if Facebook is connected first
          if (!connectedAccounts?.facebook_connected) {
            setError('Please connect Facebook first. Instagram uses Facebook\'s API and requires a connected Facebook account.');
            setConnectingPlatform(null);
            return;
          }
          // Call Instagram connect endpoint (fetches Instagram account from Facebook)
          response = await api.get('/oauth/instagram/connect');
          // Instagram connect doesn't use OAuth popup, so handle it directly
          if (response.data?.success) {
            queryClient.invalidateQueries({ queryKey: ['user_info'] });
            setSuccess('Instagram connected successfully!');
            setTimeout(() => setSuccess(''), 3000);
            setConnectingPlatform(null);
            return;
          } else {
            throw new Error(response.data?.message || 'Failed to connect Instagram');
          }
        case 'TikTok':
          response = await api.get('/oauth/tiktok/login');
          break;
        case 'YouTube':
          response = await api.get('/oauth/youtube/login');
          break;
        case 'Pinterest':
          response = await api.get('/oauth/pinterest/login');
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
        
        // Store current window location to detect if main window was navigated
        const currentUrl = window.location.href;
        
        // Open popup with explicit features to prevent it from opening in a new tab
        const popup = window.open(
          response.data.oauth_url,
          `oauth_${platform}_${Date.now()}`, // Unique name to prevent reuse
          `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=yes,status=no,resizable=yes,scrollbars=yes`
        );
        
        // Check if popup was blocked
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
          setError('Popup blocked. Please allow popups for this site and try again.');
          setConnectingPlatform(null);
          return;
        }
        
        // Verify popup opened correctly by checking if main window was navigated
        setTimeout(() => {
          if (window.location.href !== currentUrl) {
            // Main window was navigated - popup was likely blocked
            console.error('Main window was navigated - popup may have been blocked');
            setError('Popup was blocked. The page navigated instead. Please allow popups and try again.');
            setConnectingPlatform(null);
            // Try to go back
            window.history.back();
          }
        }, 100);
        
        console.log('Popup opened successfully:', { url: response.data.oauth_url, popup });
        
        // Listen for OAuth completion
        const messageHandler = (event: MessageEvent) => {
          console.log('Message received:', event.data, 'from origin:', event.origin, 'current origin:', window.location.origin);
          
          // Accept messages from OAuth callback pages (can be from different origins if backend redirects to old URL)
          // Validate that it's a valid OAuth message
          if (!event.data || typeof event.data !== 'object' || !event.data.type) {
            console.log('Ignoring message - invalid data structure');
            return;
          }
          
          // Only process oauth_success and oauth_error messages
          if (event.data.type !== 'oauth_success' && event.data.type !== 'oauth_error') {
            console.log('Ignoring message - wrong type:', event.data.type);
            return;
          }
          
          console.log('Processing OAuth message:', event.data);
          
          if (event.data.type === 'oauth_success') {
            console.log('OAuth success! Invalidating queries and updating UI');
            queryClient.invalidateQueries({ queryKey: ['user_info'] });
            setSuccess(`${event.data.platform || platform} connected successfully!`);
            setTimeout(() => setSuccess(''), 3000);
            setConnectingPlatform(null);
            clearInterval(checkPopup);
            window.removeEventListener('message', messageHandler);
            if (popup && !popup.closed) {
              console.log('Closing popup window');
              popup.close();
            }
          } else if (event.data.type === 'oauth_error') {
            console.log('OAuth error:', event.data.message);
            const errorMsg = event.data.message || `Failed to connect ${event.data.platform || platform}`;
            setError(errorMsg);
            setConnectingPlatform(null);
            clearInterval(checkPopup);
            window.removeEventListener('message', messageHandler);
            if (popup && !popup.closed) {
              console.log('Closing popup window after error');
              popup.close();
            }
          }
        };
        console.log('Adding message listener for OAuth callback');
        window.addEventListener('message', messageHandler);
        
        // Also poll the popup window to check if it has navigated to the callback page
        // This is a fallback in case postMessage doesn't work
        const checkPopup = setInterval(() => {
          if (popup.closed) {
            console.log('Popup was closed');
            clearInterval(checkPopup);
            window.removeEventListener('message', messageHandler);
            setConnectingPlatform(null);
            // Refresh user info in case connection succeeded but message wasn't received
            queryClient.invalidateQueries({ queryKey: ['user_info'] });
            return;
          }
          
          // Try to check popup URL (will fail if cross-origin, which is expected)
          try {
            const popupUrl = popup.location.href;
            console.log('Popup URL:', popupUrl);
            
            // Check if popup is on our domain (could be callback page or root with params)
            const isOurDomain = popupUrl.includes(window.location.hostname);
            if (isOurDomain) {
              // Extract URL params - handle both /oauth/callback and root path
              const urlMatch = popupUrl.match(/\?(.+)$/);
              if (urlMatch) {
                const urlParams = new URLSearchParams(urlMatch[1]);
                const success = urlParams.get('success');
                const error = urlParams.get('error');
                const callbackPlatform = urlParams.get('platform');
                
                if (success || error) {
                  console.log('Detected OAuth callback in popup URL:', { success, error, platform: callbackPlatform });
                  // Manually trigger the success/error handling
                  if (success) {
                    console.log('Triggering success handling from popup URL detection');
                    queryClient.invalidateQueries({ queryKey: ['user_info'] });
                    setSuccess(`${callbackPlatform || platform} connected successfully!`);
                    setTimeout(() => setSuccess(''), 3000);
                    setConnectingPlatform(null);
                    clearInterval(checkPopup);
                    window.removeEventListener('message', messageHandler);
                    if (popup && !popup.closed) {
                      console.log('Closing popup after success detection');
                      popup.close();
                    }
                    return; // Exit early to prevent further checks
                  } else if (error) {
                    console.log('Triggering error handling from popup URL detection');
                    setError(`Failed to connect ${callbackPlatform || platform}: ${error}`);
                    setConnectingPlatform(null);
                    clearInterval(checkPopup);
                    window.removeEventListener('message', messageHandler);
                    if (popup && !popup.closed) {
                      console.log('Closing popup after error detection');
                      popup.close();
                    }
                    return; // Exit early to prevent further checks
                  }
                }
              }
            }
          } catch (e) {
            // Cross-origin error is expected when popup is on OAuth provider's domain
            // This is normal and we'll rely on postMessage instead
            // Only log if it's not a cross-origin error
            const errorMessage = e instanceof Error ? e.message : String(e);
            if (!errorMessage.includes('cross-origin') && !errorMessage.includes('Blocked a frame')) {
              console.log('Error checking popup URL (expected for cross-origin):', errorMessage);
            }
          }
        }, 500);
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
        linkedin_auth_failed: 'LinkedIn authentication failed. Please try again.',
        linkedin_access_denied: 'LinkedIn authorization was denied. Please grant permissions and try again.',
        linkedin_invalid_request: 'LinkedIn request was invalid. Please try again.',
        linkedin_scope_error: 'LinkedIn app configuration error. The requested permissions are not enabled for this app. Please contact support.',
        linkedin_config_error: 'LinkedIn configuration error. Please contact support.',
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
  // Extract connected accounts from user object (backend provides boolean flags)
  const connectedAccounts: ConnectedAccounts = userData?.user ? {
    facebook_connected: userData.user.facebook_connected || false,
    twitter_connected: userData.user.twitter_connected || false,
    linkedin_connected: userData.user.linkedin_connected || false,
    google_connected: userData.user.google_connected || false,
    instagram_connected: userData.user.instagram_connected || false,
    tiktok_connected: userData.user.tiktok_connected || false,
    youtube_connected: userData.user.youtube_connected || false,
    pinterest_connected: userData.user.pinterest_connected || false,
  } : {
    facebook_connected: false,
    twitter_connected: false,
    linkedin_connected: false,
    google_connected: false,
    instagram_connected: false,
    tiktok_connected: false,
    youtube_connected: false,
    pinterest_connected: false,
  };

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
              <div>
                {userData?.user?.facebook_account && (
                  <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                    Connected: {userData.user.facebook_account.name || 'Facebook Account'}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleConnectPlatform('Facebook')}
                    className="connect-btn"
                    disabled={connectingPlatform === 'Facebook'}
                  >
                    {connectingPlatform === 'Facebook' ? 'Connecting...' : 'Change Facebook Account'}
                  </button>
                  <button
                    onClick={() => disconnectFacebookMutation.mutate()}
                    className="disconnect-btn"
                    disabled={disconnectFacebookMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
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
              <div>
                {userData?.user?.twitter_account && (
                  <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                    Connected: @{userData.user.twitter_account.username || userData.user.twitter_account.user_id}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleConnectPlatform('X')}
                    className="connect-btn"
                    disabled={connectingPlatform === 'X'}
                  >
                    {connectingPlatform === 'X' ? 'Connecting...' : 'Change X Account'}
                  </button>
                  <button
                    onClick={() => disconnectXMutation.mutate()}
                    className="disconnect-btn"
                    disabled={disconnectXMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
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
              <div>
                {userData?.user?.linkedin_account && (
                  <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                    Connected: Profile ID {userData.user.linkedin_account.profile_id}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleConnectPlatform('LinkedIn')}
                    className="connect-btn"
                    disabled={connectingPlatform === 'LinkedIn'}
                  >
                    {connectingPlatform === 'LinkedIn' ? 'Connecting...' : 'Change LinkedIn Account'}
                  </button>
                  <button
                    onClick={() => disconnectLinkedInMutation.mutate()}
                    className="disconnect-btn"
                    disabled={disconnectLinkedInMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
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
              <div>
                {userData?.user?.google_account && (
                  <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                    Connected: {userData.user.google_account.name || 'Google My Business Account'}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleConnectPlatform('Google My Business')}
                    className="connect-btn"
                    disabled={connectingPlatform === 'Google My Business'}
                  >
                    {connectingPlatform === 'Google My Business' ? 'Connecting...' : 'Change Google Account'}
                  </button>
                  <button
                    onClick={() => disconnectGoogleMutation.mutate()}
                    className="disconnect-btn"
                    disabled={disconnectGoogleMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
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
            <p className="account-note" style={{ fontSize: '0.85em', color: '#666', marginBottom: '10px' }}>
              Requires Facebook connection
            </p>
            {connectedAccounts?.instagram_connected ? (
              <div>
                {userData?.user?.instagram_account && (
                  <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                    Connected: @{userData.user.instagram_account.username || userData.user.instagram_account.id}
                    {userData.user.instagram_account.name && ` (${userData.user.instagram_account.name})`}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleConnectPlatform('Instagram')}
                    className="connect-btn"
                    disabled={connectingPlatform === 'Instagram'}
                  >
                    {connectingPlatform === 'Instagram' ? 'Reconnecting...' : 'Reconnect Instagram'}
                  </button>
                  <button
                    onClick={() => disconnectInstagramMutation.mutate()}
                    className="disconnect-btn"
                    disabled={disconnectInstagramMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleConnectPlatform('Instagram')}
                className="connect-btn"
                disabled={connectingPlatform === 'Instagram' || !connectedAccounts?.facebook_connected}
                title={!connectedAccounts?.facebook_connected ? 'Please connect Facebook first' : ''}
              >
                {connectingPlatform === 'Instagram' ? 'Connecting...' : 'Connect Instagram'}
              </button>
            )}
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
              <div>
                {userData?.user?.tiktok_account && (
                  <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                    Connected: @{userData.user.tiktok_account.username || userData.user.tiktok_account.user_id}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleConnectPlatform('TikTok')}
                    className="connect-btn"
                    disabled={connectingPlatform === 'TikTok'}
                  >
                    {connectingPlatform === 'TikTok' ? 'Connecting...' : 'Change TikTok Account'}
                  </button>
                  <button
                    onClick={() => disconnectTikTokMutation.mutate()}
                    className="disconnect-btn"
                    disabled={disconnectTikTokMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
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
              <div>
                {userData?.user?.youtube_account && (
                  <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                    Connected: {userData.user.youtube_account.channel_name || userData.user.youtube_account.channel_id || 'YouTube Account'}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleConnectPlatform('YouTube')}
                    className="connect-btn"
                    disabled={connectingPlatform === 'YouTube'}
                  >
                    {connectingPlatform === 'YouTube' ? 'Connecting...' : 'Change YouTube Account'}
                  </button>
                  <button
                    onClick={() => disconnectYouTubeMutation.mutate()}
                    className="disconnect-btn"
                    disabled={disconnectYouTubeMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
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

          {/* Pinterest */}
          <div className="account-card">
            <div className="account-header">
              <div className="account-icon pinterest">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.219-.937 1.407-5.965 1.407-5.965s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.023 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/>
                </svg>
              </div>
              <div className="account-info">
                <h3>Pinterest</h3>
                <span className={`status ${connectedAccounts?.pinterest_connected ? 'connected' : 'disconnected'}`}>
                  {connectedAccounts?.pinterest_connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
            {connectedAccounts?.pinterest_connected ? (
              <div>
                {userData?.user?.pinterest_account && (
                  <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                    Connected: @{userData.user.pinterest_account.username || 'Pinterest Account'}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => handleConnectPlatform('Pinterest')}
                    className="connect-btn"
                    disabled={connectingPlatform === 'Pinterest'}
                  >
                    {connectingPlatform === 'Pinterest' ? 'Connecting...' : 'Change Pinterest Account'}
                  </button>
                  <button
                    onClick={() => disconnectPinterestMutation.mutate()}
                    className="disconnect-btn"
                    disabled={disconnectPinterestMutation.isPending}
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleConnectPlatform('Pinterest')}
                className="connect-btn"
                disabled={connectingPlatform === 'Pinterest'}
              >
                {connectingPlatform === 'Pinterest' ? 'Connecting...' : 'Connect Pinterest'}
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
  const { data: plansData, isLoading: plansLoading, error: plansError } = useQuery({
    queryKey: ['plans', accountType],
    queryFn: async () => {
      console.log('Fetching plans for account_type:', accountType);
      const response = await api.get(`/plans?account_type=${accountType}`);
      console.log('Plans response:', response.data);
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

      <div className="account-type-info" style={{ marginBottom: '20px', padding: '15px', background: '#f0f8ff', borderRadius: '8px' }}>
        <p>
          <strong>Account Type:</strong> {accountType === 'agency' ? 'Agency' : 'Personal'}
          {accountType === 'agency' && (
            <span className="info-text"> - Plans are based on maximum sub-accounts you can manage</span>
          )}
        </p>
        {accountType === 'personal' && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ marginBottom: '10px', fontSize: '0.9em', color: '#666' }}>
              Want to manage multiple sub-accounts? Convert to an Agency account.
            </p>
            <ConvertToAgencyButton />
          </div>
        )}
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
      ) : plansError ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
          <p>Error loading plans: {plansError.message || 'Unknown error'}</p>
          <p style={{ fontSize: '0.9em', marginTop: '10px' }}>
            Please refresh the page or contact support if this persists.
          </p>
        </div>
      ) : plans.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ marginBottom: '10px' }}>No plans available for this account type ({accountType}).</p>
          {accountType === 'personal' && (
            <p style={{ fontSize: '0.9em', color: '#666' }}>
              If you're expecting to see the Personal plan ($49/month), please refresh the page or contact support.
            </p>
          )}
        </div>
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

function ConvertToAgencyButton() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const convertMutation = useMutation({
    mutationFn: async (data: { company_name?: string }) => {
      return await api.post('/user_info/convert_to_agency', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user_info'] });
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setShowModal(false);
      setCompanyName('');
      alert('Account successfully converted to Agency! You can now manage sub-accounts.');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || 'Failed to convert account. Please try again.');
    },
  });

  const handleConvert = () => {
    setError('');
    setLoading(true);
    convertMutation.mutate(
      { company_name: companyName || undefined },
      {
        onSettled: () => setLoading(false),
      }
    );
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        style={{
          padding: '8px 16px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '0.9em',
        }}
      >
        Convert to Agency Account
      </button>

      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => !loading && setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '500px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0 }}>Convert to Agency Account</h3>
            <p style={{ marginBottom: '20px', color: '#666' }}>
              Converting to an Agency account will allow you to manage multiple sub-accounts.
              This action cannot be undone.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Company/Agency Name (optional):
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                disabled={loading}
              />
            </div>

            {error && (
              <div style={{ color: 'red', marginBottom: '15px', fontSize: '0.9em' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => !loading && setShowModal(false)}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Converting...' : 'Convert to Agency'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

