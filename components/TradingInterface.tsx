import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, Upload, TrendingUp, TrendingDown, Activity, X, Loader2, Bot, User, AlertTriangle, Info } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, ChatSession } from '../types';
import { generateTradingAnalysis } from '../services/geminiService';
import { createNewSession, generateTitle, saveSession, getHistory } from '../services/historyService';

const TradingInterface: React.FC = () => {
  const [currentSession, setCurrentSession] = useState<ChatSession>(createNewSession());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Load previous session or start fresh
  useEffect(() => {
    // For trading, we might want a separate history, but for now, we reuse the session structure
    // but we start fresh to encourage new analysis
    setCurrentSession({
        id: Date.now().toString(),
        title: 'Trading Analysis',
        messages: [{
            role: 'model',
            text: "## 📈 OmniMind Pro Trader\n\nI am ready to analyze the markets. \n\n**Upload a chart** (Candlestick, Line, Heikin Ashi) or ask me about:\n*   **Crypto/Forex/Stocks** technical analysis\n*   **Option Strategies** (Greeks, Straddles)\n*   **Price Action** (Support, Resistance, Patterns)\n\nUpload a screenshot of your chart for the best results!"
        }],
        timestamp: Date.now()
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession.messages]);

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
      text: input || "Analyze this chart in detail.",
      image: previewUrl || undefined
    };

    // Capture history before updating state
    const sessionHistory = currentSession.messages;

    setCurrentSession(prev => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        timestamp: Date.now()
    }));

    setInput('');
    setIsLoading(true);

    try {
      // Pass history to the service
      const response = await generateTradingAnalysis(sessionHistory, userMsg.text, selectedFile);
      
      const modelMsg: Message = {
        role: 'model',
        text: response.text,
      };
      
      setCurrentSession(prev => ({
        ...prev,
        messages: [...prev.messages, modelMsg],
        timestamp: Date.now()
      }));

    } catch (error: any) {
      console.error("Trading UI Error:", error);
      const errorMsg: Message = { 
        role: 'model', 
        text: `⚠️ **Analysis Failed**\n\n${error.message}`, 
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

  return (
    <div className="flex flex-col h-full bg-[#0B1215] relative overflow-hidden">
      {/* Grid Background for "Technical" feel */}
      <div className="absolute inset-0 opacity-10" 
           style={{ 
             backgroundImage: 'linear-gradient(#1f2937 1px, transparent 1px), linear-gradient(to right, #1f2937 1px, transparent 1px)', 
             backgroundSize: '20px 20px' 
           }}>
      </div>

      {/* Header */}
      <div className="h-14 bg-[#0B1215]/90 backdrop-blur-md border-b border-emerald-900/30 flex items-center justify-between px-4 shrink-0 z-20 shadow-md">
        <div className="flex items-center gap-2 text-emerald-400">
            <Activity size={20} />
            <span className="font-bold tracking-wide">PRO TRADER TERMINAL</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 md:pb-4 z-10">
        {currentSession.messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 shadow-lg border ${
                msg.role === 'model' 
                ? 'bg-slate-800 border-emerald-500/50 text-emerald-400' 
                : 'bg-slate-700 border-slate-600 text-white'
            }`}>
              {msg.role === 'model' ? <TrendingUp size={20} /> : <User size={20} />}
            </div>
            
            <div className={`max-w-[90%] md:max-w-[80%] rounded-xl p-4 shadow-lg ${
              msg.role === 'user' 
                ? 'bg-slate-800 text-white border border-slate-700' 
                : msg.isError 
                  ? 'bg-red-900/20 border border-red-800/50 text-red-200' 
                  : 'bg-[#111a1f] text-slate-200 border border-emerald-900/30'
            }`}>
              {msg.image && (
                <div className="mb-3 overflow-hidden rounded-lg border border-slate-700">
                    <img src={msg.image} alt="Chart" className="w-full h-auto max-h-[300px] object-contain bg-black" />
                </div>
              )}
              
              <div className="prose prose-invert prose-sm max-w-none prose-headings:text-emerald-400 prose-strong:text-emerald-200 prose-a:text-blue-400">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-4 animate-pulse">
               <div className="w-9 h-9 rounded-md bg-slate-800 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Activity size={20} className="text-emerald-400" />
               </div>
               <div className="bg-[#111a1f] rounded-xl p-4 flex items-center gap-3 border border-emerald-900/30">
                 <Loader2 className="animate-spin text-emerald-400" size={20} />
                 <span className="text-emerald-400/80 text-sm font-mono">
                    Analyzing Market Data & Chart Patterns...
                 </span>
               </div>
            </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#0B1215]/95 backdrop-blur-lg border-t border-slate-800 z-20">
        {previewUrl && (
          <div className="mb-3 relative inline-block group animate-in slide-in-from-bottom-2">
            <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-xl"></div>
            <img src={previewUrl} alt="Preview" className="relative h-24 w-auto object-contain rounded-lg border border-emerald-500/50 bg-black" />
            <button onClick={clearFile} className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1 text-white hover:bg-red-600 shadow-md transition-colors z-10">
              <X size={14} />
            </button>
          </div>
        )}
        
        <div className="flex gap-2 items-end">
            <div className="relative flex-1 group">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                      if(e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                      }
                  }}
                  placeholder="Upload a chart or ask about market trends..."
                  className="w-full bg-slate-900/80 text-white rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 border border-slate-700 transition-all group-hover:border-slate-600 resize-none min-h-[50px] max-h-[120px]"
                  rows={1}
                />
                <label className="absolute right-3 bottom-3 cursor-pointer p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-500/10 transition-all" title="Upload Chart">
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  <Upload size={20} />
                </label>
            </div>
            
            <button 
              onClick={handleSend}
              disabled={isLoading || (!input && !selectedFile)}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl w-[50px] h-[50px] flex items-center justify-center transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="text-center mt-2">
             <p className="text-[10px] text-slate-500">
                AI Market Analysis is for educational purposes only. Not financial advice.
             </p>
          </div>
      </div>
    </div>
  );
};

export default TradingInterface;