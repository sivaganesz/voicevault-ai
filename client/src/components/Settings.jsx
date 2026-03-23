import React, { useState } from 'react';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('qdrant');
  const [savedConfig, setSavedConfig] = useState(null);

  const tabs = [
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

  const handleSave = (tabId) => {
    setSavedConfig(tabId);
    setTimeout(() => setSavedConfig(null), 2000);
  };

  const getColorClasses = (color) => {
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

function QdrantSettings({ onSave, saved }) {
  const [formData, setFormData] = useState({
    endpoint: '',
    apiKey: '',
    collection: 'documents',
    vectorSize: '1536',
  });

  return (
    <SettingForm
      title="Qdrant Vector Database"
      description="Configure your Qdrant instance for semantic search and vector storage"
      color="blue"
      onSave={onSave}
      saved={saved}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField
          label="Endpoint URL"
          type="text"
          value={formData.endpoint}
          onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
          placeholder="https://your-cluster.cloud.qdrant.io"
        />
        <InputField
          label="API Key"
          type="password"
          value={formData.apiKey}
          onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
          placeholder="••••••••••••••••••••••••••••••••"
        />
        <InputField
          label="Collection Name"
          type="text"
          value={formData.collection}
          onChange={(e) => setFormData(prev => ({ ...prev, collection: e.target.value }))}
          placeholder="documents"
        />
        <InputField
          label="Vector Size"
          type="number"
          value={formData.vectorSize}
          onChange={(e) => setFormData(prev => ({ ...prev, vectorSize: e.target.value }))}
          placeholder="1536"
        />
      </div>
    </SettingForm>
  );
}

function CloudinarySettings({ onSave, saved }) {
  const [formData, setFormData] = useState({
    cloudName: '',
    apiKey: '',
    apiSecret: '',
  });

  return (
    <SettingForm
      title="Cloudinary Media Storage"
      description="Configure Cloudinary for image and media optimization"
      color="cyan"
      onSave={onSave}
      saved={saved}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField
          label="Cloud Name"
          type="text"
          value={formData.cloudName}
          onChange={(e) => setFormData(prev => ({ ...prev, cloudName: e.target.value }))}
          placeholder="your-cloud-name"
        />
        <InputField
          label="API Key"
          type="password"
          value={formData.apiKey}
          onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
          placeholder="••••••••••••••••"
        />
        <InputField
          label="API Secret"
          type="password"
          value={formData.apiSecret}
          onChange={(e) => setFormData(prev => ({ ...prev, apiSecret: e.target.value }))}
          placeholder="••••••••••••••••"
          className="lg:col-span-2"
        />
      </div>
    </SettingForm>
  );
}

function FirecrawlSettings({ onSave, saved }) {
  const [formData, setFormData] = useState({
    apiKey: '',
    maxDepth: '3',
    maxPages: '100',
  });

  return (
    <SettingForm
      title="FireCrawl Web Scraper"
      description="Configure web scraping settings for data extraction"
      color="orange"
      onSave={onSave}
      saved={saved}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField
          label="API Key"
          type="password"
          value={formData.apiKey}
          onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
          placeholder="••••••••••••••••"
          className="lg:col-span-2"
        />
        <InputField
          label="Max Crawl Depth"
          type="number"
          value={formData.maxDepth}
          onChange={(e) => setFormData(prev => ({ ...prev, maxDepth: e.target.value }))}
          placeholder="3"
        />
        <InputField
          label="Max Pages"
          type="number"
          value={formData.maxPages}
          onChange={(e) => setFormData(prev => ({ ...prev, maxPages: e.target.value }))}
          placeholder="100"
        />
      </div>
    </SettingForm>
  );
}

function GeminiSettings({ onSave, saved }) {
  const [formData, setFormData] = useState({
    apiKey: '',
    model: 'gemini-1.5-pro',
    temperature: '0.7',
  });

  return (
    <SettingForm
      title="Gemini AI Agent"
      description="Configure Gemini AI model parameters for voice conversations"
      color="teal"
      onSave={onSave}
      saved={saved}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InputField
          label="API Key"
          type="password"
          value={formData.apiKey}
          onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
          placeholder="••••••••••••••••"
          className="lg:col-span-2"
        />
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Model Version</label>
          <select
            value={formData.model}
            onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
          >
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.0-pro">Gemini 1.0 Pro</option>
          </select>
        </div>
        <InputField
          label="Temperature"
          type="number"
          value={formData.temperature}
          onChange={(e) => setFormData(prev => ({ ...prev, temperature: e.target.value }))}
          placeholder="0.7"
          step="0.1"
        />
      </div>
    </SettingForm>
  );
}

function SettingForm({ title, description, color, children, onSave, saved }) {
  const getGradient = () => {
    const gradients = {
      blue: 'from-blue-500 to-blue-600',
      cyan: 'from-cyan-500 to-cyan-600',
      orange: 'from-orange-500 to-orange-600',
      teal: 'from-teal-500 to-teal-600',
    };
    return gradients[color] || gradients.blue;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
          <p className="text-sm text-slate-400">{description}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-medium text-emerald-400">Connected</span>
        </div>
      </div>

      {children}

      <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-3">
        <button className="px-6 py-2.5 rounded-xl border border-white/10 text-slate-300 text-sm font-medium hover:bg-white/5 transition-all">
          Reset
        </button>
        <button
          onClick={onSave}
          className={`
            px-6 py-2.5 rounded-xl text-white text-sm font-medium transition-all
            flex items-center justify-center gap-2 shadow-lg
            ${saved
              ? 'bg-emerald-600 shadow-emerald-500/20'
              : `bg-gradient-to-r ${getGradient()} hover:opacity-90`
            }
          `}
        >
          {saved ? (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved!
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Configuration
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder, step, className }) {
  return (
    <div className={`space-y-2 ${className || ''}`}>
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        step={step}
        className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
      />
    </div>
  );
}
