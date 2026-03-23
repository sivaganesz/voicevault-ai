import React, { useRef, useEffect } from 'react';

export default function LiveCaptions({ captions }) {
  const containerRef = useRef(null);

  // Auto-scroll to latest caption
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [captions]);

  if (!captions || captions.length === 0) {
    return null;
  }

  return (
    <div
      id="live-captions"
      className="fixed bottom-20 left-0 right-0 pointer-events-none z-50 px-6 sm:px-12 flex flex-col items-center"
    >
      <div
        ref={containerRef}
        className="w-full max-w-4xl flex flex-col gap-8 overflow-y-auto pointer-events-auto max-h-[45vh] pb-24 pt-12"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)'
        }}
      >
        {captions.map((caption, index) => {
          const isUser = caption.role === 'user';
          
          return (
            <div
              key={caption.id || index}
              className={`
                flex flex-col transition-all duration-300 ease-out
                ${isUser ? 'items-start' : 'items-end'}
                animate-caption-in
              `}
            >
              {/* Refined Label */}
              <div className={`
                flex items-center gap-2 mb-2 px-1
                ${isUser ? 'flex-row' : 'flex-row-reverse'}
              `}>
                <span className={`
                  text-[11px] font-black uppercase tracking-[0.25em]
                  ${isUser ? 'text-indigo-400' : 'text-emerald-400'}
                `}>
                  {isUser ? 'YOU' : 'GEMINI'}
                </span>
                <div className={`w-1 h-1 rounded-full ${isUser ? 'bg-indigo-400/50' : 'bg-emerald-400/50'}`} />
              </div>

              {/* Message Bubble */}
              <div className={`
                max-w-[90%] sm:max-w-[70%] px-8 py-5 rounded-[1.75rem] shadow-2xl backdrop-blur-md
                ${isUser 
                  ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-50 rounded-tl-none' 
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-50 rounded-tr-none'}
              `}>
                <p className="text-[20px] font-medium leading-[2.0] tracking-wide">
                  {caption.text}
                </p>
                {caption.isPartial && (
                  <span className="inline-flex gap-1.5 ml-3 align-middle">
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: '0.2s' }} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
