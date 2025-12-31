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
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
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
// Waits for auth state to be rehydrated from localStorage before checking
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const hasHydrated = useAuthStore((state) => state.hasHydrated)
  
  // Wait for hydration to complete before checking auth
  // This prevents redirecting to login on page refresh
  if (!hasHydrated) {
    // Return null or a loading spinner while hydrating
    return null
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
      
      {/* Catch all - only redirect if route doesn't match any above */}
      {/* Removed automatic redirect to prevent interfering with valid routes */}
    </Routes>
  )
}

export default App
