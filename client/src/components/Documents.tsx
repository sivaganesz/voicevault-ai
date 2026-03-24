import React, { useState, useRef, useEffect } from 'react';
import { FileText, FileCode, File, FileSpreadsheet } from 'lucide-react';
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

interface SourceType {
  PDF: number;
  TXT: number;
  DOC: number;
  DOCX: number;
  Websites: number;
}

export default function Documents(): JSX.Element {
  const [url, setUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<{ message: string; isError: boolean } | null>(null);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('general');

  const categories = [
    'general',
    'Technical Support',
    'Product Manual',
    'HR Policy',
    'Sales Pitch',
    'Legal',
    'Other'
  ];

  const [sourcesType, setSourcesType] = useState<SourceType>({
    PDF: 0,
    TXT: 0,
    DOC: 0,
    DOCX: 0,
    Websites: 0,
  });
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/documents');
      const data: DocumentItem[] = await response.json();
      console.log("data", data);
      setDocuments(data);
      setProcessedCount(data.length);

      const counts: SourceType = {
        PDF: 0,
        TXT: 0,
        DOC: 0,
        DOCX: 0,
        Websites: 0,
      };

      data.forEach((doc) => {
        const ext = doc.name.split('.').pop()?.toLowerCase();

        if (ext === 'pdf') counts.PDF++;
        else if (ext === 'txt') counts.TXT++;
        else if (ext === 'doc') counts.DOC++;
        else if (ext === 'docx') counts.DOCX++;
      });

      setSourcesType(counts);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  console.log("sourcesType", sourcesType)
  const handleFirecrawl = (): void => {
    if (!url) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setUrl('');
    }, 3000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validation
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      setUploadStatus({ message: 'Invalid file type. Only PDF, DOC, DOCX, and TXT are allowed.', isError: true });
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', selectedCategory);

    try {
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({ message: `Successfully uploaded and indexed ${file.name} in [${selectedCategory}]`, isError: false });

        // Update the list with a new document
        const newDoc: DocumentItem = {
          name: file.name,
          type: file.name.split('.').pop()?.toUpperCase() || 'UNKNOWN',
          size: formatSize(file.size),
          date: new Date().toISOString().split('T')[0],
        };

        setDocuments(prev => [newDoc, ...prev]);
        setProcessedCount(prev => prev + 1);
      } else {
        setUploadStatus({ message: data.error || 'Upload failed', isError: true });
      }
    } catch (error) {
      setUploadStatus({ message: 'Error connecting to server', isError: true });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowed = ['pdf', 'doc', 'docx', 'txt'];

    if (!ext || !allowed.includes(ext)) {
      setUploadStatus({
        message: 'Invalid file type. Only PDF, DOC, DOCX, TXT allowed.',
        isError: true,
      });
      return;
    }

    await uploadFile(file);
  };

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

      {uploadStatus && (
        <div className={`mb-6 p-4 rounded-xl border ${uploadStatus.isError ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{uploadStatus.message}</span>
            <button onClick={() => setUploadStatus(null)} className="ml-auto text-xs opacity-50 hover:opacity-100">Dismiss</button>
          </div>
        </div>
      )}
      <div className="mb-6">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Select Category</label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT */}
        <div className="lg:col-span-2 space-y-6">

          {/* Upload + Scraper */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Local Files */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="appearance-none bg-white/5 border border-white/10 rounded-xl px-4 pr-10 py-2 text-sm text-white w-full focus:outline-none focus:border-blue-500/50"
                  >
                    {categories.map(category => (
                      <option key={category} value={category} className="bg-slate-900">
                        {category}
                      </option>
                    ))}
                  </select>

                  {/* Custom arrow */}
                  <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/60 text-xs">
                    ▼
                  </div>
                </div>
              </div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`group rounded-2xl p-8 border transition-all duration-300 cursor-pointer flex-1
                  ${isDragging
                    ? 'bg-blue-500/10 border-blue-400 scale-[1.02]'
                    : 'bg-white/5 border-white/10 hover:border-blue-500/50'}
                `}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt"
                />
                <h3 className="text-xl font-bold text-white mb-2">
                  {isDragging ? 'Drop your file here 👇' : 'Local Files'}
                </h3>
                <p className="text-sm text-slate-400 mb-6">
                  Drag & drop or click to upload PDF, TXT, DOC files.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-wider group-hover:bg-blue-500/20 transition-colors">
                  {isUploading ? 'Uploading...' : 'Browse Files'}
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Web Scraper */}
            <div className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10 opacity-60">

              {/* Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                <span className="text-white text-sm font-semibold tracking-wide">
                  🚧 Coming Soon
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-3">Web Scraper</h3>

              <div className="space-y-4 pointer-events-none">
                <input
                  type="text"
                  value={url}
                  placeholder="https://example.com/docs"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white"
                  disabled
                />

                <button
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl text-white text-sm font-bold opacity-50 cursor-not-allowed"
                  disabled
                >
                  Run FireCrawl
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
                  {/* <div>
                    <p className="text-sm text-white">{doc.name}</p>
                    <p className="text-xs text-slate-500">
                      {doc.type} • {doc.size}
                    </p>
                  </div> */}
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getFileIcon(doc.type)}</span>
                    <div>
                      <p className="text-sm text-white">{doc.name}</p>
                      <p className="text-xs text-slate-500">
                        {doc.type} • {doc.size}
                      </p>
                    </div>
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
          <div className="bg-gradient-to-br from-blue-600 to-cyan-700 rounded-2xl p-8 text-white text-center">
            <p className="text-xs uppercase opacity-80 mb-2">Total Documents</p>
            <h4 className="text-5xl font-black">{processedCount}</h4>
          </div>

          {/* Sources */}
          <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
            <h4 className="text-xs text-slate-400 uppercase mb-4">Data Sources</h4>

            <div className="space-y-3">
              <SourceItem label="Web Scraper" count={`${sourcesType.Websites} ${sourcesType.Websites === 1 ? 'file' : 'files'}`} active />
              <SourceItem label="PDF Upload" count={`${sourcesType.PDF} ${sourcesType.PDF === 1 ? 'file' : 'files'}`} active />
              <SourceItem label="Text Files" count={`${sourcesType.TXT} ${sourcesType.TXT === 1 ? 'file' : 'files'}`} active />
              <SourceItem label="Docs Files" count={`${sourcesType.DOC + sourcesType.DOCX} ${(sourcesType.DOC + sourcesType.DOCX) === 1 ? 'file' : 'files'}`} active />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


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

const getFileIcon = (type: string) => {
  const ext = type.toLowerCase();

  const iconClass = "w-5 h-5";

  switch (ext) {
    case '.pdf':
      return <FileText className={`${iconClass} text-red-400`} />;
    case '.doc':
    case '.docx':
      return <FileText className={`${iconClass} text-blue-400`} />;
    case '.txt':
      return <FileText className={`${iconClass} text-slate-400`} />;
    default:
      return <File className={`${iconClass} text-slate-500`} />;
  }
};