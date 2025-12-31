// Main App component - handles routing and layout
// Routes:
//   / - Landing page (public)
//   /dashboard - Dashboard (protected)
//   /login - Login page
//   /register - Register page
//   /buckets - Bucket management (protected)
//   /schedule - Scheduling interface (protected)
//   /marketplace - Marketplace browsing (protected)
//   /profile - User profile (protected)
import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Buckets from './pages/Buckets'
import BucketImages from './pages/BucketImages'
import Schedule from './pages/Schedule'
import Profile from './pages/Profile'
import SubAccounts from './pages/SubAccounts'
import RssFeeds from './pages/RssFeeds'
import RssPosts from './pages/RssPosts'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import OAuthCallback from './pages/OAuthCallback'

// Protected Route wrapper - redirects to login if not authenticated
// Uses useState to check localStorage on mount (prevents redirect before check)
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null)
  
  React.useEffect(() => {
    // Check localStorage on mount
    const authStorage = localStorage.getItem('auth-storage')
    let authenticated = false
    
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage)
        // Zustand persist stores as { state: { ... }, version: 0 }
        const state = parsed.state || parsed
        authenticated = !!(state?.user && state?.token)
      } catch (e) {
        // If parsing fails, user is not authenticated
      }
    }
    
    setIsAuthenticated(authenticated)
  }, [])
  
  // Don't redirect until we've checked localStorage
  if (isAuthenticated === null) {
    return null // Wait for check to complete
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms-of-service" element={<Terms />} />
      <Route path="/privacy-policy" element={<Privacy />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
      
      {/* Protected routes with layout */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
      </Route>
      
      {/* Other protected routes */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="buckets" element={<Buckets />} />
        <Route path="buckets/:bucketId/images" element={<BucketImages />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="sub-accounts" element={<SubAccounts />} />
        <Route path="rss-feeds" element={<RssFeeds />} />
        <Route path="rss-feeds/:feedId/posts" element={<RssPosts />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      
      {/* Catch all - redirect authenticated users to dashboard, others to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
