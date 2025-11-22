
import React from 'react';
import { MessageSquare, Wand2, Mic, BrainCircuit, Sparkles, LogOut, TrendingUp } from 'lucide-react';
import { AppMode, User } from '../types';

interface SidebarProps {
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
  user: User | null;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentMode, onModeChange, user, onLogout }) => {
  const navItems = [
    { mode: AppMode.CHAT, label: 'Chat', icon: MessageSquare },
    { mode: AppMode.TRADING, label: 'Pro Trader', icon: TrendingUp },
    { mode: AppMode.IMAGE_GEN, label: 'Generate', icon: Sparkles },
    { mode: AppMode.IMAGE_EDIT, label: 'Editor', icon: Wand2 },
    { mode: AppMode.LIVE_VOICE, label: 'Live', icon: Mic },
  ];

  return (
    <>
      {/* Mobile Bottom Navigation (9:16 Optimization) */}
      <div className="md:hidden bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex justify-around items-center h-16 shrink-0 px-1 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        {navItems.map((item) => (
          <button
            key={item.mode}
            onClick={() => onModeChange(item.mode)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-all ${
              currentMode === item.mode ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <div className={`p-1 rounded-full ${currentMode === item.mode ? 'bg-emerald-500/10' : 'bg-transparent'}`}>
              <item.icon size={20} className={currentMode === item.mode ? 'stroke-[2.5px]' : 'stroke-2'} />
            </div>
            <span className="text-[9px] font-medium tracking-wide">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-72 bg-slate-900 border-r border-slate-800 flex-col shrink-0 transition-all duration-300">
        <div className="p-6 flex items-center gap-3">
           <div className="relative">
             <div className="w-10 h-10 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-xl shadow-lg shadow-emerald-500/20 shrink-0 flex items-center justify-center">
                <BrainCircuit className="text-white" size={20} />
             </div>
             <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-blue-500 border-2 border-slate-900 rounded-full"></div>
           </div>
           <div>
             <h1 className="text-xl font-bold text-white tracking-tight">OmniMind</h1>
             <p className="text-xs text-slate-400 font-medium">Professional AI Assistant</p>
           </div>
        </div>

        <div className="px-4 py-2 flex-1">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-2">Menu</p>
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <button
                key={item.mode}
                onClick={() => onModeChange(item.mode)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${
                  currentMode === item.mode
                    ? 'bg-gradient-to-r from-emerald-900/50 to-slate-900 border-l-4 border-emerald-500 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <item.icon size={20} className={`transition-colors ${currentMode === item.mode ? 'text-emerald-400' : 'text-slate-500 group-hover:text-emerald-400'}`} />
                <span className="font-medium text-sm">
                    {item.label}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          {user && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
               <img src={user.avatar} alt="Avatar" className="w-9 h-9 rounded-full bg-slate-700 border border-slate-600" />
               <div className="overflow-hidden">
                 <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                 <p className="text-xs text-slate-400 truncate">{user.email}</p>
               </div>
            </div>
          )}
          
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm font-medium"
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
