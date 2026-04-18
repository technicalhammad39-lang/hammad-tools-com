'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Download, Mail, RefreshCcw, Search } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type SubscriberRecord = {
  id: string;
  email: string;
  source: string;
  pagePath: string;
  status: string;
  subscribedAt: string | null;
  updatedAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

function toCsvValue(value: string) {
  const normalized = value.replace(/"/g, '""');
  return `"${normalized}"`;
}

export default function AdminSubscribersPage() {
  const { user, isAdmin } = useAuth();
  const [subscribers, setSubscribers] = React.useState<SubscriberRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState('');

  const fetchSubscribers = React.useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage('');

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/subscribers', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const payload = (await response.json().catch(() => ({}))) as {
        success?: boolean;
        subscribers?: SubscriberRecord[];
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || `Failed to load subscribers (HTTP ${response.status}).`);
      }

      setSubscribers(Array.isArray(payload.subscribers) ? payload.subscribers : []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to load subscribers.');
      setSubscribers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  React.useEffect(() => {
    if (!isAdmin || !user) {
      setLoading(false);
      return;
    }
    void fetchSubscribers();
  }, [isAdmin, user, fetchSubscribers]);

  const filteredSubscribers = React.useMemo(() => {
    if (!searchTerm.trim()) return subscribers;
    const needle = searchTerm.trim().toLowerCase();
    return subscribers.filter((subscriber) =>
      `${subscriber.email} ${subscriber.source} ${subscriber.pagePath}`.toLowerCase().includes(needle)
    );
  }, [subscribers, searchTerm]);

  const handleExport = () => {
    if (!filteredSubscribers.length) return;

    const header = ['Email', 'Source', 'Page Path', 'Status', 'Subscribed At'];
    const rows = filteredSubscribers.map((subscriber) => [
      subscriber.email,
      subscriber.source || 'footer-newsletter',
      subscriber.pagePath || '-',
      subscriber.status || 'active',
      subscriber.subscribedAt || '',
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => toCsvValue(cell)).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return <div className="p-10 text-center font-black uppercase tracking-widest">Access Denied</div>;
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black uppercase text-brand-text mb-2">
            Newsletter <span className="text-primary">Subscribers</span>
          </h1>
          <p className="text-brand-text/40 text-xs font-black uppercase tracking-widest">
            Total emails: {subscribers.length}
          </p>
        </div>

        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="relative w-full md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-text/20 w-5 h-5 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search subscribers..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-xs font-black uppercase tracking-widest focus:outline-none focus:border-primary/50 text-brand-text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => void fetchSubscribers(true)}
            className="px-4 py-4 rounded-2xl border border-white/10 bg-white/5 text-brand-text/60 hover:text-brand-text hover:border-primary/40 transition-colors"
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCcw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-5 py-4 rounded-2xl border border-primary/20 bg-primary/10 text-primary hover:bg-primary hover:text-black transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
            disabled={!filteredSubscribers.length}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="glass rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">Email</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">Source</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">Page</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-[0.2em] text-brand-text/40 border-b border-white/5">Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <div className="animate-pulse text-primary font-black uppercase tracking-widest text-xs">Loading subscribers...</div>
                  </td>
                </tr>
              ) : errorMessage ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-accent font-black uppercase tracking-widest text-xs">
                    {errorMessage}
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center text-brand-text/30 font-black uppercase tracking-widest text-xs">
                    No subscriber found.
                  </td>
                </tr>
              ) : (
                filteredSubscribers.map((subscriber, index) => (
                  <motion.tr
                    key={subscriber.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.015, 0.2) }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="p-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-black text-brand-text break-all">{subscriber.email}</span>
                      </div>
                    </td>
                    <td className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-text/50">
                      {subscriber.source || 'footer-newsletter'}
                    </td>
                    <td className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-text/50">
                      {subscriber.pagePath || '-'}
                    </td>
                    <td className="p-6 text-[10px] font-black uppercase tracking-widest text-brand-text/50">
                      {formatDate(subscriber.subscribedAt)}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
