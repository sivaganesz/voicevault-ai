import React, { useState } from 'react';

export default function Documents() {
  const [url, setUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount] = useState(12);

  const handleFirecrawl = () => {
    if (!url) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setUrl('');
    }, 3000);
  };

  const documents = [
    { name: 'API Documentation', type: 'PDF', size: '2.4 MB', date: '2024-03-20' },
    { name: 'User Guide', type: 'PDF', size: '1.8 MB', date: '2024-03-18' },
    { name: 'Product Specs', type: 'JSON', size: '856 KB', date: '2024-03-15' },
    { name: 'Integration Notes', type: 'TXT', size: '124 KB', date: '2024-03-12' },
  ];

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto h-full overflow-y-auto">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-8 bg-gradient-to-b from-blue-500 to-cyan-600 rounded-full" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Knowledge Base
          </h2>
        </div>
        <p className="text-slate-400 text-sm max-w-2xl">
          Upload files or scrape websites to provide context to your voice agent.
          Your documents are automatically indexed for real-time access.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-blue-500/50 transition-all duration-300 cursor-pointer">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Local Files</h3>
              <p className="text-sm text-slate-400 mb-6">Upload PDF, TXT, or JSON files to enhance your agent's knowledge.</p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider group-hover:bg-blue-500/20 transition-colors">
                Browse Files
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center mb-5">
                <svg className="w-7 h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Web Scraper</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/docs"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
                <button
                  onClick={handleFirecrawl}
                  disabled={isProcessing || !url}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Processing...
                    </span>
                  ) : 'Run FireCrawl'}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Recent Documents</h3>
            </div>
            <div className="divide-y divide-white/10">
              {documents.map((doc, idx) => (
                <div key={idx} className="px-6 py-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{doc.name}</p>
                      <p className="text-xs text-slate-500">{doc.type} • {doc.size}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{doc.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600 to-cyan-700 rounded-2xl p-8 text-white shadow-2xl">
            <p className="text-xs font-bold tracking-wider uppercase opacity-80 mb-2">Total Documents</p>
            <h4 className="text-5xl font-black mb-2">{processedCount}</h4>
            <p className="text-sm opacity-80 mb-4">Fully synchronized with vector store</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-bold">Active</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Data Sources</h4>
            <div className="space-y-3">
              <SourceItem label="Web Scraper" count="8 URLs" active />
              <SourceItem label="PDF Upload" count="4 Files" active />
              <SourceItem label="Text Files" count="3 Files" active />
              <SourceItem label="JSON Data" count="1 File" active />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Storage Usage</h4>
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-slate-400">Used</span>
                <span className="text-white font-medium">4.2 MB / 50 MB</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full w-[8.4%] bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full" />
              </div>
            </div>
            <p className="text-xs text-slate-500">Upgrade for more storage</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SourceItem({ label, count, active }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
        <span className="text-sm text-slate-300">{label}</span>
      </div>
      <span className="text-xs text-slate-500 font-mono">{count}</span>
    </div>
  );
}
