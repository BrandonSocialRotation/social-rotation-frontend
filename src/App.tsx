// Main App component - handles routing and layout
// Routes:
//   / - Dashboard (protected)
//   /login - Login page
//   /register - Register page
//   /buckets - Bucket management (protected)
//   /schedule - Scheduling interface (protected)
//   /marketplace - Marketplace browsing (protected)
//   /profile - User profile (protected)
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
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

// Protected Route wrapper - redirects to login if not authenticated
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/terms-of-service" element={<Terms />} />
      <Route path="/privacy-policy" element={<Privacy />} />
      
      {/* Protected routes with layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="buckets" element={<Buckets />} />
        <Route path="buckets/:bucketId/images" element={<BucketImages />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="sub-accounts" element={<SubAccounts />} />
        <Route path="rss-feeds" element={<RssFeeds />} />
        <Route path="rss-feeds/:feedId/posts" element={<RssPosts />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      
      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
