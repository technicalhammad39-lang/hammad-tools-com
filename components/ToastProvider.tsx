'use client';

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  push: (toast: Omit<ToastItem, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

function createId() {
  return Math.random().toString(36).slice(2, 10);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Record<string, number>>({});

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timers.current[id]) {
      window.clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = createId();
    setToasts((prev) => [{ id, ...toast }, ...prev].slice(0, 5));
    timers.current[id] = window.setTimeout(() => removeToast(id), 5000);
  }, [removeToast]);

  const value = useMemo<ToastContextValue>(() => ({
    push,
    success: (title, description) => push({ type: 'success', title, description }),
    error: (title, description) => push({ type: 'error', title, description }),
    info: (title, description) => push({ type: 'info', title, description }),
  }), [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed left-1/2 z-[300] w-[92vw] max-w-md -translate-x-1/2 space-y-3 pointer-events-none"
        style={{ top: 'calc(var(--user-order-offset) + 0.75rem + env(safe-area-inset-top, 0px))' }}
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.98 }}
              className="pointer-events-auto"
            >
              <div className={`glass border rounded-2xl px-5 py-4 flex items-start gap-3 shadow-xl ${toast.type === 'success'
                ? 'border-emerald-500/20'
                : toast.type === 'error'
                  ? 'border-accent/20'
                  : 'border-white/10'
                }`}>
                <div className={`mt-0.5 ${toast.type === 'success'
                  ? 'text-emerald-400'
                  : toast.type === 'error'
                    ? 'text-accent'
                    : 'text-primary'
                  }`}>
                  {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <div className="text-[11px] font-black uppercase tracking-widest text-brand-text">{toast.title}</div>
                  {toast.description ? (
                    <div className="text-[10px] font-black uppercase tracking-widest text-brand-text/50 mt-1">
                      {toast.description}
                    </div>
                  ) : null}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-brand-text/40 hover:text-brand-text transition-colors"
                  aria-label="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
