import { useState, useCallback, useEffect, useRef } from 'react';
import MicButton from './MicButton';
import LiveCaptions from './LiveCaptions';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useAudioPlayback } from '../hooks/useAudioPlayback';
import { Layers, Database, Shield, FileText, Briefcase, HelpCircle, Filter, Check, ChevronDown } from 'lucide-react';

const WS_URL = `ws://${window.location.hostname}:3001`;

const CATEGORIES = [
    { id: 'All', label: 'All Knowledge', icon: <Database size={16} /> },
    { id: 'general', label: 'General Info', icon: <Layers size={16} /> },
    { id: 'Technical Support', label: 'Tech Support', icon: <HelpCircle size={16} /> },
    { id: 'Product Manual', label: 'Manuals', icon: <FileText size={16} /> },
    { id: 'HR Policy', label: 'HR & Policies', icon: <Shield size={16} /> },
    { id: 'Sales Pitch', label: 'Sales & Marketing', icon: <Briefcase size={16} /> },
];

export default function VoiceAgent() {
    const [isActive, setIsActive] = useState(false);
    const [captions, setCaptions] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isQdrantConnected, setIsQdrantConnected] = useState(true);
    const captionIdRef = useRef(0);
    const filterRef = useRef<HTMLDivElement>(null);
    const qdrantStatusRef = useRef(true);

    const { status, connect, disconnect, send, onMessage } = useWebSocket(WS_URL);
    const { enqueueAudio, stopPlayback } = useAudioPlayback();

    // ── Qdrant health poll (15s — reduced from 5s) ────────────────────────────
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch(`http://${window.location.hostname}:3001/health`);
                const data = await res.json();
                const connected = data.qdrantConnected;
                if (connected !== qdrantStatusRef.current) {
                    qdrantStatusRef.current = connected;
                    setIsQdrantConnected(connected);
                    console.log(`🗄️ Qdrant status changed: ${connected ? 'connected' : 'disconnected'}`);
                }
            } catch (e) {
                if (qdrantStatusRef.current !== false) {
                    qdrantStatusRef.current = false;
                    setIsQdrantConnected(false);
                }
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (status === 'connected') {
            console.log(`📤 Sending category_select: ${selectedCategory}`);
            send({ type: 'category_select', category: selectedCategory });
        }
    }, [status, selectedCategory, send]);

    const handleAudioChunk = useCallback((base64Audio: any) => {
        try {
            send({ type: 'audio', data: base64Audio });
        } catch (e) {
            console.error('Failed to send audio chunk to WS', e);
        }
    }, [send]);

    const { isCapturing, startCapture, stopCapture } = useAudioCapture(handleAudioChunk);

    useEffect(() => {
        onMessage('transcript', (data) => {
            setCaptions((prev): any => {
                if (prev.length === 0) {
                    return [{ id: captionIdRef.current++, role: data.role, text: data.text, timestamp: Date.now() }];
                }
                const last: any = prev[prev.length - 1];
                if (last.role === data.role) {
                    return [...prev.slice(0, -1), { ...last, text: last.text + data.text, timestamp: Date.now() }];
                } else {
                    return [...prev, { id: captionIdRef.current++, role: data.role, text: data.text, timestamp: Date.now() }];
                }
            });
        });

        onMessage('audio', (data) => {
            if (data.data) enqueueAudio(data.data);
        });
    }, [onMessage, enqueueAudio]);

    // ── Push-to-talk handlers ─────────────────────────────────────────────────
    // onPressStart: connect WS + start mic the moment the button is pressed
    // onPressEnd:   stop mic + fire audioStreamEnd immediately on release
    //               → Gemini processes without waiting for VAD silence timeout
    const handlePressStart = useCallback(async () => {
        if (isActive) return;
        try {
            console.log('🎙️ Press start — connecting & capturing');
            connect();
            await startCapture();
            setIsActive(true);
            setCaptions([]);
        } catch (error) {
            console.error('Failed to start capture:', error);
            disconnect();
        }
    }, [isActive, connect, startCapture, disconnect]);

    const handlePressEnd = useCallback(() => {
        if (!isActive) return;
        console.log('🎙️ Press end — stopping & sending audioStreamEnd');
        stopCapture();
        send({ type: 'end_turn' });   // → server sends audioStreamEnd to Gemini
        stopPlayback();
        setIsActive(false);
    }, [isActive, stopCapture, send, stopPlayback]);

    const isConnecting = status === 'connecting';

    return (
        <div className="relative w-full h-full flex overflow-hidden bg-slate-950">
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 -left-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-float" />
                    <div className="absolute bottom-1/3 -right-20 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
                </div>

                <header className="relative z-50 flex items-center justify-between px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="relative" ref={filterRef}>
                            <button
                                onClick={() => setIsFilterOpen(!isFilterOpen)}
                                className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl border backdrop-blur-xl transition-all duration-300
                                    ${isFilterOpen
                                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_10px_25px_-5px_rgba(79,70,229,0.4)]'
                                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                            >
                                <Filter size={16} />
                                <span className="text-[13px] font-bold tracking-tight">
                                    {CATEGORIES.find(c => c.id === selectedCategory)?.label}
                                </span>
                                <ChevronDown size={14} className={`transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isFilterOpen && (
                                <div className="absolute top-full left-0 mt-3 w-64 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-3xl p-2 shadow-2xl animate-in fade-in zoom-in duration-200 origin-top-left">
                                    <div className="px-4 py-3 mb-1">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Knowledge Context</p>
                                    </div>
                                    {CATEGORIES.map((cat) => {
                                        const isDisabled = !isQdrantConnected && cat.id !== 'All';
                                        return (
                                            <button
                                                key={cat.id}
                                                disabled={isDisabled}
                                                title={isDisabled ? 'Qdrant is not connected' : ''}
                                                onClick={() => {
                                                    if (!isDisabled) {
                                                        setSelectedCategory(cat.id);
                                                        setIsFilterOpen(false);
                                                    }
                                                }}
                                                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-200 group
                                                    ${selectedCategory === cat.id
                                                        ? 'bg-indigo-500/10 text-indigo-400'
                                                        : isDisabled
                                                            ? 'opacity-30 cursor-not-allowed grayscale'
                                                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className={`${selectedCategory === cat.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                                                        {cat.icon}
                                                    </span>
                                                    <span className="text-[13px] font-bold">{cat.label}</span>
                                                </div>
                                                {selectedCategory === cat.id && <Check size={14} className="text-indigo-400" />}
                                                {isDisabled && <Shield size={12} className="text-slate-600" />}
                                            </button>
                                        );
                                    })}
                                    <div className="mt-2 pt-2 border-t border-white/5 px-2">
                                        <div className="flex items-center gap-2 px-3 py-2">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isQdrantConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                                            <span className={`text-[9px] font-bold uppercase tracking-widest ${isQdrantConnected ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                                                {isQdrantConnected ? 'Qdrant Active' : 'Qdrant Offline'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-500 ${
                            isQdrantConnected
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400 animate-pulse'
                        }`}>
                            {isQdrantConnected ? <Database size={14} /> : <Shield size={14} />}
                            <span className="text-xs font-bold tracking-tight">
                                {isQdrantConnected ? 'Qdrant is connected' : 'Qdrant not connected'}
                            </span>
                        </div>
                    </div>

                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-500
                        ${status === 'connected'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/5 border-white/5 text-slate-400'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                        <span className="text-[11px] font-bold uppercase tracking-wider">{status}</span>
                    </div>
                </header>

                <main className="relative z-10 flex-1 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center gap-10 -translate-y-20 md:-translate-y-40 transition-transform duration-500">
                        {isActive && (
                            <div className="absolute w-48 h-48 mt-20 rounded-full border border-indigo-500/20">
                                <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ripple" />
                            </div>
                        )}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-light text-slate-300 mb-2">
                                {isActive ? "I'm listening..." : 'Ready to chat'}
                            </h2>
                            <p className="text-sm text-slate-500">
                                {isActive
                                    ? `Context: ${CATEGORIES.find(c => c.id === selectedCategory)?.label}`
                                    : 'Hold the microphone to speak'}
                            </p>
                        </div>

                        <MicButton
                            isActive={isActive}
                            isConnecting={isConnecting}
                            onPressStart={handlePressStart}
                            onPressEnd={handlePressEnd}
                            disabled={false}
                        />
                    </div>
                </main>

                <LiveCaptions captions={captions} />
            </div>
        </div>
    );
}