// Main App component - handles routing and layout
// Updated: Removed all redirects to preserve URL on refresh
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
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
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

// Protected Route wrapper - allows page to load, API will handle auth
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // Just render the children - let the page load
  // API calls will handle authentication and redirect if needed
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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
      
      {/* Catch all - only redirect if it's a real 404, not a client-side route */}
      {/* Removed automatic redirect to prevent interfering with client-side routing */}
    </Routes>
  )
}

export default App
