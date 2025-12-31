// Authentication state management using Zustand
// Stores: user data, authentication token, login/logout functions
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  name: string
  email: string
  account_id?: number
  is_account_admin?: boolean
  role?: string
  super_admin?: boolean
  reseller?: boolean
  can_access_marketplace?: boolean
  can_create_marketplace_item?: boolean
  can_create_sub_account?: boolean
  can_manage_rss_feeds?: boolean
  can_access_rss_feeds?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  originalUser: User | null  // Store original reseller when switching
  originalToken: string | null  // Store original token when switching
  login: (user: User, token: string) => void
  logout: () => void
  setUser: (user: User) => void
  setToken: (token: string) => void
  switchToSubAccount: (user: User, token: string) => void
  switchBackToOriginal: () => void
}

// Create auth store with persistence (saves to localStorage)
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      originalUser: null,
      originalToken: null,
      
      // Login function - saves user and token
      login: (user, token) =>
        set((state) => ({
          user,
          token,
          isAuthenticated: !!(user && token),
          originalUser: null,
          originalToken: null,
        })),
      
      // Logout function - clears all auth data
      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          originalUser: null,
          originalToken: null,
        }),
      
      // Set user (for account switching)
      setUser: (user) =>
        set({
          user,
          isAuthenticated: true,
        }),
      
      // Set token (for account switching)
      setToken: (token) =>
        set({
          token,
        }),
      
      // Switch to sub-account (store original for switching back)
      switchToSubAccount: (user, token) => {
        const currentState = get();
        set({
          originalUser: currentState.user,
          originalToken: currentState.token,
          user,
          token,
          isAuthenticated: true,
        });
      },
      
      // Switch back to original reseller account
      switchBackToOriginal: () => {
        const { originalUser, originalToken } = get();
        if (originalUser && originalToken) {
          set({
            user: originalUser,
            token: originalToken,
            originalUser: null,
            originalToken: null,
            isAuthenticated: true,
          });
        }
      },
    }),
    {
      name: 'auth-storage', // localStorage key
      // Rehydrate isAuthenticated from user and token on load
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        originalUser: state.originalUser,
        originalToken: state.originalToken,
        // Don't persist isAuthenticated - derive it from user/token
      }),
      // On rehydrate, set isAuthenticated based on stored user/token
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!(state.user && state.token)
        }
      },
    }
  )
)
