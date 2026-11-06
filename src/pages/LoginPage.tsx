import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Eye, EyeOff, Building2, ArrowRight, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { loginWithEmailPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await loginWithEmailPassword(email, password);
      if (res.success) {
        onSuccess?.();
      } else {
        setErrorMessage(res.error || 'Authentication failed. Please verify your credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-stone-900 via-stone-950 to-emerald-950 p-4 sm:p-6 text-stone-100 relative overflow-hidden">
      {/* Decorative luxury backdrop glow */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-emerald-700/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand header */}
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="Pearl Experience Logo"
            className="w-20 h-20 rounded-2xl object-contain shadow-2xl mb-3 mx-auto bg-white p-1.5 border border-stone-700/60"
          />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-sans">
            Pearl Experience
          </h1>
          <p className="text-xs text-stone-300 mt-1 font-medium italic">
            Every Celebration is crafted like a Pearl
          </p>
          <div className="text-[11px] text-emerald-400/90 font-mono mt-1">
            Pearlexperiencespvt.ltd@gmail.com
          </div>
        </div>

        {/* Single Login Form Card (No Role Toggle Switcher) */}
        <div className="bg-stone-900/90 backdrop-blur-xl border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white tracking-tight">
              Sign In to Your Account
            </h2>
            <p className="text-xs text-stone-400">
              Enter your credentials to access your authorized role dashboard
            </p>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@perlexperiences.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-stone-950/80 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-stone-600 transition-colors outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-stone-950/80 border border-stone-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl text-xs text-white placeholder-stone-600 transition-colors outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-300"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-emerald-800 to-emerald-700 hover:from-emerald-700 hover:to-emerald-600 active:scale-[0.99] text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Pearlexperiences</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-stone-500">
          <div>Pearlexperiences Pvt. Ltd. · Enterprise Hospitality Suite</div>
          <div className="text-[10px] text-stone-600 mt-0.5">Contact: Pearlexperiencespvt.ltd@gmail.com</div>
        </div>
      </div>
    </div>
  );
};
