import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import './SubAccounts.css';

const SUBDOMAIN_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

interface SubAccount {
  id: number;
  name: string;
  email: string;
  status: number;
  role: string;
  created_at: string;
  buckets_count: number;
  schedules_count: number;
  client_portal_only?: boolean;
}

interface ClientPortalDomainApi {
  id: number;
  hostname: string;
  user_id: number;
}

function PortalUrlSection({
  subAccountId,
  clientPortalOnly,
  zone,
  domain,
}: {
  subAccountId: number;
  clientPortalOnly: boolean;
  zone: string | null | undefined;
  domain: ClientPortalDomainApi | undefined;
}) {
  const queryClient = useQueryClient();
  const [sub, setSub] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (domain && zone) {
      const suffix = `.${zone}`;
      setSub(
        domain.hostname.endsWith(suffix)
          ? domain.hostname.slice(0, -suffix.length)
          : ''
      );
    } else {
      setSub('');
    }
  }, [domain, zone]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!zone) throw new Error('No domain zone');
      const part = sub.trim().toLowerCase();
      if (!SUBDOMAIN_RE.test(part)) {
        throw new Error(
          'Use a single subdomain label (letters, numbers, hyphens), e.g. acme-corp'
        );
      }
      const hostname = `${part}.${zone}`;
      if (domain) {
        return api.patch(`/client_portal_domains/${domain.id}`, {
          client_portal_domain: { hostname },
        });
      }
      return api.post('/client_portal_domains', {
        client_portal_domain: {
          user_id: subAccountId,
          hostname,
          branding: {},
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_portal_domains'] });
      setLocalError('');
    },
    onError: (err: any) => {
      const d = err.response?.data;
      const msg = Array.isArray(d?.errors)
        ? d.errors.join(', ')
        : d?.errors || d?.error || err.message || 'Could not save portal URL';
      setLocalError(typeof msg === 'string' ? msg : 'Could not save portal URL');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!domain) return;
      return api.delete(`/client_portal_domains/${domain.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client_portal_domains'] });
      setLocalError('');
    },
    onError: (err: any) => {
      const d = err.response?.data;
      setLocalError(
        typeof d?.error === 'string' ? d.error : 'Could not remove portal URL'
      );
    },
  });

  if (!clientPortalOnly) return null;

  return (
    <div className="sub-account-portal-url">
      <label>Client portal URL</label>
      {!zone ? (
        <p className="portal-hint">
          Choose your company domain zone under{' '}
          <Link to="/white-label">White label</Link> first. Portal addresses must
          be a subdomain of that zone (your approved domain pool only).
        </p>
      ) : (
        <>
          <p className="portal-hint">
            Only subdomains of <strong>{zone}</strong> are allowed. Add DNS &amp;
            DigitalOcean when you use a new hostname.
          </p>
          <div className="portal-input-row">
            <span>https://</span>
            <input
              type="text"
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              placeholder="client-name"
              autoComplete="off"
              spellCheck={false}
            />
            <span className="portal-zone">.{zone}</span>
          </div>
          {domain ? (
            <a
              className="portal-link"
              href={`https://${domain.hostname}/login`}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open https://{domain.hostname}/login
            </a>
          ) : null}
          {localError ? <p className="portal-err">{localError}</p> : null}
          <div className="portal-actions">
            <button
              type="button"
              className="portal-btn portal-btn-primary"
              disabled={saveMutation.isPending || !sub.trim()}
              onClick={() => {
                setLocalError('');
                saveMutation.mutate();
              }}
            >
              {domain ? 'Update URL' : 'Save portal URL'}
            </button>
            {domain ? (
              <button
                type="button"
                className="portal-btn portal-btn-danger"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (
                    window.confirm(
                      `Remove portal URL https://${domain.hostname} for this client?`
                    )
                  ) {
                    setLocalError('');
                    deleteMutation.mutate();
                  }
                }}
              >
                Remove
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export default function SubAccounts() {
  const queryClient = useQueryClient();
  const { switchToSubAccount, user } = useAuthStore();

  if (user?.client_portal_only) {
    return <Navigate to="/analytics" replace />;
  }
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [error, setError] = useState('');

  // Fetch sub-accounts
  const { data: subAccountsData, isLoading } = useQuery({
    queryKey: ['sub_accounts'],
    queryFn: async () => {
      const response = await api.get('/sub_accounts');
      return response.data as {
        sub_accounts: SubAccount[];
        account_top_level_domain?: string | null;
      };
    },
  });

  const { data: portalDomains = [] } = useQuery({
    queryKey: ['client_portal_domains'],
    queryFn: async () => {
      const r = await api.get('/client_portal_domains');
      return (r.data.client_portal_domains || []) as ClientPortalDomainApi[];
    },
    enabled: Boolean(user?.reseller || user?.super_admin),
  });

  // Create sub-account mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post('/sub_accounts', { sub_account: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_accounts'] });
      setShowCreateModal(false);
      setName('');
      setEmail('');
      setPassword('');
      setPasswordConfirmation('');
      setShowPassword(false);
      setShowPasswordConfirmation(false);
      setError('');
    },
    onError: (err: any) => {
      const d = err.response?.data;
      const fromArray = Array.isArray(d?.errors) ? d.errors.join(', ') : '';
      const fromError = typeof d?.error === 'string' ? d.error : '';
      const fromDetails = typeof d?.message === 'string' ? d.message : '';
      setError(
        [fromArray, fromError, fromDetails].filter(Boolean).join(' ') ||
          'Failed to create sub-account'
      );
    },
  });

  // Delete sub-account mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.delete(`/sub_accounts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sub_accounts'] });
    },
  });

  // Switch to sub-account mutation
  const switchMutation = useMutation({
    mutationFn: async (id: number) => {
      return await api.post(`/sub_accounts/switch/${id}`);
    },
    onSuccess: (response) => {
      // Store original user/token before switching
      switchToSubAccount(response.data.user, response.data.token);
      // Refresh page to reload with new context
      window.location.href = '/analytics';
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }
    
    createMutation.mutate({
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
    });
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete sub-account "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleSwitch = (id: number, name: string) => {
    if (window.confirm(`Switch to "${name}"'s account? You'll be logged in as this user.`)) {
      switchMutation.mutate(id);
    }
  };

  const subAccounts = subAccountsData?.sub_accounts || [];
  const accountTopLevelDomain = subAccountsData?.account_top_level_domain;

  if (isLoading) {
    return <div className="sub-accounts-page"><p>Loading...</p></div>;
  }

  return (
    <div className="sub-accounts-page">
      <div className="page-header">
        <h1>Sub-Accounts</h1>
        <button onClick={() => setShowCreateModal(true)} className="create-btn">
          + Create Sub-Account
        </button>
      </div>

      {(user?.reseller || user?.super_admin) && (
        <div className="sub-accounts-wl-banner" role="region" aria-label="White label">
          <div className="sub-accounts-wl-banner-text">
            <strong>Client portal &amp; white label</strong>
            <span>
              Map a hostname to a client sub-account and set branding (logo, colors) for their login experience.
            </span>
          </div>
          <Link to="/white-label" className="sub-accounts-wl-link">
            Open white label
          </Link>
        </div>
      )}

      {subAccounts.length === 0 ? (
        <div className="empty-state">
          <p>No sub-accounts yet. Create your first sub-account to manage multiple user accounts!</p>
        </div>
      ) : (
        <div className="sub-accounts-grid">
          {subAccounts.map((subAccount: SubAccount) => (
            <div key={subAccount.id} className="sub-account-card">
              <div className="sub-account-header">
                <h3>{subAccount.name}</h3>
                <div className="sub-account-actions">
                  <button
                    onClick={() => handleSwitch(subAccount.id, subAccount.name)}
                    className="switch-btn"
                    title="Switch to this account"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="17 1 21 5 17 9"/>
                      <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                      <polyline points="7 23 3 19 7 15"/>
                      <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(subAccount.id, subAccount.name)}
                    className="delete-btn"
                    title="Delete sub-account"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <p className="sub-account-email">{subAccount.email}</p>
              
              <div className="sub-account-stats">
                <div className="stat">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.25rem'}}>
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
                  </svg>
                  <span className="stat-value">{subAccount.buckets_count}</span>
                  <span className="stat-label">Buckets</span>
                </div>
                <div className="stat">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginRight: '0.25rem'}}>
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <span className="stat-value">{subAccount.schedules_count}</span>
                  <span className="stat-label">Schedules</span>
                </div>
              </div>

              <PortalUrlSection
                subAccountId={subAccount.id}
                clientPortalOnly={Boolean(subAccount.client_portal_only)}
                zone={accountTopLevelDomain}
                domain={portalDomains.find((d) => d.user_id === subAccount.id)}
              />
              
              <div className="sub-account-status">
                <span className={`status-badge ${subAccount.status === 1 ? 'active' : 'inactive'}`}>
                  {subAccount.status === 1 ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Sub-Account Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create New Sub-Account</h2>
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#666'
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="passwordConfirmation">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPasswordConfirmation ? 'text' : 'password'}
                    id="passwordConfirmation"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      color: '#666'
                    }}
                    title={showPasswordConfirmation ? 'Hide password' : 'Show password'}
                  >
                    {showPasswordConfirmation ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowPassword(false);
                    setShowPasswordConfirmation(false);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Sub-Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

