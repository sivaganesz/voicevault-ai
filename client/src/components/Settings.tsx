import { useState, useEffect } from 'react';
import type { ReactNode, ChangeEvent } from 'react';

type TabId = 'qdrant' | 'cloudinary' | 'firecrawl' | 'gemini';

interface Tab {
  id: TabId;
  label: string;
  description: string;
  color: 'blue' | 'cyan' | 'orange' | 'teal';
}

interface SettingFormProps {
  title: string;
  description: string;
  color: 'blue' | 'cyan' | 'orange' | 'teal';
  children: ReactNode;
  onSave?: () => void;
  saved?: boolean;
  disabled?: boolean;
}

interface InputFieldProps {
  label: string;
  type: string;
  value: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  step?: string;
  className?: string;
  disabled?: boolean;
}

const API_BASE = 'http://localhost:3001';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('qdrant');
  const [savedConfig, setSavedConfig] = useState<TabId | null>(null);
  
  // Global settings state fetched from MongoDB
  const [settings, setSettings] = useState({
    qdrant: { endpoint: '', apiKey: '', collection: 'documents', vectorSize: 768 },
    cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
    firecrawl: { apiKey: '', maxDepth: 3, maxPages: 100 },
    gemini: { apiKey: '', model: 'gemini-2.5-flash-native-audio-latest', temperature: 0.1 }
  });

  useEffect(() => {
    fetch(`${API_BASE}/api/settings`)
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          // Merge with defaults to ensure all fields exist
          setSettings(prev => ({
            qdrant: { ...prev.qdrant, ...data.qdrant },
            cloudinary: { ...prev.cloudinary, ...data.cloudinary },
            firecrawl: { ...prev.firecrawl, ...data.firecrawl },
            gemini: { ...prev.gemini, ...data.gemini }
          }));
        }
      })
      .catch(err => console.error('Failed to fetch settings:', err));
  }, []);

  const tabs: Tab[] = [
    {
      id: 'qdrant',
      label: 'Qdrant DB',
      description: 'Vector database for semantic search',
      color: 'blue'
    },
    {
      id: 'cloudinary',
      label: 'Cloudinary',
      description: 'Media storage and optimization',
      color: 'cyan'
    },
    {
      id: 'firecrawl',
      label: 'FireCrawl',
      description: 'Web scraping and data extraction',
      color: 'orange'
    },
    {
      id: 'gemini',
      label: 'Gemini AI',
      description: 'AI model configuration',
      color: 'teal'
    },
  ];

  const handleSave = async (tabId: TabId, sectionData: any) => {
    const updatedSettings = { ...settings, [tabId]: sectionData };
    setSettings(updatedSettings);

    try {
      await fetch(`${API_BASE}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings)
      });
      setSavedConfig(tabId);
      setTimeout(() => setSavedConfig(null), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const getColorClasses = (color: Tab['color']) => {
    const colors = {
      blue: { gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-500', text: 'text-blue-400' },
      cyan: { gradient: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-500', text: 'text-cyan-400' },
      orange: { gradient: 'from-orange-500 to-orange-600', bg: 'bg-orange-500', text: 'text-orange-400' },
      teal: { gradient: 'from-teal-500 to-teal-600', bg: 'bg-teal-500', text: 'text-teal-400' }
    };
    return colors[color] || colors.blue;
  };

  const activeTabData = tabs.find(tab => tab.id === activeTab);
  const colorClasses = getColorClasses(activeTabData?.color || 'blue');

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto h-full overflow-y-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            System Configuration
          </h2>
        </div>
        <p className="text-slate-400 text-sm max-w-2xl">
          Manage integrations and security keys for your AI infrastructure.
          All credentials are encrypted and stored securely in the database.
        </p>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap gap-2 border-b border-white/10">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const tabColor = getColorClasses(tab.color);

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group relative px-6 py-4 transition-all duration-300
                  \${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold \${isActive ? 'text-white' : ''}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className={`w-1.5 h-1.5 rounded-full \${tabColor.bg} animate-pulse`} />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 text-left hidden sm:block">
                  {tab.description}
                </p>

                {isActive && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r \${tabColor.gradient} rounded-full`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
        {activeTab === 'qdrant' && (
          <QdrantSettings 
            data={settings.qdrant} 
            onSave={(data) => handleSave('qdrant', data)} 
            saved={savedConfig === 'qdrant'} 
          />
        )}
        {activeTab === 'cloudinary' && (
          <CloudinarySettings 
            data={settings.cloudinary} 
            onSave={(data) => handleSave('cloudinary', data)} 
            saved={savedConfig === 'cloudinary'} 
          />
        )}
        {activeTab === 'firecrawl' && (
          <FirecrawlSettings />
        )}
        {activeTab === 'gemini' && (
          <GeminiSettings 
            data={settings.gemini} 
            onSave={(data) => handleSave('gemini', data)} 
            saved={savedConfig === 'gemini'} 
          />
        )}
      </div>
    </div>
  );
}

/* ---------------- Sub Components ---------------- */

function QdrantSettings({ data, onSave, saved }: { data: any, onSave: (d: any) => void; saved: boolean }) {
  const [formData, setFormData] = useState(data);
  useEffect(() => { setFormData(data); }, [data]);

  return (
    <SettingForm title="Qdrant Vector Database" description="Configure your Qdrant instance for semantic search and vector storage" color="blue" onSave={() => onSave(formData)} saved={saved}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField label="Endpoint URL" type="text" placeholder="https://qdrant.example.com" value={formData.endpoint} onChange={(e) => setFormData((prev: any) => ({ ...prev, endpoint: e.target.value }))} />
        <InputField label="API Key" type="password" placeholder="qdrant-api-key" value={formData.apiKey} onChange={(e) => setFormData((prev: any) => ({ ...prev, apiKey: e.target.value }))} />
        <InputField label="Collection Name" type="text" placeholder="documents" value={formData.collection} onChange={(e) => setFormData((prev: any) => ({ ...prev, collection: e.target.value }))} />
        <InputField label="Vector Size" type="number" placeholder="768" value={formData.vectorSize} onChange={(e) => setFormData((prev: any) => ({ ...prev, vectorSize: Number(e.target.value) }))} />
      </div>
    </SettingForm>
  );
}

function CloudinarySettings({ data, onSave, saved }: { data: any, onSave: (d: any) => void; saved: boolean }) {
  const [formData, setFormData] = useState(data);
  useEffect(() => { setFormData(data); }, [data]);

  return (
    <SettingForm title="Cloudinary Media Storage" description="Configure Cloudinary for image and media optimization" color="cyan" onSave={() => onSave(formData)} saved={saved}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField label="Cloud Name" type="text" placeholder="cloudinary-cloud-name" value={formData.cloudName} onChange={(e) => setFormData((prev: any) => ({ ...prev, cloudName: e.target.value }))} />
        <InputField label="API Key" type="password" placeholder="cloudinary-api-key" value={formData.apiKey} onChange={(e) => setFormData((prev: any) => ({ ...prev, apiKey: e.target.value }))} />
        <InputField label="API Secret" type="password" placeholder="cloudinary-api-secret" value={formData.apiSecret} onChange={(e) => setFormData((prev: any) => ({ ...prev, apiSecret: e.target.value }))} className="lg:col-span-2" />
      </div>
    </SettingForm>
  );
}

function FirecrawlSettings() {
  return (
    <SettingForm title="FireCrawl Web Scraper" description="Configure web scraping settings for data extraction" color="orange" disabled={true}>
      <div className="mb-6 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-200 flex items-center gap-3">
        <svg className="w-6 h-6 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <h4 className="font-semibold text-orange-400">Coming Soon</h4>
          <p className="text-sm">Web scraping integration is currently in development.</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-50 pointer-events-none grayscale">
        <InputField label="API Key" type="password" placeholder="firecrawl-api-key" value="" className="lg:col-span-2" disabled={true} />
        <InputField label="Max Crawl Depth" type="number" placeholder="3" value="3" disabled={true} />
        <InputField label="Max Pages" type="number" placeholder="100" value="100" disabled={true} />
      </div>
    </SettingForm>
  );
}

function GeminiSettings({ data, onSave, saved }: { data: any, onSave: (d: any) => void; saved: boolean }) {
  const [formData, setFormData] = useState(data);
  useEffect(() => { setFormData(data); }, [data]);

  return (
    <SettingForm title="Gemini AI Agent" description="Configure Gemini AI model parameters for voice conversations" color="teal" onSave={() => onSave(formData)} saved={saved}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField label="API Key" type="password" placeholder="gemini-api-key" value={formData.apiKey} onChange={(e) => setFormData((prev: any) => ({ ...prev, apiKey: e.target.value }))} className="lg:col-span-2" />
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Model Version</label>
          <select
            value={formData.model}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setFormData((prev: any) => ({ ...prev, model: e.target.value }))
            }
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500"
          >
            <option value="gemini-2.5-flash-native-audio-latest">Gemini 2.5 Flash Native</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          </select>
        </div>
        <InputField label="Temperature" type="number" step="0.1" value={formData.temperature} onChange={(e) => setFormData((prev: any) => ({ ...prev, temperature: Number(e.target.value) }))} />
      </div>
    </SettingForm>
  );
}

function SettingForm({ title, description, color, children, onSave, saved, disabled }: SettingFormProps) {
  const gradients = {
    blue: 'from-blue-500 to-blue-600',
    cyan: 'from-cyan-500 to-cyan-600',
    orange: 'from-orange-500 to-orange-600',
    teal: 'from-teal-500 to-teal-600',
  };

  const getGradient = () => gradients[color] || gradients.blue;

  return (
    <div className="space-y-8">
      <div className="flex justify-between border-b border-white/10 pb-6">
        <div>
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
      </div>

      {children}

      {!disabled && onSave && (
        <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
          <button onClick={onSave} className={`px-6 py-2.5 rounded-xl text-white transition-all \${saved ? 'bg-emerald-600 shadow-[0_0_15px_rgba(5,150,105,0.5)]' : \`bg-gradient-to-r \${getGradient()} hover:opacity-90\`}`}>
            {saved ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      )}
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder, step, className, disabled }: InputFieldProps) {
  return (
    <div className={`space-y-2 \${className || ''}`}>
      <label className="text-xs text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step} 
        disabled={disabled}
        className={`w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 \${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} 
      />
    </div>
  );
}