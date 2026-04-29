import { Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './SuperAdminDashboard.css'

type UserRow = {
  id: number
  username: string
  name: string | null
  role: string
  account_type: string
  active: boolean
}

type AccountGroup = {
  account_id: number | null
  account_title: string
  account_kind: string
  main_users: UserRow[]
  sub_accounts: UserRow[]
}

export default function SuperAdminDashboard() {
  const user = useAuthStore((s) => s.user)

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin_accounts'],
    queryFn: async () => {
      const res = await api.get<{ groups: AccountGroup[] }>('/admin/accounts')
      return res.data.groups
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
        <div className="super-admin-groups">
          {data.map((group) => (
            <section
              key={group.account_id === null ? 'no-account' : String(group.account_id)}
              className="super-admin-account-card"
            >
              <div className="super-admin-account-card-header">
                <h2 className="super-admin-account-title">{group.account_title}</h2>
                <span className="super-admin-account-kind">{group.account_kind}</span>
              </div>

              <div className="super-admin-table-wrap">
                <table className="super-admin-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Account type</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.main_users.map((row) => (
                      <tr key={row.id}>
                        <td>{row.username}</td>
                        <td>{row.name ?? '—'}</td>
                        <td>{row.role}</td>
                        <td>{row.account_type}</td>
                        <td>{row.active ? 'Yes' : 'No'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {group.sub_accounts.length > 0 && (
                <>
                  <h3 className="super-admin-sub-accounts-heading">Sub-accounts</h3>
                  <div className="super-admin-table-wrap super-admin-table-wrap--nested">
                    <table className="super-admin-table super-admin-table--sub">
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Name</th>
                          <th>Role</th>
                          <th>Account type</th>
                          <th>Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.sub_accounts.map((row) => (
                          <tr key={row.id}>
                            <td>{row.username}</td>
                            <td>{row.name ?? '—'}</td>
                            <td>{row.role}</td>
                            <td>{row.account_type}</td>
                            <td>{row.active ? 'Yes' : 'No'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
