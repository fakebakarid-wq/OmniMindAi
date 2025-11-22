import React, { useState } from 'react';
import { Upload, Wand2, Download, Image as ImageIcon, Loader2 } from 'lucide-react';
import { editImageWithGemini } from '../services/geminiService';

const ImageEditor: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOriginalImage(file);
      setPreviewOriginal(URL.createObjectURL(file));
      setGeneratedImage(null);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!originalImage || !prompt) return;
    setIsProcessing(true);
    setError(null);
    try {
      const result = await editImageWithGemini(originalImage, prompt);
      setGeneratedImage(result);
    } catch (err: any) {
      setError(err.message || "Failed to edit image");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-full p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-2">AI Image Editor</h2>
          <p className="text-slate-400">Upload an image and describe how you want to change it (e.g., "Add a retro filter", "Make it snowy").</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Source Image */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
              <ImageIcon size={20} /> Original
            </h3>
            <div className={`aspect-square rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center relative overflow-hidden ${!previewOriginal ? 'cursor-pointer hover:border-slate-500' : ''}`}>
              {previewOriginal ? (
                <img src={previewOriginal} alt="Original" className="w-full h-full object-contain" />
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer text-slate-400 hover:text-indigo-400">
                  <Upload size={40} className="mb-4" />
                  <span>Click to upload image</span>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* Edited Image */}
          <div className="space-y-4">
             <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
              <Wand2 size={20} /> Result
            </h3>
            <div className="aspect-square rounded-2xl border-2 border-slate-700 bg-slate-900 flex items-center justify-center relative overflow-hidden">
               {isProcessing ? (
                 <div className="flex flex-col items-center text-indigo-400">
                   <Loader2 className="animate-spin mb-2" size={40} />
                   <span>Magic in progress...</span>
                 </div>
               ) : generatedImage ? (
                 <img src={generatedImage} alt="Edited" className="w-full h-full object-contain" />
               ) : (
                 <span className="text-slate-500">Edited image will appear here</span>
               )}
            </div>
             {generatedImage && (
              <a 
                href={generatedImage} 
                download="edited-image.png"
                className="inline-flex items-center gap-2 w-full justify-center bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg transition-colors"
              >
                <Download size={18} /> Download
              </a>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="bg-slate-800 p-4 rounded-xl flex gap-4 items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your edit (e.g., 'Turn the sky purple')"
            className="flex-1 bg-slate-900 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleGenerate}
            disabled={!originalImage || !prompt || isProcessing}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
          >
            <Wand2 size={18} /> Edit
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-900/50 border border-red-700 text-red-200 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageEditor;