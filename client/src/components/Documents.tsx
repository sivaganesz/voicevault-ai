import React, { useState } from 'react';

// Document type
interface DocumentItem {
  name: string;
  type: string;
  size: string;
  date: string;
}

// Source item props
interface SourceItemProps {
  label: string;
  count: string;
  active?: boolean;
}

export default function Documents(): JSX.Element {
  const [url, setUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedCount] = useState<number>(12);

  const handleFirecrawl = (): void => {
    if (!url) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setUrl('');
    }, 3000);
  };

  const documents: DocumentItem[] = [
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
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">

          {/* Upload + Scraper */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Local Files */}
            <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 hover:border-blue-500/50 transition-all duration-300 cursor-pointer">
              <h3 className="text-xl font-bold text-white mb-2">Local Files</h3>
              <p className="text-sm text-slate-400 mb-6">
                Upload PDF, TXT, or Docs files to enhance your agent's knowledge.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider group-hover:bg-blue-500/20 transition-colors">
                Browse Files
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Web Scraper */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
              <h3 className="text-xl font-bold text-white mb-3">Web Scraper</h3>

              <div className="space-y-4">
                <input
                  type="text"
                  value={url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUrl(e.target.value)
                  }
                  placeholder="https://example.com/docs"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                />

                <button
                  onClick={handleFirecrawl}
                  disabled={isProcessing || !url}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                >
                  {isProcessing ? 'Processing...' : 'Run FireCrawl'}
                </button>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-sm font-bold text-white">Recent Documents</h3>
            </div>

            <div className="divide-y divide-white/10">
              {documents.map((doc, idx) => (
                <div
                  key={idx}
                  className="px-6 py-4 flex items-center justify-between hover:bg-white/5"
                >
                  <div>
                    <p className="text-sm text-white">{doc.name}</p>
                    <p className="text-xs text-slate-500">
                      {doc.type} • {doc.size}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">{doc.date}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {/* Stats */}
          <div className="bg-gradient-to-br from-blue-600 to-cyan-700 rounded-2xl p-8 text-white">
            <p className="text-xs uppercase opacity-80 mb-2">Total Documents</p>
            <h4 className="text-5xl font-black">{processedCount}</h4>
          </div>

          {/* Sources */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h4 className="text-xs text-slate-400 uppercase mb-4">Data Sources</h4>

            <div className="space-y-3">
              <SourceItem label="Web Scraper" count="8 URLs" active />
              <SourceItem label="PDF Upload" count="4 Files" active />
              <SourceItem label="Text Files" count="3 Files" active />
              <SourceItem label="Docs Files" count="1 File" active />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate typed component
function SourceItem({ label, count, active = false }: SourceItemProps): JSX.Element {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div
          className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-600'
            }`}
        />
        <span className="text-sm text-slate-300">{label}</span>
      </div>

      <span className="text-xs text-slate-500 font-mono">{count}</span>
    </div>
  );
}