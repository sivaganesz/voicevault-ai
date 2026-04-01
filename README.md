# 🎙️ VoiceVault AI

**Your Knowledge, Voice-Activated**

A real-time intelligent system that allows users to interact with document-based knowledge using voice commands. The system processes documents, converts them into embeddings, and enables natural voice-based Q&A powered by Google's Gemini AI.

![VoiceVault AI](https://img.shields.io/badge/VoiceVault-AI-orange) ![React](https://img.shields.io/badge/React-18-blue) ![Node.js](https://img.shields.io/badge/Node.js-Express-green) ![Gemini](https://img.shields.io/badge/AI-Gemini-purple)

---

## 📌 Project Summary

**VoiceVault AI** is a cutting-edge application that bridges the gap between static document repositories and dynamic, conversational AI. Users can:

- 🎤 **Speak naturally** to query their document knowledge base
- 📄 **Upload PDFs** and other documents for instant processing
- 🌐 **Scrape websites** using Firecrawl to expand the knowledge base
- 💬 **Get AI-powered responses** delivered via voice or text
- ⚡ **Real-time interaction** with minimal latency

---

## 🎯 Purpose

### The Problem

Information is scattered across:
- Multiple websites and web pages
- PDF documents and reports
- Internal documentation and policies
- Research papers and articles

Traditional search is slow, requires manual reading, and doesn't provide conversational access.

### The Solution

VoiceVault AI centralizes knowledge, enables voice interaction, and provides instant, context-aware answers using:

- **Semantic search** via Qdrant vector database
- **Natural language understanding** via Gemini AI
- **Voice input/output** via Websocket and Web Audio API
- **Automated data collection** via Firecrawl

---

## 🚀 Use Cases

- 🏢 **Company Policy Assistant** - Employees ask questions about HR policies, benefits, procedures
- 📊 **Finance Document Assistant** - Query financial reports, regulations, compliance documents
- 📚 **Learning Assistant** - Students interact with course materials, textbooks, research papers
- 📞 **Customer Support AI** - Support agents get instant answers from product documentation
- 🏥 **Medical Knowledge Base** - Healthcare professionals access medical literature via voice

---

## ⚙️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Framer Motion** - Smooth animations and transitions
- **React Router** - Client-side routing
- **Lucide React** - Modern icon library
- **WaveSurfer.js** - Audio waveform visualization

### Backend
- **Node.js + Express** - RESTful API server
- **Multer** - File upload handling
- **Google Gemini AI** - Answer generation and NLP
- **Qdrant** - Vector database for embeddings
- **Firecrawl** - Web scraping and data collection
- **Cloudinary** - Cloud file storage
- **Websocket** - Real-time voice communication (optional)
- **pdf-parse** - PDF text extraction

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                      (Voice Input)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React)                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Voice UI     │  │ Settings     │  │ File Upload  │      │
│  │ - Recording  │  │ - Qdrant     │  │ - PDF/Docs   │      │
│  │ - Waveform   │  │ - Firecrawl  │  │ - Preview    │      │
│  │ - History    │  │ - Cloudinary │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js/Express)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API ROUTES                               │  │
│  │  /api/voice     /api/settings    /api/documents      │  │
│  └──────────────────────────────────────────────────────┘  │
│                         │                                    │
│  ┌──────────────────────┼────────────────────────────────┐ │
│  │              SERVICES LAYER                           │ │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │ │
│  │  │ Voice      │  │ Document   │  │ Settings   │     │ │
│  │  │ Service    │  │ Service    │  │ Service    │     │ │
│  │  └────────────┘  └────────────┘  └────────────┘     │ │
│  └───────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                         │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Qdrant    │  │ Firecrawl  │  │ Cloudinary │            │
│  │  (Vector   │  │ (Web       │  │ (File      │            │
│  │   DB)      │  │  Scraping) │  │  Storage)  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│                                                            │
│  ┌────────────┐  ┌────────────┐                            │
│  │  Gemini AI │  │  Websocket │                            │
│  │  (LLM)     │  │  (Voice)   │                            │
│  └────────────┘  └────────────┘                            │
└────────────────────────────────────────────────────────────┘
```

---

## 🔄 Workflow

### 1. Data Ingestion
```
Documents/URLs → Upload/Scrape → Text Extraction → Chunking
```

### 2. Embedding Generation
```
Text Chunks → Embedding Model → Vector Embeddings → Qdrant Storage
```

### 3. Voice Query Processing
```
User Voice → Transcription → Text Query → Vector Search (Qdrant)
```

### 4. Answer Generation
```
Retrieved Context + Query → Gemini AI → Generated Answer → Voice Output
```

---

## 📁 Project Structure

```
voicevault-ai/
├── client/                      # Frontend React application
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoiceInterface.jsx
│   │   │   ├── VoiceInterface.css
│   │   │   ├── SettingsPage.jsx
│   │   │   └── SettingsPage.css
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                      # Backend Node.js application
│   ├── routes/
│   │   ├── voice.js            # Voice processing endpoints
│   │   ├── settings.js         # Settings management
│   │   └── documents.js        # Document upload/processing
│   ├── services/
│   │   ├── voiceService.js     # Voice processing logic
│   │   ├── qdrantService.js    # Vector DB operations
│   │   ├── documentService.js  # Document handling
│   │   └── settingsService.js  # Config management
│   ├── config/
│   │   └── settings.json       # Runtime configuration
│   └── index.js                # Express server
│
├── uploads/                     # Temporary file uploads
├── .env.example                # Environment variables template
├── .gitignore
├── package.json                # Root dependencies
└── README.md                   # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Gemini API Key** (free from [Google AI Studio](https://makersuite.google.com/app/apikey))
- **Qdrant** instance (cloud or local)
- **Firecrawl API Key** (optional, for web scraping)
- **Cloudinary account** (optional, for file storage)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/voicevault-ai.git
cd voicevault-ai
```

2. **Install root dependencies**
```bash
npm install
```

3. **Install client dependencies**
```bash
cd client
npm install
cd ..
```

4. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=your-mongodb-uri
```

