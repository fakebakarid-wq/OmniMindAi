
import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Search, BrainCircuit, X, Loader2, Bot, User, Globe, AlertTriangle, Menu, Plus, MessageSquare, Trash2, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ChatConfig, ChatSession } from '../types';
import { generateResponse } from '../services/geminiService';
import { getHistory, saveSession, deleteSession, createNewSession, generateTitle, clearAllHistory } from '../services/historyService';

const ChatInterface: React.FC = () => {
  // Initialize with a default session, will be overwritten by effect
  const [currentSession, setCurrentSession] = useState<ChatSession>(createNewSession());
  const [history, setHistory] = useState<ChatSession[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [config, setConfig] = useState<ChatConfig>({ useSearch: false, useReasoning: false });
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    // Load the user-specific history
    const loadedHistory = getHistory();
    setHistory(loadedHistory);
    
    // If there is history, load the most recent one, otherwise create new
    if (loadedHistory.length > 0) {
        setCurrentSession(loadedHistory[0]);
    } else {
        setCurrentSession(createNewSession());
    }
  }, []);

  // Auto-save session when messages change
  useEffect(() => {
    if (currentSession.messages.length > 0) {
      saveSession(currentSession);
      // Update local history list to reflect changes immediately (e.g. title updates)
      setHistory(prev => {
        const index = prev.findIndex(s => s.id === currentSession.id);
        if (index >= 0) {
            const newHist = [...prev];
            newHist[index] = currentSession;
            return newHist;
        }
        return [currentSession, ...prev];
      });
    }
  }, [currentSession]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession.messages]);

  const handleNewChat = () => {
    const newSess = createNewSession();
    setCurrentSession(newSess);
    setIsHistoryOpen(false);
  };

  const loadSession = (session: ChatSession) => {
    setCurrentSession(session);
    setIsHistoryOpen(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const updatedHistory = deleteSession(id);
    setHistory(updatedHistory);
    if (currentSession.id === id) {
        if (updatedHistory.length > 0) {
            setCurrentSession(updatedHistory[0]);
        } else {
            handleNewChat();
        }
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to delete all chat history? This cannot be undone.")) {
        const emptyHistory = clearAllHistory();
        setHistory(emptyHistory);
        handleNewChat();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;

    const userMsg: Message = {
      role: 'user',
      text: input,
      image: previewUrl || undefined
    };

    // Capture current history BEFORE updating state to pass to API
    const sessionHistory = currentSession.messages;

    // Update session with user message and potentially update title if it's the first user message
    setCurrentSession(prev => {
        let newTitle = prev.title;
        // Simple title generation logic: if it's the first or second message
        if (prev.messages.length <= 2) {
            newTitle = generateTitle(userMsg.text);
        }
        return {
            ...prev,
            title: newTitle,
            messages: [...prev.messages, userMsg],
            timestamp: Date.now()
        };
    });

    setInput('');
    setIsLoading(true);

    try {
      // Pass sessionHistory (messages before this new one)
      const response = await generateResponse(sessionHistory, userMsg.text, selectedFile, config);
      
      const modelMsg: Message = {
        role: 'model',
        text: response.text,
        groundingUrls: response.groundingUrls
      };
      
      setCurrentSession(prev => ({
        ...prev,
        messages: [...prev.messages, modelMsg],
        timestamp: Date.now()
      }));

    } catch (error: any) {
      console.error("UI caught error:", error);
      const errorMsg: Message = { 
        role: 'model', 
        text: `⚠️ **Error Encountered**\n\n${error.message || 'An unknown error occurred while connecting to Gemini.'}\n\nPlease check your connection or try a simpler prompt.`, 
        isError: true 
      };
      setCurrentSession(prev => ({
        ...prev,
        messages: [...prev.messages, errorMsg]
      }));
    } finally {
      setIsLoading(false);
      clearFile();
    }
  };

  const toggleSearch = () => setConfig(p => ({ ...p, useSearch: !p.useSearch, useReasoning: false }));
  const toggleReasoning = () => setConfig(p => ({ ...p, useReasoning: !p.useReasoning, useSearch: false }));

  return (
    <div className="flex flex-col h-full bg-slate-900/50 relative overflow-hidden">
      
      {/* Top Header */}
      <div className="h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
            <button 
                onClick={() => setIsHistoryOpen(true)}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
                <Menu size={20} />
            </button>
            <span className="font-semibold text-white truncate max-w-[150px] md:max-w-md text-sm md:text-base">
                {currentSession.title}
            </span>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={handleNewChat}
                className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors"
                title="New Chat"
            >
                <Plus size={22} />
            </button>
        </div>
      </div>

      {/* History Drawer Overlay */}
      {isHistoryOpen && (
        <div className="absolute inset-0 z-50 flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsHistoryOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative w-[80%] max-w-xs h-full bg-slate-900 border-r border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
             <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                <h2 className="font-bold text-white flex items-center gap-2">
                    <History size={18} /> History
                </h2>
                <div className="flex gap-2">
                    {history.length > 0 && (
                        <button 
                            onClick={handleClearAll}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                            title="Clear All History"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                    <button onClick={() => setIsHistoryOpen(false)} className="text-slate-400 hover:text-white p-1.5">
                        <X size={20} />
                    </button>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <button 
                    onClick={handleNewChat}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white mb-4 transition-colors shadow-lg shadow-indigo-900/20"
                >
                    <Plus size={18} />
                    <span className="font-medium">New Chat</span>
                </button>

                {history.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                        No history yet.
                    </div>
                ) : (
                    history.map(session => (
                        <div 
                            key={session.id}
                            onClick={() => loadSession(session)}
                            className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                                currentSession.id === session.id 
                                ? 'bg-slate-800 text-white border border-slate-700' 
                                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                            }`}
                        >
                            <div className="flex items-center gap-3 overflow-hidden">
                                <MessageSquare size={16} className="shrink-0" />
                                <span className="truncate text-sm font-medium">{session.title}</span>
                            </div>
                            <button 
                                onClick={(e) => handleDeleteSession(e, session.id)}
                                className="md:opacity-0 md:group-hover:opacity-100 opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-md transition-all"
                                title="Delete Chat"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
             </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 md:pb-4">
        {currentSession.messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg ${msg.role === 'model' ? (msg.isError ? 'bg-red-600' : 'bg-gradient-to-br from-indigo-600 to-violet-600') : 'bg-slate-700'}`}>
              {msg.role === 'model' ? (msg.isError ? <AlertTriangle size={18} className="text-white"/> : <Bot size={18} className="text-white" />) : <User size={18} className="text-white" />}
            </div>
            
            <div className={`max-w-[85%] rounded-2xl p-4 shadow-md ${
              msg.role === 'user' 
                ? 'bg-slate-700 text-white rounded-tr-sm' 
                : msg.isError 
                  ? 'bg-red-900/20 border border-red-800/50 text-red-200 rounded-tl-sm backdrop-blur-sm' 
                  : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/50'
            }`}>
              {msg.image && (
                <img src={msg.image} alt="User upload" className="max-w-full h-auto rounded-lg mb-3 border border-slate-600" />
              )}
              
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>

              {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-700">
                  <p className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1"><Globe size={12}/> Sources:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.groundingUrls.map((url, i) => (
                      <a key={i} href={url.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-900/50 hover:bg-slate-900 text-blue-400 px-2 py-1 rounded transition-colors truncate max-w-[200px] block border border-slate-700/50">
                        {url.title || url.uri}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-4 animate-pulse">
               <div className="w-8 h-8 rounded-full bg-indigo-600/50 flex items-center justify-center shrink-0">
                  <Bot size={18} className="text-white" />
               </div>
               <div className="bg-slate-800 rounded-2xl rounded-tl-sm p-4 flex items-center gap-3 border border-slate-700/50">
                 <Loader2 className="animate-spin text-indigo-400" size={20} />
                 <span className="text-slate-400 text-sm font-medium">
                    {config.useReasoning ? "Thinking deeply..." : "Analyzing..."}
                 </span>
               </div>
            </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 z-10">
        {previewUrl && (
          <div className="mb-3 relative inline-block group">
            <img src={previewUrl} alt="Preview" className="h-20 w-20 object-cover rounded-xl border border-slate-600 shadow-lg" />
            <button onClick={clearFile} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 shadow-md transition-colors">
              <X size={14} />
            </button>
          </div>
        )}
        
        <div className="flex flex-col gap-3">
           <div className="flex items-center gap-2 px-1">
              <button 
                onClick={toggleReasoning}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  config.useReasoning 
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(79,70,229,0.3)]' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-600'
                }`}
              >
                <BrainCircuit size={14} />
                Deep Think
              </button>
              <button 
                onClick={toggleSearch}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                  config.useSearch 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]' 
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:border-slate-600'
                }`}
              >
                <Search size={14} />
                Web Search
              </button>
           </div>

           <div className="flex gap-2">
            <div className="relative flex-1 group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={config.useReasoning ? "Ask a complex math or science question..." : "Ask anything..."}
                  className="w-full bg-slate-800 text-white rounded-xl pl-4 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border border-slate-700 transition-all group-hover:border-slate-600"
                />
                <label className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all">
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  <ImageIcon size={20} />
                </label>
            </div>
            
            <button 
              onClick={handleSend}
              disabled={isLoading || (!input && !selectedFile)}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl px-5 flex items-center justify-center transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
