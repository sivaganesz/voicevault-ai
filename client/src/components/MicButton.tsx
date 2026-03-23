
type ButtonState = 'idle' | 'connecting' | 'active';

// Props interface
interface MicButtonProps {
  isActive: boolean;
  isConnecting: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export default function MicButton({
  isActive,
  isConnecting,
  onClick,
  disabled = false,
}: MicButtonProps): JSX.Element {

  const getButtonState = (): ButtonState => {
    if (isConnecting) return 'connecting';
    if (isActive) return 'active';
    return 'idle';
  };

  const state = getButtonState();

  return (
    <div className="relative flex items-center justify-center">
      {/* Ripple rings when active */}
      {state === 'active' && (
        <>
          <div className="absolute w-32 h-32 rounded-full border-2 border-red-500/30 animate-ripple" />
          <div
            className="absolute w-32 h-32 rounded-full border-2 border-red-500/20 animate-ripple"
            style={{ animationDelay: '0.5s' }}
          />
          <div
            className="absolute w-32 h-32 rounded-full border-2 border-red-500/10 animate-ripple"
            style={{ animationDelay: '1s' }}
          />
        </>
      )}

      {/* Outer glow ring */}
      <div
        className={`absolute w-28 h-28 rounded-full transition-all duration-500 ${state === 'active'
            ? 'bg-red-500/10'
            : state === 'connecting'
              ? 'bg-yellow-500/10'
              : 'bg-indigo-500/10'
          }`}
      />

      {/* Main button */}
      <button
        id="mic-button"
        onClick={onClick}
        disabled={disabled}
        className={`
          relative z-10 w-20 h-20 rounded-full
          flex items-center justify-center
          transition-all duration-300 ease-out
          cursor-pointer
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}
          ${state === 'active'
            ? 'bg-gradient-to-br from-red-500 to-rose-600 animate-mic-active'
            : state === 'connecting'
              ? 'bg-gradient-to-br from-yellow-500 to-amber-600'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600 animate-mic-pulse'
          }
        `}
        aria-label={isActive ? 'Stop voice conversation' : 'Start voice conversation'}
      >
        {state === 'connecting' ? (
          // Spinner
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth={4}
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) :  state === 'active' ? (
          <div className="flex items-end gap-[3px] h-8">
            {[0, 1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className="w-[3px] bg-white rounded-full"
                style={{
                  // animationDelay: `${i * 0.15}s`,
                  animation: `equalizer 1s ease-in-out infinite`,
                  animationDelay: `${i * 0.90}s`,
                  height: '12px',
                }}
              />
            ))}
          </div>
        ) : (
          // Mic icon
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        )}
      </button>

      {/* Label */}
      <span
        className={`
          absolute -bottom-10 whitespace-nowrap text-[13px] font-semibold tracking-wide
          transition-colors duration-300
          ${state === 'active'
            ? 'text-red-400'
            : state === 'connecting'
              ? 'text-yellow-400'
              : 'text-slate-400'
          }
        `}
      >
        {state === 'active'
          ? 'LISTENING'
          : state === 'connecting'
            ? 'CONNECTING'
            : 'TAP TO SPEAK'}
      </span>
    </div>
  );
}