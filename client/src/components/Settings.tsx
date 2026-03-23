import { useState } from 'react';
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
  onSave: () => void;
  saved: boolean;
}

interface InputFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  step?: string;
  className?: string;
}

export default function Settings() {
  const [activeTab, setActiveTab] = useState<TabId>('qdrant');
  const [savedConfig, setSavedConfig] = useState<TabId | null>(null);

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

  const handleSave = (tabId: TabId) => {
    setSavedConfig(tabId);
    setTimeout(() => setSavedConfig(null), 2000);
  };

  const getColorClasses = (color: Tab['color']) => {
    const colors = {
      blue: {
        gradient: 'from-blue-500 to-blue-600',
        bg: 'bg-blue-500',
        text: 'text-blue-400'
      },
      cyan: {
        gradient: 'from-cyan-500 to-cyan-600',
        bg: 'bg-cyan-500',
        text: 'text-cyan-400'
      },
      orange: {
        gradient: 'from-orange-500 to-orange-600',
        bg: 'bg-orange-500',
        text: 'text-orange-400'
      },
      teal: {
        gradient: 'from-teal-500 to-teal-600',
        bg: 'bg-teal-500',
        text: 'text-teal-400'
      }
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
          All credentials are encrypted and stored securely.
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
                  ${isActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isActive ? 'text-white' : ''}`}>
                    {tab.label}
                  </span>
                  {isActive && (
                    <div className={`w-1.5 h-1.5 rounded-full ${tabColor.bg} animate-pulse`} />
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5 text-left hidden sm:block">
                  {tab.description}
                </p>

                {isActive && (
                  <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tabColor.gradient} rounded-full`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8">
        {activeTab === 'qdrant' && (
          <QdrantSettings onSave={() => handleSave('qdrant')} saved={savedConfig === 'qdrant'} />
        )}
        {activeTab === 'cloudinary' && (
          <CloudinarySettings onSave={() => handleSave('cloudinary')} saved={savedConfig === 'cloudinary'} />
        )}
        {activeTab === 'firecrawl' && (
          <FirecrawlSettings onSave={() => handleSave('firecrawl')} saved={savedConfig === 'firecrawl'} />
        )}
        {activeTab === 'gemini' && (
          <GeminiSettings onSave={() => handleSave('gemini')} saved={savedConfig === 'gemini'} />
        )}
      </div>
    </div>
  );
}

/* ---------------- Sub Components ---------------- */

function QdrantSettings({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [formData, setFormData] = useState({
    endpoint: '',
    apiKey: '',
    collection: 'documents',
    vectorSize: '1536',
  });

  return (
    <SettingForm title="Qdrant Vector Database" description="Configure your Qdrant instance for semantic search and vector storage" color="blue" onSave={onSave} saved={saved}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField label="Endpoint URL" type="text" placeholder="https://qdrant.example.com" value={formData.endpoint} onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))} />
        <InputField label="API Key" type="password" placeholder="qdrant-api-key" value={formData.apiKey} onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))} />
        <InputField label="Collection Name" type="text" placeholder="documents" value={formData.collection} onChange={(e) => setFormData(prev => ({ ...prev, collection: e.target.value }))} />
        <InputField label="Vector Size" type="number" placeholder="1536" value={formData.vectorSize} onChange={(e) => setFormData(prev => ({ ...prev, vectorSize: e.target.value }))} />
      </div>
    </SettingForm>
  );
}

function CloudinarySettings({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [formData, setFormData] = useState({
    cloudName: '',
    apiKey: '',
    apiSecret: '',
  });

  return (
    <SettingForm title="Cloudinary Media Storage" description="Configure Cloudinary for image and media optimization" color="cyan" onSave={onSave} saved={saved}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField label="Cloud Name" type="text" placeholder="cloudinary-cloud-name" value={formData.cloudName} onChange={(e) => setFormData(prev => ({ ...prev, cloudName: e.target.value }))} />
        <InputField label="API Key" type="password" placeholder="cloudinary-api-key" value={formData.apiKey} onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))} />
        <InputField label="API Secret" type="password" placeholder="cloudinary-api-secret" value={formData.apiSecret} onChange={(e) => setFormData(prev => ({ ...prev, apiSecret: e.target.value }))} className="lg:col-span-2" />
      </div>
    </SettingForm>
  );
}

function FirecrawlSettings({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [formData, setFormData] = useState({
    apiKey: '',
    maxDepth: '3',
    maxPages: '100',
  });

  return (
    <SettingForm title="FireCrawl Web Scraper" description="Configure web scraping settings for data extraction" color="orange" onSave={onSave} saved={saved}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField label="API Key" type="password" placeholder="firecrawl-api-key" value={formData.apiKey} onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))} className="lg:col-span-2" />
        <InputField label="Max Crawl Depth" type="number" placeholder="3" value={formData.maxDepth} onChange={(e) => setFormData(prev => ({ ...prev, maxDepth: e.target.value }))} />
        <InputField label="Max Pages" type="number" placeholder="100" value={formData.maxPages} onChange={(e) => setFormData(prev => ({ ...prev, maxPages: e.target.value }))} />
      </div>
    </SettingForm>
  );
}

function GeminiSettings({ onSave, saved }: { onSave: () => void; saved: boolean }) {
  const [formData, setFormData] = useState({
    apiKey: '',
    model: 'gemini-1.5-pro',
    temperature: '0.7',
  });

  return (
    <SettingForm title="Gemini AI Agent" description="Configure Gemini AI model parameters for voice conversations" color="teal" onSave={onSave} saved={saved}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField label="API Key" type="password" placeholder="gemini-api-key" value={formData.apiKey} onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))} className="lg:col-span-2" />
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Model Version</label>
          <select
            value={formData.model}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setFormData(prev => ({ ...prev, model: e.target.value }))
            }
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
          >
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
          </select>
        </div>
        <InputField label="Temperature" type="number" value={formData.temperature} onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))} />
      </div>
    </SettingForm>
  );
}

function SettingForm({ title, description, color, children, onSave, saved }: SettingFormProps) {
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

      <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
        <button onClick={onSave} className={`px-6 py-2.5 rounded-xl text-white ${saved ? 'bg-emerald-600' : `bg-gradient-to-r ${getGradient()}`}`}>
          {saved ? 'Saved!' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder, step, className }: InputFieldProps) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <label className="text-xs text-slate-400">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white" />
    </div>
  );
}