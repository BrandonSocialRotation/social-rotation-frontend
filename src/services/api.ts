// API service - handles all HTTP requests to Rails backend
// Base URL: Uses environment variable or defaults to localhost for development
// Automatically includes authentication token in headers
import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// Get API base URL from env; if running on localhost, default to local API
const getApiBaseUrl = () => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL
  if (envUrl) return envUrl

  const isLocal = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  if (isLocal) return 'http://localhost:3000/api/v1'

  // Fallback for deployed environments when env var not provided
  return 'https://new-social-rotation-backend-qzyk8.ondigitalocean.app/api/v1'
}

const API_BASE_URL = getApiBaseUrl()

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor - adds auth token to every request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handles 401 (unauthorized) and 403 (subscription required) errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - logout user
      useAuthStore.getState().logout()
      window.location.href = '/login'
    } else if (error.response?.status === 403 && error.response?.data?.subscription_required) {
      // Subscription required or suspended - redirect appropriately
      // Don't logout, just redirect so they can manage subscription
      if (error.response.data.subscription_suspended) {
        // Suspended account - redirect to profile to manage subscription
        window.location.href = '/profile'
      } else {
        // No subscription - redirect to register to complete payment
        const redirectTo = error.response.data.redirect_to || '/register'
        window.location.href = redirectTo
      }
    }
    return Promise.reject(error)
  }
)

// AUTH ENDPOINTS
export const authAPI = {
  // POST /api/v1/auth/login
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  // POST /api/v1/auth/register
  register: (name: string, email: string, password: string, accountType?: string, companyName?: string) =>
    api.post('/auth/register', { name, email, password, account_type: accountType, company_name: companyName }),
}

// BUCKET ENDPOINTS
export const bucketsAPI = {
  // GET /api/v1/buckets
  getAll: () => api.get('/buckets'),
  
  // GET /api/v1/buckets/:id
  getOne: (id: number) => api.get(`/buckets/${id}`),
  
  // POST /api/v1/buckets
  create: (data: { name: string; description?: string }) =>
    api.post('/buckets', { bucket: data }),
  
  // PATCH /api/v1/buckets/:id
  update: (id: number, data: any) =>
    api.patch(`/buckets/${id}`, { bucket: data }),
  
  // DELETE /api/v1/buckets/:id
  delete: (id: number) => api.delete(`/buckets/${id}`),
  
  // GET /api/v1/buckets/:id/images
  getImages: (id: number) => api.get(`/buckets/${id}/images`),
}

// SCHEDULE ENDPOINTS
export const schedulesAPI = {
  // GET /api/v1/bucket_schedules
  getAll: () => api.get('/bucket_schedules'),
  
  // POST /api/v1/bucket_schedules
  create: (data: any) => api.post('/bucket_schedules', data),
  
  // DELETE /api/v1/bucket_schedules/:id
  delete: (id: number) => api.delete(`/bucket_schedules/${id}`),
}

// MARKETPLACE ENDPOINTS
export const marketplaceAPI = {
  // GET /api/v1/marketplace
  getAll: () => api.get('/marketplace'),
  
  // GET /api/v1/marketplace/available
  getAvailable: () => api.get('/marketplace/available'),
  
  // POST /api/v1/marketplace/:id/clone
  clone: (id: number, preserveScheduling: boolean) =>
    api.post(`/marketplace/${id}/clone`, { preserve_scheduling: preserveScheduling }),
}

// USER INFO ENDPOINTS
export const userAPI = {
  // GET /api/v1/user_info
  getProfile: () => api.get('/user_info'),
  
  // PATCH /api/v1/user_info
  updateProfile: (data: any) => api.patch('/user_info', { user: data }),
  
  // GET /api/v1/user_info/connected_accounts
  getConnectedAccounts: () => api.get('/user_info/connected_accounts'),
}

export default api
