'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import GoogleLogo from '@/components/auth/GoogleLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { login, loginWithEmail, signupWithEmail } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === 'login') {
        await loginWithEmail(email, password);
        toast.success('Logged in');
      } else {
        await signupWithEmail(email, password, name);
        toast.success('Account created');
      }
      onClose();
    } catch (err: any) {
      const message = err?.message || 'Authentication failed';
      setError(message);
      toast.error('Authentication failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await login();
      toast.success('Logged in');
      onClose();
    } catch (err: any) {
      const message = err?.message || 'Google login failed';
      setError(message);
      toast.error('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-[201] p-1"
          >
            <div className="bg-[#1A1A1A] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden relative">
              {/* Decorative Background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -z-10" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-secondary/5 blur-3xl -z-10" />

              <div className="p-10">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-4xl font-black text-brand-text uppercase">
                      {mode === 'login' ? 'Welcome Back' : 'Join the Elite'}
                    </h2>
                    <p className="text-brand-text/40 text-[10px] font-black uppercase tracking-widest mt-1">
                      {mode === 'login' ? 'Enter your credentials to continue' : 'Start your premium journey today'}
                    </p>
                  </div>
                  <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-2xl transition-colors text-brand-text/40">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">
                    {error}
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <div className="relative group">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text/20 group-focus-within:text-primary transition-colors" />
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-brand-text focus:outline-none focus:border-primary/50 transition-all font-bold placeholder:text-brand-text/20"
                      />
                    </div>
                  )}
                  <div className="relative group">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text/20 group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-brand-text focus:outline-none focus:border-primary/50 transition-all font-bold placeholder:text-brand-text/20"
                    />
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-text/20 group-focus-within:text-primary transition-colors" />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-brand-text focus:outline-none focus:border-primary/50 transition-all font-bold placeholder:text-brand-text/20"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-black py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center space-x-3 border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>
                        <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                        <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </button>
                </form>

                <div className="relative my-10">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5" /></div>
                  <div className="relative flex justify-center text-[10px] uppercase font-black"><span className="bg-[#1A1A1A] px-4 text-brand-text/20 tracking-[0.2em]">Or Continue With</span></div>
                </div>

                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full glass py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center space-x-3 border border-white/10 hover:bg-white/10 transition-all text-brand-text"
                >
                  <GoogleLogo className="w-5 h-5" />
                  <span>Google Account</span>
                </button>

                <div className="mt-10 text-center">
                  <button
                    onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                    className="text-brand-text/40 hover:text-primary text-[10px] font-black uppercase tracking-widest transition-colors"
                  >
                    {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AuthModal;
