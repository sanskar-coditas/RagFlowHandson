# RAG Demo Backend (ARIS)

FastAPI backend for the **Advanced Retrieval Intelligence System (ARIS)** - a comprehensive RAG Educational Demonstration app. Provides:

- **Chunking** with multiple strategies (character, recursive, semantic)
- **Multi-provider embeddings** (Azure OpenAI, Cohere Bedrock, NVIDIA)
- **Search** (dense vector, sparse BM25, hybrid RRF)
- **LLM-powered answer generation** with formatted intelligence reports
- **Qdrant Cloud** integration for persistent vector storage

## Setup

```bash
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # Windows
# source venv/bin/activate    # Linux/macOS
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys (see .env.example for all options)
```

## Embedding Models

| Model ID | Provider | Dimensions |
|----------|----------|------------|
| `azure-openai` | Azure OpenAI (APIM) | 1536 |
| `cohere-embed-english-v3` | Cohere (AWS Bedrock) | 1024 |
| `nvidia-nv-embed-v1` | NVIDIA NIM (free) | 4096 |

## Run

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs: http://localhost:8000/docs

## API Endpoints

### Chunking (`/chunk`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/chunk/datasets` | List pre-loaded datasets (RAG intro, API security, chunking, embeddings, vector DBs, hybrid search, trap) |
| POST | `/chunk` | Chunk text - supports `text`, `dataset_id`, `trap=true`, or `all_datasets=true` |

### Embeddings (`/embed`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/embed/models` | List embedding models with dimensions and providers |
| POST | `/embed` | Generate embeddings for text chunks |

### Search (`/search`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/search/upsert` | Index chunks with embeddings (stores in Qdrant + builds BM25 index) |
| DELETE | `/search/clear` | Clear all indexed data |
| POST | `/search/dense` | Dense (semantic) vector search |
| POST | `/search/sparse` | Sparse (BM25 keyword) search |
| POST | `/search/hybrid` | Hybrid search with RRF fusion |
| POST | `/search/compare` | **Compare dense vs hybrid results with delta analysis** |
| GET | `/search/chunks` | List currently indexed chunks |

### RAG Answer Generation (`/rag`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/rag/answer` | **Complete RAG pipeline**: embed query → search → LLM answer with citations |
| POST | `/rag/trap-demo` | **Trap dataset demo**: shows similarity vs relevance issue |

## Configuration

### Qdrant

- **Cloud**: Set `QDRANT_URL` and `QDRANT_API_KEY`, and `QDRANT_IN_MEMORY=0`. Collections are auto-created/recreated when embedding dimensions change.
- **In-memory**: Set `QDRANT_IN_MEMORY=1` and leave `QDRANT_URL` unset.

### LLM (for answer generation)

Set `AZURE_OPENAI_CHAT_MODEL=gpt-4.1` (or your deployment name) to enable LLM-powered responses.

## Demo Flow

1. **Chunk**: `POST /chunk` with `all_datasets=true` for comprehensive demo content
2. **Index**: `POST /search/upsert` with chunks and chosen embedding model
3. **Search**: Try `/search/dense`, `/search/sparse`, and `/search/hybrid` to compare
4. **Compare**: `POST /search/compare` to visualize RRF impact (promoted/demoted results)
5. **Trap Demo**: `POST /rag/trap-demo` with query "How to secure an API" to see similarity traps
6. **Intelligence Report**: `POST /rag/answer` to get LLM-generated response with citations

## Demo Datasets

- **rag_intro**: RAG concepts, chunking, embeddings, search
- **api_security**: API security best practices
- **chunking_strategies**: Deep dive into chunking approaches
- **embedding_models**: Guide to different embedding models
- **vector_databases**: Overview of vector DB options
- **hybrid_search_details**: RRF and hybrid search explanation
- **trap**: Similarity vs relevance demonstration dataset
