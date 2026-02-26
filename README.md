# RAG Flow - Interactive RAG Pipeline Visualization

A hands-on educational tool to understand Retrieval-Augmented Generation (RAG) through interactive visualizations.

![RAG Flow Demo](https://github.com/user-attachments/assets/54b2b293-8869-479a-b2b5-94c47eaf38d6)

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- API keys (Azure OpenAI, Qdrant, etc.)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Start server
uvicorn main:app --reload --port 8005
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

### 3. Open the App

Visit **http://localhost:3000** in your browser.

## Features

### 1. Document Chunking
Split documents with configurable chunk size and overlap. Visualize how text is segmented for RAG.

![Chunking](https://github.com/user-attachments/assets/fb7d3c2b-56ff-4c94-a39f-aa44f2dbb3c3)

### 2. Embeddings Generation
Generate vector embeddings using multiple models (Azure OpenAI, Cohere Bedrock, NVIDIA NIM).

<p align="center">
  <img src="https://github.com/user-attachments/assets/642fa33e-376d-4ccb-9714-cc384da2e1ab" width="48%" />
  <img src="https://github.com/user-attachments/assets/b7ded92c-bbcf-40af-bc3a-1c3c6109a6ac" width="48%" />
</p>

### 3. Similarity Search & Hybrid Retrieval
Explore vector similarity, compare dense vs sparse search, and understand RRF fusion.

<p align="center">
  <img src="https://github.com/user-attachments/assets/043afc73-a883-4ab3-bba3-4fc5966ecea4" width="48%" />
  <img src="https://github.com/user-attachments/assets/f75ea0f7-9e17-482f-a8b7-d93e8c294061" width="48%" />
</p>

### 4. LLM Answer Generation
Generate cited responses using the full RAG pipeline with hybrid retrieval.

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API key |
| `QDRANT_URL` | Qdrant Cloud URL |
| `QDRANT_API_KEY` | Qdrant API key |

See `backend/.env.example` for all options.

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend URL (default: `http://localhost:8005`) |

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS, Framer Motion
- **Backend**: FastAPI, LangChain, Qdrant
- **AI**: Azure OpenAI, Cohere Bedrock, NVIDIA NIM