5. **Create uploads directory**
```bash
mkdir uploads
```

### Running the Application

**Development mode (recommended):**
```bash
npm run dev
```

This runs both the backend (port 3000) and frontend (port 5173) concurrently.

**Or run separately:**

Backend only:
```bash
npm run server
```

Frontend only:
```bash
npm run client
```

**Production build:**
```bash
npm run build
npm start
```

### Access the Application

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3000/api
- **Health Check:** http://localhost:3000/api/health

---

## ⚙️ Configuration

### Initial Setup

1. Navigate to **Settings** page in the UI
2. Configure each service:

#### Qdrant Configuration
- **API Key:** Your Qdrant API key
- **Endpoint URL:** `https://your-cluster.qdrant.io`
- **Collection Name:** `voice_ai_documents` (or custom name)

#### Firecrawl Configuration
- **API Key:** Your Firecrawl API key
- **Endpoint URL:** `https://api.firecrawl.dev`

#### Cloudinary Configuration
- **Cloud Name:** Your Cloudinary cloud name
- **API Key:** Your Cloudinary API key
- **API Secret:** Your Cloudinary API secret

3. Click **Save Configuration**

Settings are stored in `server/config/settings.json` and persist between restarts.

---

## 🎯 Features

### 1. Voice Interface
- ✅ Real-time audio recording with visual waveform
- ✅ Start/Stop recording with animated UI
- ✅ Processing indicator during transcription
- ✅ Transcript display
- ✅ Conversation history with timestamps
- ✅ Clear history functionality

### 2. Settings Management
- ✅ Three-tab interface (Qdrant, Firecrawl, Cloudinary)
- ✅ Secure API key storage
- ✅ Endpoint configuration
- ✅ Visual feedback on save
- ✅ Animated tab transitions

### 3. Document Processing
- ✅ PDF upload support
- ✅ Text extraction
- ✅ Automatic chunking
- ✅ Embedding generation
- ✅ Vector storage in Qdrant

### 4. AI-Powered Responses
- ✅ Semantic search with Qdrant
- ✅ Context-aware answers via Gemini
- ✅ Source attribution
- ✅ Conversational responses

---

## 📊 Data Flow Diagram

```
┌─────────────┐
│   User      │
│   Voice     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Audio Input    │
│  (Web Audio)    │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐       ┌──────────────┐
│  Transcription  │──────▶│   Text Query │
│  (Speech-to-    │       └──────┬───────┘
│   Text)         │              │
└─────────────────┘              │
                                 ▼
                         ┌───────────────┐
                         │ Vector Search │
                         │   (Qdrant)    │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │   Retrieved   │
                         │   Documents   │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │  Gemini AI    │
                         │  (Generate    │
                         │   Response)   │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │  Text Answer  │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │  Voice Output │
                         │  (TTS)        │
                         └───────────────┘
```

---

## ⚠️ Challenges & Solutions

### Challenge 1: PDF Parsing Issues
**Problem:** Complex PDFs with images, tables, or unusual formatting  
**Solution:** Use `pdf-parse` library with fallback to OCR for scanned documents

### Challenge 2: Voice Latency
**Problem:** Delay between recording and response  
**Solution:** Streaming transcription, parallel processing, optimized vector search

### Challenge 3: Data Freshness
**Problem:** Keeping document embeddings up-to-date  
**Solution:** Incremental updates, change detection, scheduled re-indexing

### Challenge 4: API Rate Limits
**Problem:** Gemini and other services have rate limits  
**Solution:** Request queuing, caching, exponential backoff

---

## 🔮 Future Enhancements

### Short Term
- [ ] Multi-language support (transcription + responses)
- [ ] File format expansion (DOCX, TXT, Markdown)
- [ ] Batch document upload
- [ ] Advanced voice commands ("search for...", "summarize...")
- [ ] Export conversation history

### Medium Term
- [ ] User authentication and multi-user support
- [ ] Document versioning and update tracking
- [ ] Custom embedding models
- [ ] Advanced RAG techniques (HyDE, query expansion)
- [ ] Voice personalization (user profiles)

---

### API Testing

Use tools like Postman or curl:

```bash
# Health check
curl http://localhost:3000/api/health

# Get settings
curl http://localhost:3000/api/settings

# Upload document
curl -X POST -F "file=@document.pdf" http://localhost:3000/api/documents/upload
```

## 🙏 Acknowledgments

- **Google Gemini** for powerful language understanding
- **Qdrant** for high-performance vector search
- **Firecrawl** for reliable web scraping
- **Cloudinary** for seamless file storage
- **Websocket** for real-time voice infrastructure
