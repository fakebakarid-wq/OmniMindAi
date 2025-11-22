
import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import ImageEditor from './components/ImageEditor';
import ImageGenerator from './components/ImageGenerator';
import LiveInterface from './components/LiveInterface';
import TradingInterface from './components/TradingInterface';
import AuthPage from './components/AuthPage';
import { AppMode, User } from './types';
import { getCurrentUser, logoutUser } from './services/authService';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const [currentMode, setCurrentMode] = useState<AppMode>(AppMode.CHAT);

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    setCurrentMode(AppMode.CHAT);
  };

  if (!user) {
    return <AuthPage onAuthSuccess={setUser} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen bg-slate-950 text-slate-200 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Main Content Area */}
      <div className="flex-1 relative order-1 md:order-2 h-full overflow-hidden flex flex-col">
         {currentMode === AppMode.CHAT && <ChatInterface />}
         {currentMode === AppMode.TRADING && <TradingInterface />}
         {currentMode === AppMode.IMAGE_GEN && <ImageGenerator />}
         {currentMode === AppMode.IMAGE_EDIT && <ImageEditor />}
         {currentMode === AppMode.LIVE_VOICE && <LiveInterface />}
      </div>
      
      {/* Navigation (Sidebar / Bottom Bar) */}
      <div className="order-2 md:order-1 shrink-0 z-50">
          <Sidebar 
            currentMode={currentMode} 
            onModeChange={setCurrentMode} 
            user={user}
            onLogout={handleLogout}
          />
      </div>
    </div>
  );
};

export default App;
