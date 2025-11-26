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
    console.log('OAuthCallback mounted:', { success, error, platform, hasOpener: !!window.opener, url: window.location.href })
    
    // Send message to parent window
    if (window.opener && !window.opener.closed) {
      // Use '*' as target origin to allow cross-origin communication
      // The parent window will validate the origin in its message handler
      const targetOrigin = '*'
      
      if (success) {
        console.log('Sending success message to parent:', { type: 'oauth_success', platform, message: success, targetOrigin })
        try {
          window.opener.postMessage(
            { type: 'oauth_success', platform, message: success },
            targetOrigin
          )
          console.log('Success message sent to parent')
        } catch (e) {
          console.error('Error sending success message:', e)
        }
      } else if (error) {
        console.log('Sending error message to parent:', { type: 'oauth_error', platform, message: error, targetOrigin })
        try {
          window.opener.postMessage(
            { type: 'oauth_error', platform, message: error },
            targetOrigin
          )
          console.log('Error message sent to parent')
        } catch (e) {
          console.error('Error sending error message:', e)
        }
      }
      
      // Close the popup after a short delay to ensure message is sent
      setTimeout(() => {
        console.log('Attempting to close popup window')
        try {
          window.close()
          // If window doesn't close, try again after a longer delay
          setTimeout(() => {
            if (!window.closed) {
              console.warn('Popup did not close automatically, trying again...')
              window.close()
            }
          }, 500)
        } catch (e) {
          console.error('Error closing popup:', e)
        }
      }, 200)
    } else {
      // If no opener (direct navigation), redirect to profile
      console.log('No window.opener or opener is closed, redirecting to profile')
      setTimeout(() => {
        window.location.href = '/profile'
      }, 1000)
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

