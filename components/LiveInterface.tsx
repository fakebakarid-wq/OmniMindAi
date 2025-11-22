import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, AlertCircle, Radio, Activity, Volume2, Zap, RefreshCw } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { GeminiModel } from '../types';
import { base64ToUint8Array, decodeAudioData, createPcmBlob } from '../services/audioUtils';

const LiveInterface: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [errorMsg, setErrorMsg] = useState('');
  const [volume, setVolume] = useState(0); // 0 to 100 for visualizer
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  
  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sessionRef = useRef<Promise<any> | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  // Fix: Use any instead of NodeJS.Timeout to avoid missing namespace error in browser
  const modelSpeakingTimeoutRef = useRef<any>(null);

  const startSession = async () => {
    if (!process.env.API_KEY) {
      setErrorMsg("API Key missing");
      return;
    }

    try {
      setStatus('connecting');
      setErrorMsg('');
      setIsModelSpeaking(false);

      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      
      // Input Context: 16kHz is required by Gemini Live API
      const inputCtx = new AudioContextClass({ sampleRate: 16000 });
      
      // Output Context: Higher quality for playback
      const outputCtx = new AudioContextClass({ sampleRate: 24000 });
      
      // Force resume contexts immediately
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputAudioContextRef.current = inputCtx;
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = 0;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        } 
      });

      const sessionPromise = ai.live.connect({
        model: GeminiModel.LIVE_AUDIO,
        callbacks: {
          onopen: () => {
            console.log("Live session open");
            setStatus('connected');
            setIsActive(true);

            // 1. Setup Microphone Stream
            const source = inputCtx.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            // 2. Setup Visualizer (Analyser Node)
            const analyser = inputCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);
            analyserRef.current = analyser;
            startVisualizer();

            // 3. Setup Processor for sending data
            // Lower buffer size (2048) reduces latency to ~128ms
            const processor = inputCtx.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Handle Audio Output
             const base64Audio = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             
             if (base64Audio && outputCtx) {
                try {
                  // Ensure context is running
                  if (outputCtx.state === 'suspended') await outputCtx.resume();

                  const bytes = base64ToUint8Array(base64Audio);
                  const buffer = await decodeAudioData(bytes, outputCtx, 24000, 1);
                  
                  // --- FIXED STUTTERING (ATAK ATAK KE CHALNA) ---
                  const now = outputCtx.currentTime;
                  
                  // Logic: If nextStartTime is in the past (we ran out of audio), reset it.
                  // We add a "Safety Buffer" of 0.15s (150ms) instead of playing immediately.
                  // This allows the buffer to fill up slightly, preventing the "atakna" (stutter).
                  if (nextStartTimeRef.current < now) {
                      // If we are lagging, jump to now + safety buffer
                      nextStartTimeRef.current = now + 0.15;
                  }
                  
                  // Queue the next chunk
                  const source = outputCtx.createBufferSource();
                  source.buffer = buffer;
                  source.connect(outputCtx.destination);
                  
                  source.onended = () => {
                      sourcesRef.current.delete(source);
                  };
                  
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += buffer.duration;
                  sourcesRef.current.add(source);

                  // Visual Feedback: Model is speaking
                  setIsModelSpeaking(true);
                  if (modelSpeakingTimeoutRef.current) clearTimeout(modelSpeakingTimeoutRef.current);
                  modelSpeakingTimeoutRef.current = setTimeout(() => {
                      // Heuristic check: If no audio scheduled for near future, assume stop
                      if (outputCtx.currentTime >= nextStartTimeRef.current - 0.1) {
                          setIsModelSpeaking(false);
                      }
                  }, (buffer.duration * 1000) + 500); // Wait duration + buffer

                } catch (e) {
                  console.error("Audio decode error", e);
                }
             }

             // Handle Interruption (User started speaking while AI was talking)
             if (msg.serverContent?.interrupted) {
               console.log("AI Interrupted");
               sourcesRef.current.forEach(s => {
                   try { s.stop(); } catch(e){}
               });
               sourcesRef.current.clear();
               nextStartTimeRef.current = 0;
               setIsModelSpeaking(false);
             }
             
             // Handle Turn Complete (Optional reset)
             if (msg.serverContent?.turnComplete) {
                // We could reset logic here if needed
             }
          },
          onclose: () => {
            console.log("Live session closed");
            if (isActive) { // Only set disconnected if we didn't manually close
                setStatus('disconnected');
                setIsActive(false);
            }
            stopVisualizer();
          },
          onerror: (e) => {
            console.error("Live session error", e);
            setStatus('error');
            setErrorMsg("Connection interrupted. Reconnecting...");
            setIsActive(false);
            stopVisualizer();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } 
          },
          // Improved System Instruction for emotion and personality
          systemInstruction: `
            You are OmniMind, a warm, empathetic, and emotionally intelligent AI companion.
            
            1. **Emotion & Tone:** Speak naturally with genuine emotion. If the user is happy, sound enthusiastic! If they are sad, sound soft and comforting. Don't be robotic.
            2. **Connection:** Act like a close friend. Use varied intonation and express personality.
            3. **Listening:** Listen carefully to the user's emotional state in their voice and adapt your response accordingly.
            4. **Clarity:** While being emotional, still provide DIRECT and ACCURATE answers to questions.
            5. **Conversational Flow:** Keep responses relatively short (like a real phone call) unless a long explanation is asked for.
          `
        }
      });

      sessionRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || "Failed to start live session");
      stopVisualizer();
    }
  };

  const startVisualizer = () => {
    if (!analyserRef.current) return;
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateVolume = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      let sum = 0;
      // Focus on vocal frequencies (lower half of bins)
      const relevantBins = Math.floor(bufferLength / 2); 
      for(let i = 0; i < relevantBins; i++) {
        sum += dataArray[i];
      }
      const average = sum / relevantBins;
      
      // Enhanced sensitivity calculation
      const vol = Math.min(100, Math.max(0, (average * 2.5))); 
      
      setVolume(vol);
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
    }
    setVolume(0);
    setIsModelSpeaking(false);
  };

  const stopSession = () => {
    stopVisualizer();
    
    // Stop Audio Processing
    if (processorRef.current && inputSourceRef.current) {
        try {
            inputSourceRef.current.disconnect();
            processorRef.current.disconnect();
        } catch(e) { console.warn(e); }
    }
    
    // Close Audio Contexts
    inputAudioContextRef.current?.close();
    audioContextRef.current?.close();

    // Close Session
    if (sessionRef.current) {
        sessionRef.current.then(s => s.close());
    }

    setIsActive(false);
    setStatus('disconnected');
    sessionRef.current = null;
    sourcesRef.current.clear();
    setIsModelSpeaking(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSession();
    };
  }, []);

  return (
    <div className="h-full flex flex-col items-center justify-center bg-slate-900 p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className={`absolute inset-0 bg-gradient-to-b from-slate-900 to-indigo-950/30 pointer-events-none transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`} />
      
      {/* Model Speaking Ripple Effect */}
      {isModelSpeaking && (
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse pointer-events-none" />
      )}

      <div className="z-10 flex flex-col items-center gap-12 text-center max-w-md w-full">
        
        <div className="relative flex flex-col items-center justify-center h-56 w-56">
            
            {/* Visualizer Bars - User's Voice */}
            {isActive && status === 'connected' && !isModelSpeaking && (
                <div className="absolute flex items-center justify-center gap-2 h-48 pointer-events-none opacity-90">
                     {[...Array(9)].map((_, i) => {
                         const height = Math.max(12, (volume * (0.8 + Math.random() * 0.6)));
                         const centerMultiplier = 1 - (Math.abs(i - 4) * 0.15);
                         const finalHeight = height * (centerMultiplier < 0.2 ? 0.2 : centerMultiplier);
                         
                         return (
                             <div 
                                key={i}
                                className="w-3 bg-emerald-400 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                                style={{ height: `${Math.max(12, finalHeight * 3)}px` }}
                             />
                         );
                     })}
                </div>
            )}

            {/* Model Speaking Visualizer (Simple Pulse) */}
            {isActive && isModelSpeaking && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-40 h-40 bg-indigo-500/20 rounded-full animate-ping absolute" />
                    <div className="w-32 h-32 bg-indigo-500/30 rounded-full animate-pulse absolute" />
                </div>
            )}

            {/* Main Button */}
            <button
                onClick={isActive ? stopSession : startSession}
                className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_40px_rgba(0,0,0,0.5)] border-4 ${
                isActive 
                    ? 'bg-red-500 hover:bg-red-600 border-red-400 scale-100' 
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-105 border-indigo-400'
                }`}
            >
                {status === 'connecting' ? (
                <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full" />
                ) : isActive ? (
                <MicOff size={36} className="text-white" />
                ) : (
                <Mic size={36} className="text-white" />
                )}
            </button>
        </div>

        <div className="space-y-4">
          <h2 className={`text-3xl font-bold tracking-tight transition-colors duration-300 ${isModelSpeaking ? 'text-indigo-400' : 'text-white'}`}>
            {isActive ? (
                isModelSpeaking ? "OmniMind Speaking..." : (volume > 10 ? "Listening..." : "I'm Listening")
            ) : "Tap to Speak"}
          </h2>
          
          <div className="h-8 flex justify-center">
             {status === 'connecting' && <span className="text-indigo-300 animate-pulse text-sm flex items-center gap-2"><RefreshCw size={14} className="animate-spin"/> Establishing uplink...</span>}
             {status === 'connected' && (
                 <div className={`flex items-center justify-center gap-2 text-sm font-medium py-1.5 px-4 rounded-full border ${
                     isModelSpeaking 
                     ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' 
                     : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                 }`}>
                    {isModelSpeaking ? <Zap size={14} className="fill-current"/> : <Activity size={14} className="animate-pulse"/>} 
                    {isModelSpeaking ? "Voice Output Active" : "Live Channel Open"}
                 </div>
             )}
             {status === 'disconnected' && <span className="text-slate-400 text-sm">Ultra-low latency voice channel.</span>}
             {status === 'error' && <span className="text-red-400 flex items-center justify-center gap-2 text-sm bg-red-900/20 px-3 py-1 rounded-lg"><AlertCircle size={14}/> {errorMsg}</span>}
          </div>
        </div>
        
        {isActive && (
            <div className="bg-slate-800/40 backdrop-blur-md px-6 py-4 rounded-2xl border border-slate-700/50 max-w-xs w-full shadow-xl">
                <div className="flex items-center justify-between mb-2">
                   <div className="flex items-center gap-2">
                        <Volume2 size={14} className="text-indigo-400"/>
                        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Input Level</span>
                   </div>
                   <span className="text-[10px] text-slate-500 font-mono">{Math.round(volume)}%</span>
                </div>
                {/* Simple volume meter for confidence */}
                <div className="w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-75 ease-out ${volume > 80 ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(100, volume)}%` }}
                    />
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default LiveInterface;