import React from 'react';

export default function StatusIndicator({ status }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-emerald-500',
          textColor: 'text-emerald-400',
          label: 'Connected',
          glow: 'shadow-emerald-500/50',
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          textColor: 'text-yellow-400',
          label: 'Connecting',
          glow: 'shadow-yellow-500/50',
          animate: true,
        };
      case 'error':
        return {
          color: 'bg-red-500',
          textColor: 'text-red-400',
          label: 'Error',
          glow: 'shadow-red-500/50',
        };
      case 'processing':
        return {
          color: 'bg-blue-500',
          textColor: 'text-blue-400',
          label: 'Processing',
          glow: 'shadow-blue-500/50',
          animate: true,
        };
      default:
        return {
          color: 'bg-slate-500',
          textColor: 'text-slate-400',
          label: 'Disconnected',
          glow: '',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div
      id="status-indicator"
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 select-none"
    >
      <div className="relative flex items-center justify-center w-2 h-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${config.color} ${
            config.animate ? 'animate-status-dot' : ''
          } z-10 shadow-[0_0_8px_rgba(255,255,255,0.2)]`}
        />
        {config.glow && (
          <div
            className={`absolute inset-0 rounded-full ${config.color} opacity-40 blur-[2px]`}
          />
        )}
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-[0.12em] leading-none ${config.textColor}`}>
        {config.label}
      </span>
    </div>
  );
}
