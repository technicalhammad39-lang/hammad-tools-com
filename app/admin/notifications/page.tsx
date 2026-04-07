'use client';

import { useEffect, useMemo, useState } from 'react';
import { db, auth } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { Loader2, Send, Users, User, Bell, Megaphone } from 'lucide-react';
import { useToast } from '@/components/ToastProvider';

interface DispatchRecord {
  id: string;
  title: string;
  body: string;
  targetType: 'broadcast' | 'targeted';
  targetRole?: 'all' | 'admin' | 'user';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdAt?: any;
}

interface UserRecord {
  id: string;
  displayName?: string;
  email?: string;
  role?: 'admin' | 'manager' | 'user';
}

export default function AdminNotificationsPage() {
  const { isStaff } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [targetType, setTargetType] = useState<'broadcast' | 'targeted'>('broadcast');
  const [targetRole, setTargetRole] = useState<'user' | 'admin' | 'all'>('user');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('/dashboard');
  const [imageUrl, setImageUrl] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<UserRecord, 'id'>) })));
      setLoading(false);
    }, (error) => {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
      setLoading(false);
    });

    const q = query(collection(db, 'notification_dispatches'), orderBy('createdAt', 'desc'));
    const unsubDispatches = onSnapshot(q, (snapshot) => {
      setDispatches(snapshot.docs.map((doc) => ({ id: doc.id, ...(doc.data() as Omit<DispatchRecord, 'id'>) })));
    }, (error) => {
      console.error('Failed to load notification dispatches:', error);
      toast.error('Failed to load dispatch history');
    });

    return () => {
      unsubUsers();
      unsubDispatches();
    };
  }, [isStaff]);

  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) {
      return users;
    }

    return users.filter((user) => {
      const haystack = `${user.displayName || ''} ${user.email || ''}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [users, search]);

  if (!isStaff) {
    return <div className="p-10 text-center font-black uppercase tracking-widest">Access Denied</div>;
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error('Missing notification content', 'Title and body are required.');
      return;
    }

    if (targetType === 'targeted' && selectedUserIds.length === 0) {
      setStatusMessage('Please select at least one user for targeted notifications.');
      toast.error('Select at least one user');
      return;
    }

    setSending(true);
    setStatusMessage('');

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Authentication token missing');
      }

      const payloadBody = JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        link: link.trim() || '/dashboard',
        imageUrl: imageUrl.trim() || undefined,
        targetType,
        userIds: targetType === 'targeted' ? selectedUserIds : undefined,
        targetRole: targetType === 'broadcast' ? targetRole : undefined,
      });

      let token = await currentUser.getIdToken(true);
      let response = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: payloadBody,
      });

      if (response.status === 401) {
        token = await currentUser.getIdToken(true);
        response = await fetch('/api/admin/notifications/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: payloadBody,
        });
      }

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Failed to send notification');
      }

      setStatusMessage(`Sent to ${payload.recipientCount} recipient(s).`);
      toast.success('Notification sent', `Sent to ${payload.recipientCount} recipient(s).`);
      setTitle('');
      setBody('');
      setImageUrl('');
      setSelectedUserIds([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send notification';
      setStatusMessage(message);
      toast.error('Failed to send notification', message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-black uppercase text-brand-text">Notification <span className="text-primary">Broadcast</span></h1>
        <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-[0.3em] mt-2">In-app notifications delivery</p>
      </div>

      <div className="glass rounded-[2rem] border border-white/5 p-6 md:p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Notification title"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="Destination link"
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
          />
        </div>

        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Notification body"
          className="w-full h-24 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary resize-none"
        />

        <input
          type="text"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="Image URL (optional)"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Target Type</div>
            <div className="flex gap-2">
              <button
                onClick={() => setTargetType('broadcast')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${targetType === 'broadcast' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-brand-text/40 border-white/10'}`}
              >
                <Megaphone className="w-4 h-4 inline mr-1" /> Broadcast
              </button>
              <button
                onClick={() => setTargetType('targeted')}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${targetType === 'targeted' ? 'bg-primary text-black border-primary' : 'bg-white/5 text-brand-text/40 border-white/10'}`}
              >
                <User className="w-4 h-4 inline mr-1" /> Targeted
              </button>
            </div>

            {targetType === 'broadcast' ? (
              <select
                value={targetRole}
                onChange={(event) => setTargetRole(event.target.value as 'all' | 'admin' | 'user')}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              >
                <option value="user">All Users</option>
                <option value="admin">All Admins</option>
                <option value="all">Everyone</option>
              </select>
            ) : null}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
            <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Preview</div>
            <div className="mt-3 border border-white/10 bg-black/30 rounded-xl p-4">
              <div className="text-sm font-black text-brand-text">{title || 'Notification title'}</div>
              <div className="text-xs text-brand-text/60 mt-1">{body || 'Notification body preview...'}</div>
              <div className="text-[10px] text-primary uppercase tracking-widest mt-3">{link || '/dashboard'}</div>
            </div>
          </div>
        </div>

        {targetType === 'targeted' ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users by name or email"
                className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary"
              />
              <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">Selected: {selectedUserIds.length}</div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {loading ? (
                <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 text-primary animate-spin" /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center text-[10px] font-black uppercase tracking-widest text-brand-text/30 py-6">No users found.</div>
              ) : (
                filteredUsers.map((user) => {
                  const checked = selectedUserIds.includes(user.id);
                  return (
                    <label key={user.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-black/30 border border-white/10 cursor-pointer">
                      <div>
                        <div className="text-xs font-black uppercase text-brand-text">{user.displayName || 'User'}</div>
                        <div className="text-[9px] text-brand-text/40 font-black uppercase tracking-widest">{user.email} · {user.role || 'user'}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          if (event.target.checked) {
                            setSelectedUserIds((prev) => [...prev, user.id]);
                          } else {
                            setSelectedUserIds((prev) => prev.filter((id) => id !== user.id));
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </label>
                  );
                })
              )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40">{statusMessage || 'Delivery history is tracked below.'}</div>
          <button
            onClick={handleSend}
            disabled={sending}
            className="bg-primary text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] border-b-4 border-secondary flex items-center gap-2 disabled:opacity-60"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send Notification
          </button>
        </div>
      </div>

      <div className="glass rounded-[2rem] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-2 text-brand-text font-black uppercase tracking-widest text-sm">
          <Bell className="w-4 h-4 text-primary" /> Delivery History
        </div>

        <div className="divide-y divide-white/5">
          {dispatches.length === 0 ? (
            <div className="p-10 text-center text-brand-text/30 text-xs uppercase tracking-widest font-black">No notifications dispatched yet.</div>
          ) : (
            dispatches.map((dispatch) => (
              <div key={dispatch.id} className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-base font-black uppercase text-brand-text">{dispatch.title}</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/40 mt-1">{dispatch.body}</div>
                  <div className="text-[9px] text-primary font-black uppercase tracking-widest mt-2">{dispatch.targetType} · {dispatch.targetRole || 'custom targets'}</div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-brand-text/40">
                    <Users className="w-3 h-3 inline mr-1" /> {dispatch.recipientCount}
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest text-emerald-400">
                    Sent {dispatch.sentCount}
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-[9px] font-black uppercase tracking-widest text-accent">
                    Fail {dispatch.failedCount}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

