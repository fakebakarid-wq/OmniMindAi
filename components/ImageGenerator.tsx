import React, { useState } from 'react';
import { Sparkles, Download, Image as ImageIcon, Loader2, Ratio } from 'lucide-react';
import { generateImageFromText } from '../services/geminiService';

const ImageGenerator: React.FC = () => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await generateImageFromText(prompt, aspectRatio);
      setGeneratedImage(result);
    } catch (err: any) {
      setError(err.message || "Failed to generate image. Please try a different prompt.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Sparkles className="text-indigo-400" /> Text to Image
          </h2>
          <p className="text-slate-400">Describe what you want to see, and OmniMind will create it for you.</p>
        </div>

        {/* Generated Image Display */}
        <div className="flex flex-col items-center gap-4">
            <div className={`relative bg-slate-800 rounded-2xl border-2 border-slate-700 shadow-2xl overflow-hidden transition-all duration-500 ${generatedImage ? 'w-full max-w-lg' : 'w-64 h-64 flex items-center justify-center'}`}>
               {isProcessing ? (
                 <div className="flex flex-col items-center text-indigo-400 p-8">
                   <Loader2 className="animate-spin mb-4" size={40} />
                   <span className="animate-pulse font-medium">Creating your masterpiece...</span>
                 </div>
               ) : generatedImage ? (
                 <img src={generatedImage} alt="Generated" className="w-full h-auto object-contain" />
               ) : (
                 <div className="flex flex-col items-center text-slate-600 p-8">
                    <ImageIcon size={48} className="mb-2 opacity-50" />
                    <span>Your image will appear here</span>
                 </div>
               )}
            </div>

            {/* Download Button - Explicitly placed below image */}
            {generatedImage && (
                <a 
                href={generatedImage} 
                download={`omnimind-gen-${Date.now()}.png`}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/30 transition-all active:scale-95"
                >
                <Download size={20} />
                Download Image
                </a>
            )}
        </div>

        {/* Controls */}
        <div className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg space-y-4">
            
            <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Prompt</label>
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A futuristic city made of crystal at sunset, cyberpunk style..."
                    className="w-full bg-slate-900 text-white border border-slate-600 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px] resize-none"
                />
            </div>

            <div className="flex items-end gap-4 flex-wrap">
                <div className="flex-1 min-w-[150px]">
                     <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Ratio size={14}/> Aspect Ratio
                     </label>
                     <div className="grid grid-cols-3 gap-2">
                        {['1:1', '16:9', '9:16'].map((ratio) => (
                            <button
                                key={ratio}
                                onClick={() => setAspectRatio(ratio)}
                                className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                                    aspectRatio === ratio
                                    ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                                }`}
                            >
                                {ratio}
                            </button>
                        ))}
                     </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={!prompt || isProcessing}
                    className="flex-1 min-w-[150px] bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white h-[42px] rounded-xl font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/30 active:scale-95"
                >
                    <Sparkles size={18} /> Generate
                </button>
            </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-800 text-red-300 rounded-xl text-sm text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;