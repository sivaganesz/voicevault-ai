import { useState } from 'react';
import VoiceAgent from './components/VoiceAgent';
import Documents from './components/Documents';
import Settings from './components/Settings';
import logo from './assets/logo.png'

function App() {
  const [activeTab, setActiveTab] = useState('voice');

  const navItems = [
    { id: 'voice', label: 'Voice Agent', icon: <MicIcon /> },
    { id: 'docs', label: 'Knowledge Base', icon: <DocIcon /> },
    { id: 'settings', label: 'Configurations', icon: <SettingsIcon /> },
  ];

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-200 font-sans overflow-hidden">
      <aside className="w-72 bg-white/[0.03] backdrop-blur-xl border-r border-white/10 flex flex-col z-30 shadow-2xl">
        <div className="p-8 mb-4">
          <div className="flex items-center gap-3">
            {/* <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-lg shadow-blue-500/30 ring-2 ring-white/20">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </div> */}
            <img src={logo} alt="VoiceVault Logo" className="w-12 h-12 rounded-2xl" />
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">VoiceVault</h1>
              <p className="text-[10px] text-blue-400 font-bold tracking-wider uppercase mt-0.5">AI AGENT</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-6 py-4 space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 px-3">Main</p>
          {navItems.map((item) => (
            <NavItem
              key={item.id}
              label={item.label}
              icon={item.icon}
              active={activeTab === item.id}
              onClick={() => setActiveTab(item.id)}
            />
          ))}
        </nav>

        <div className="p-6 border-t border-white/10 mt-auto">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all duration-300 cursor-pointer group">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/20">
                SM
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Siva Muthu</p>
              <p className="text-[11px] text-slate-400">Developer Pro</p>
            </div>
            <svg className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </aside>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative h-full overflow-y-auto">
          {activeTab === 'voice' && <VoiceAgent />}
          {activeTab === 'docs' && <Documents />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  );
}

function NavItem({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative
        ${active
          ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-white shadow-lg shadow-blue-500/10'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
        }
      `}
    >
      {active && (
        <div className="absolute left-0 w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-r-full" />
      )}
      <span className={`transition-all duration-300 ${active ? 'text-blue-400 scale-110' : 'text-slate-500 group-hover:text-blue-400'}`}>
        {icon}
      </span>
      <span className="text-sm font-medium tracking-wide">{label}</span>
    </button>
  );
}

const MicIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
);

const DocIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16V8l-4-4H4z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8M8 16h6" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.8">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export default App;
