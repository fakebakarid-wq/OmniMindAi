import React, { useState } from 'react';
import { User, Mail, Lock, ArrowRight, BrainCircuit, Loader2, Eye, EyeOff } from 'lucide-react';
import { loginUser, registerUser } from '../services/authService';
import { User as UserType } from '../types';

interface AuthPageProps {
  onAuthSuccess: (user: UserType) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let user: UserType;
      if (isLogin) {
        user = await loginUser(formData.email, formData.password);
      } else {
        if (!formData.name) throw new Error("Name is required");
        user = await registerUser(formData.name, formData.email, formData.password);
      }
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setFormData({ name: '', email: '', password: '' });
    setShowPassword(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0f172a] relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />

      <div className="w-full max-w-md z-10 p-6">
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl p-8">
          
          {/* Logo Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-4">
               <BrainCircuit size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">OmniMind AI</h1>
            <p className="text-slate-400 mt-2 text-center">
              {isLogin ? 'Welcome back! Access your personal AI workspace.' : 'Create an account to unlock full potential.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Full Name</label>
                <div className="relative">
                   <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                   <input 
                     type="text" 
                     required 
                     value={formData.name}
                     onChange={e => setFormData({...formData, name: e.target.value})}
                     className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                     placeholder="John Doe"
                   />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Email Address</label>
              <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="email" 
                    required 
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase ml-1">Password</label>
              <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    required 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-900/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button 
                onClick={toggleMode}
                className="ml-2 text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {isLogin ? 'Sign Up' : 'Log In'}
              </button>
            </p>
          </div>
        </div>
        
        <div className="mt-8 text-center text-slate-600 text-xs">
          <p>Secured by OmniMind Internal Database</p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;