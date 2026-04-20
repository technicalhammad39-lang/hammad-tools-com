'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '@/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import { Loader2, Plus, Search, ShieldBan, ShieldCheck, Trash2, User } from 'lucide-react';

type UserRole = 'admin' | 'manager' | 'user';

interface UserProfileRecord {
  id: string;
  uid?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  role?: UserRole;
  banned?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

interface NewUserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
}

const defaultNewUser: NewUserForm = {
  name: '',
  email: '',
  password: '',
  role: 'user',
  phone: '',
};

function toDateLabel(value: any) {
  const date = value?.toDate?.() || (value ? new Date(value) : null);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email);
}

export default function AdminUsersPage() {
  const { user, isAdmin } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<UserProfileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingUserId, setProcessingUserId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteCandidate, setDeleteCandidate] = useState<UserProfileRecord | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(defaultNewUser);

  const getAuthHeaders = useCallback(async () => {
    const token = await user?.getIdToken();
    if (!token) {
      throw new Error('Admin session expired. Please login again.');
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [user]);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<UserProfileRecord, 'id'>),
      }));
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase();
    if (!needle) {
      return users;
    }

    return users.filter((entry) => {
      const haystack = `${entry.displayName || ''} ${entry.email || ''} ${entry.phone || ''} ${
        entry.role || ''
      } ${entry.banned ? 'banned' : 'active'}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [searchTerm, users]);

  const isBusy = (uid: string) => processingUserId === uid;

  if (!isAdmin) {
    return (
      <div className="pt-32 pb-24 text-center">
        <h1 className="text-3xl font-black uppercase text-brand-text">Access Denied</h1>
      </div>
    );
  }

  async function callAdminUserApi(path: string, init: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: {
        ...(await getAuthHeaders()),
        ...(init.headers || {}),
      },
    });

    const payload = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      [key: string]: unknown;
    };

    if (!response.ok || !payload.success) {
      throw new Error(payload.error || `Request failed (HTTP ${response.status}).`);
    }

    return payload;
  }

  async function handleRoleChange(target: UserProfileRecord, nextRole: UserRole) {
    const currentRole = target.role || 'user';
    if (currentRole === nextRole) {
      return;
    }

    if (!confirm(`Change role for ${target.email || 'this user'} to ${nextRole}?`)) {
      return;
    }

    setProcessingUserId(target.id);
    try {
      await callAdminUserApi(`/api/admin/users/${encodeURIComponent(target.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'set-role',
          role: nextRole,
        }),
      });
      toast.success('Role updated', `${target.email || 'User'} is now ${nextRole}.`);
      await fetchUsers(true);
    } catch (error) {
      toast.error('Role update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setProcessingUserId('');
    }
  }

  async function handleBanToggle(target: UserProfileRecord) {
    const nextBanned = !Boolean(target.banned);
    const actionLabel = nextBanned ? 'ban' : 'unban';
    const targetLabel = target.email || target.displayName || 'this user';

    if (!confirm(`Are you sure you want to ${actionLabel} ${targetLabel}?`)) {
      return;
    }

    setProcessingUserId(target.id);
    try {
      await callAdminUserApi(`/api/admin/users/${encodeURIComponent(target.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: 'set-ban',
          banned: nextBanned,
        }),
      });
      toast.success(nextBanned ? 'User banned' : 'User unbanned', targetLabel);
      await fetchUsers(true);
    } catch (error) {
      toast.error('Ban action failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setProcessingUserId('');
    }
  }

  async function handleDeleteUser(target: UserProfileRecord) {
    setProcessingUserId(target.id);
    try {
      await callAdminUserApi(`/api/admin/users/${encodeURIComponent(target.id)}`, {
        method: 'DELETE',
      });
      toast.success('User deleted', target.email || target.displayName || target.id);
      setDeleteCandidate(null);
      await fetchUsers(true);
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setProcessingUserId('');
    }
  }

  async function handleCreateUser(event: React.FormEvent) {
    event.preventDefault();

    const name = newUser.name.trim();
    const email = newUser.email.trim().toLowerCase();
    const password = newUser.password;

    if (!name) {
      toast.error('Name is required');
      return;
    }
    if (!isValidEmail(email)) {
      toast.error('Valid email is required');
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setCreatingUser(true);
    try {
      await callAdminUserApi('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          role: newUser.role,
          phone: newUser.phone.trim(),
        }),
      });

      toast.success('User created', `${email} can now login.`);
      setCreateModalOpen(false);
      setNewUser(defaultNewUser);
      await fetchUsers(true);
    } catch (error) {
      toast.error('Create user failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setCreatingUser(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase text-brand-text mb-2">
            User <span className="text-primary">Registry</span>
          </h1>
          <p className="text-brand-text/40 text-xs font-black uppercase tracking-widest">
            Total Accounts: {users.length}
          </p>
        </div>

        <div className="flex w-full md:w-auto gap-3">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20 w-5 h-5 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by name/email/status..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/50 text-brand-text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="shrink-0 bg-primary text-black px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border-b-4 border-secondary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add User
          </button>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="p-7 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">
                  Identity
                </th>
                <th className="p-7 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">
                  Status
                </th>
                <th className="p-7 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">
                  Role
                </th>
                <th className="p-7 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">
                  Created
                </th>
                <th className="p-7 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <div className="inline-flex items-center gap-3 text-primary font-black uppercase tracking-widest text-xs">
                      <Loader2 className="w-5 h-5 animate-spin" /> Loading users...
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-brand-text/20 font-black uppercase tracking-widest text-xs">
                    No records found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((entry) => {
                  const isSelf = entry.id === user?.uid;
                  const entryRole = (entry.role || 'user') as UserRole;
                  const isBanned = Boolean(entry.banned);

                  return (
                    <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="p-7">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 bg-white/5 rounded-2xl flex items-center justify-center text-primary border border-white/10">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-black text-brand-text uppercase text-sm">
                              {entry.displayName || 'Unnamed User'}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/30 mt-1">
                              {entry.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="p-7">
                        <span
                          className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-2 ${
                            isBanned
                              ? 'bg-accent/10 text-accent border-accent/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {isBanned ? <ShieldBan className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                          {isBanned ? 'Banned' : 'Active'}
                        </span>
                      </td>

                      <td className="p-7">
                        <select
                          value={entryRole}
                          disabled={isSelf || isBusy(entry.id)}
                          onChange={(event) => {
                            void handleRoleChange(entry, event.target.value as UserRole);
                          }}
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-widest text-brand-text/70 focus:outline-none focus:border-primary disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      <td className="p-7 text-xs font-black uppercase text-brand-text/40">
                        {toDateLabel(entry.createdAt)}
                      </td>

                      <td className="p-7 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            disabled={isSelf || isBusy(entry.id)}
                            onClick={() => {
                              void handleBanToggle(entry);
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border disabled:opacity-50 ${
                              isBanned
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-accent/10 text-accent border-accent/20 hover:bg-accent/20'
                            }`}
                          >
                            {isBusy(entry.id) ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
                              </span>
                            ) : isBanned ? (
                              'Unban'
                            ) : (
                              'Ban'
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isSelf || isBusy(entry.id)}
                            onClick={() => setDeleteCandidate(entry)}
                            className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {createModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.form
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              onSubmit={handleCreateUser}
              className="w-full max-w-2xl glass rounded-[2rem] border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5">
                <h2 className="text-2xl font-black uppercase text-brand-text">Create New User</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mt-2">
                  Create user in Auth + Firestore with assigned role
                </p>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newUser.name}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, name: event.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, email: event.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={newUser.password}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, password: event.target.value }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
                <select
                  value={newUser.role}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, role: event.target.value as UserRole }))}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                >
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                <input
                  type="text"
                  placeholder="Phone (optional)"
                  value={newUser.phone}
                  onChange={(event) => setNewUser((prev) => ({ ...prev, phone: event.target.value }))}
                  className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setCreateModalOpen(false);
                    setNewUser(defaultNewUser);
                  }}
                  className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-brand-text/50 hover:text-brand-text"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-8 py-3 rounded-xl bg-primary text-black border-b-4 border-secondary text-xs font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
                >
                  {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create User
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {deleteCandidate ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[125] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="w-full max-w-xl glass rounded-[2rem] border border-white/10 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5">
                <h3 className="text-xl font-black uppercase text-brand-text">Delete User Permanently</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mt-2">
                  This action cannot be undone.
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div className="rounded-2xl border border-accent/20 bg-accent/10 p-4">
                  <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Target</div>
                  <div className="text-sm font-black text-brand-text mt-1 whitespace-pre-wrap break-words">
                    {deleteCandidate.displayName || 'Unnamed User'}
                  </div>
                  <div className="text-xs text-brand-text/60 mt-1 whitespace-pre-wrap break-words">
                    {deleteCandidate.email || deleteCandidate.id}
                  </div>
                </div>
                <p className="text-xs text-brand-text/60 leading-relaxed">
                  User auth account, profile record, and related user-linked records will be removed.
                </p>
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(null)}
                  className="px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-brand-text/50 hover:text-brand-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBusy(deleteCandidate.id)}
                  onClick={() => {
                    void handleDeleteUser(deleteCandidate);
                  }}
                  className="px-8 py-3 rounded-xl bg-accent/15 border border-accent/30 text-accent text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 disabled:opacity-60"
                >
                  {isBusy(deleteCandidate.id) ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Deleting
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" /> Delete User
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {refreshing ? (
        <div className="fixed bottom-5 right-5 px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-widest text-brand-text/70">
          Syncing...
        </div>
      ) : null}
    </div>
  );
}
