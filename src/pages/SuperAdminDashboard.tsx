import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './SuperAdminDashboard.css'

type AccountRow = {
  id: number
  username: string
  name: string | null
  account_type: string
  active: boolean
}

export default function SuperAdminDashboard() {
  const user = useAuthStore((s) => s.user)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin_accounts'],
    queryFn: async () => {
      const res = await api.get<{ accounts: AccountRow[] }>('/admin/accounts')
      return res.data.accounts
    },
    enabled: user?.super_admin === true,
  })

  if (!user?.super_admin) {
    return <Navigate to="/analytics" replace />
  }

  return (
    <div className="super-admin-dashboard">
      <div className="super-admin-dashboard-header">
        <h1>Dashboard</h1>
        <p className="super-admin-dashboard-intro">All accounts on the platform</p>
      </div>

      {isLoading && <p className="super-admin-dashboard-muted">Loading…</p>}
      {error && (
        <p className="super-admin-dashboard-error">
          {axios.isAxiosError(error)
            ? (error.response?.data?.error as string) || error.message
            : 'Could not load accounts'}
        </p>
      )}

      {!isLoading && !error && data && (
        <div className="super-admin-table-wrap">
          <table className="super-admin-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Account type</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id}>
                  <td>{row.username}</td>
                  <td>{row.name ?? '—'}</td>
                  <td>{row.account_type}</td>
                  <td>{row.active ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
