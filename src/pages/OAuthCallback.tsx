// OAuth Callback page - handles OAuth redirects and communicates with parent window
// This page is opened in a popup and sends a message to the parent window before closing
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function OAuthCallback() {
  const [searchParams] = useSearchParams()
  const success = searchParams.get('success')
  const error = searchParams.get('error')
  const platform = searchParams.get('platform') || 'social media'

  useEffect(() => {
    console.log('OAuthCallback mounted:', { success, error, platform, hasOpener: !!window.opener })
    
    // Send message to parent window
    if (window.opener) {
      // Use '*' as target origin to allow cross-origin communication
      // The parent window will validate the origin in its message handler
      const targetOrigin = '*'
      
      if (success) {
        console.log('Sending success message to parent:', { type: 'oauth_success', platform, message: success, targetOrigin })
        window.opener.postMessage(
          { type: 'oauth_success', platform, message: success },
          targetOrigin
        )
      } else if (error) {
        console.log('Sending error message to parent:', { type: 'oauth_error', platform, message: error, targetOrigin })
        window.opener.postMessage(
          { type: 'oauth_error', platform, message: error },
          targetOrigin
        )
      }
      // Close the popup after a short delay to ensure message is sent
      setTimeout(() => {
        console.log('Closing popup window')
        window.close()
      }, 100)
    } else {
      // If no opener (direct navigation), redirect to profile
      console.log('No window.opener, redirecting to profile')
      window.location.href = '/profile'
    }
  }, [success, error, platform])

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        {success ? (
          <>
            <h2 style={{ color: '#28a745' }}>✓ Connected Successfully!</h2>
            <p>This window will close automatically...</p>
          </>
        ) : error ? (
          <>
            <h2 style={{ color: '#dc3545' }}>✗ Connection Failed</h2>
            <p>This window will close automatically...</p>
          </>
        ) : (
          <>
            <h2>Processing...</h2>
            <p>Please wait...</p>
          </>
        )}
      </div>
    </div>
  )
}

