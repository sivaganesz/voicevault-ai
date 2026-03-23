import { useState, useCallback, useEffect, useRef } from 'react';
import MicButton from './MicButton';
import LiveCaptions from './LiveCaptions';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAudioCapture } from '../hooks/useAudioCapture';
import { useAudioPlayback } from '../hooks/useAudioPlayback';

const WS_URL = `ws://${window.location.hostname}:3001`;

export default function VoiceAgent() {
    const [isActive, setIsActive] = useState(false);
    const [captions, setCaptions] = useState([]);
    const captionIdRef = useRef(0);

    const { status, connect, disconnect, send, onMessage } = useWebSocket(WS_URL);
    const { enqueueAudio, stopPlayback } = useAudioPlayback();

    // Handle sending audio chunks to backend
    const handleAudioChunk = useCallback((base64Audio:any) => {
        try {
            send({ type: 'audio', data: base64Audio });
        } catch (e) {
            console.error('Failed to send audio chunk to WS', e);
        }
    }, [send]);

    const { isCapturing, startCapture, stopCapture } = useAudioCapture(handleAudioChunk);

    // Register message handlers
    useEffect(() => {
        onMessage('transcript', (data) => {
            setCaptions((prev): any => {
                if (prev.length === 0) {
                    return [{ id: captionIdRef.current++, role: data.role, text: data.text, timestamp: Date.now() }];
                }
                const last:any = prev[prev.length - 1];
                if (last.role === data.role) {
                    // Append text to the current active bubble
                    return [
                        ...prev.slice(0, -1),
                        { ...last, text: last.text + data.text, timestamp: Date.now() }
                    ];
                } else {
                    // Create new bubble for new speaker
                    return [...prev, { id: captionIdRef.current++, role: data.role, text: data.text, timestamp: Date.now() }];
                }
            });
        });

        onMessage('audio', (data) => {
            if (data.data) {
                enqueueAudio(data.data);
            }
        });
    }, [onMessage, enqueueAudio]);

    // Handle mic button click
    const handleToggle = useCallback(async () => {
        if (isActive) {
            // Stop
            stopCapture();
            send({ type: 'end_turn' });
            disconnect();
            stopPlayback();
            setIsActive(false);
        } else {
            // Start
            try {
                connect();
                await startCapture();
                setIsActive(true);
                setCaptions([]);
            } catch (error) {
                console.error('Failed to start:', error);
                disconnect();
            }
        }
    }, [isActive, connect, disconnect, startCapture, stopCapture, stopPlayback]);

    const isConnecting = status === 'connecting';

    return (
        // <div className="relative w-full h-screen flex flex-col">
        <div className="relative w-full h-full item flex flex-col">

            {/* Background animated orbs */}
            {/* <div className="fixed inset-0 overflow-hidden pointer-events-none"> */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">

                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-indigo-600/10 rounded-full blur-3xl animate-float" />
                <div
                    className="absolute bottom-1/3 -right-20 w-96 h-96 bg-purple-600/8 rounded-full blur-3xl animate-float"
                    style={{ animationDelay: '1.5s' }}
                />
                <div
                    className="absolute top-1/2 left-1/3 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl animate-float"
                    style={{ animationDelay: '3s' }}
                />
            </div>


            <header className="relative z-10 flex items-center justify-between px-8 py-6">
                {/* <div className="w-full max-w-7xl flex items-center justify-between"> */}
                {/* Logo Section */}
                {/* <div className="flex items-center gap-3 group cursor-pointer">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <div className="flex flex-col">
                            <h1 className="text-sm font-bold text-white tracking-widest uppercase">
                                Voice <span className="text-indigo-400">AI</span>
                            </h1>
                            <span className="text-[10px] text-slate-500 font-medium tracking-tight">v1.0.0</span>
                        </div>
                    </div> */}
                <div className=""></div>
                {/* Status Indicator Area */}
                <div className={`
                            flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-md transition-all duration-500
                            ${status === 'connected'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/5 border-white/5 text-slate-400'}
                        `}>
                    <div className={`w-1.5 h-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                    <span className="text-[11px] font-bold uppercase tracking-wider">
                        {status}
                    </span>
                </div>

                {/* </div> */}
            </header>


            {/* Main content area */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center">
                {/* Central visual */}
                <div className="flex flex-col items-center gap-10 -translate-y-20 md:-translate-y-60 transition-transform duration-500">
                    {/* Visualizer ring (shown when active) */}
                    {isActive && (
                        <div className="absolute w-48 h-48 mt-20 rounded-full border border-indigo-500/20">
                            <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-ripple" />
                        </div>
                    )}

                    {/* Status text */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-light text-slate-300 mb-2">
                            {isActive
                                ? 'I\'m listening...'
                                : 'Ready to chat'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {isActive
                                ? 'Speak naturally — I\'ll respond in real time'
                                : 'Click the microphone to start a voice conversation'}
                        </p>
                    </div>

                    {/* Mic button */}
                    <MicButton
                        isActive={isActive}
                        isConnecting={isConnecting}
                        onClick={handleToggle}
                        disabled={false}
                    />
                </div>
            </main>

            {/* Live captions */}
            <LiveCaptions captions={captions} />
        </div>
    );
}
