# RAG Educational Demo — Frontend

Next.js frontend for the RAG Educational Demonstration application (Coditas futuristic theme).

## Stack

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS** — Coditas dark/neon theme (`#0052cc`, `#00d4ff`)
- **Framer Motion** — step-by-step and flow animations
- **react-plotly.js** — similarity search scatter visualization

## Setup

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local if your backend runs elsewhere (default: http://localhost:8000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Backend contract

The UI expects the FastAPI backend to expose:

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/chunk` | `{ "text": string, "strategy": "character" \| "recursive" \| "semantic" }` | `{ "chunks": string[], "strategy": string }` |
| POST | `/embed` | `{ "chunks": string[], "model_id"?: string }` | `{ "embeddings": number[][], "dimensions": number, "model": string }` |
| POST | `/search-dense` | `{ "query": string, "limit"?: number, "metric"?: "cosine" \| "dot_product" \| "euclidean" }` | `{ "results": { "text": string, "score": number }[], "metric": string }` |
| POST | `/search-sparse` | `{ "query": string, "limit"?: number }` | `{ "results": { "text": string, "score": number }[] }` |
| POST | `/search-hybrid` | `{ "query": string, "limit"?: number }` | `{ "denseResults", "sparseResults", "fusedResults", "query" }` |

If an endpoint is not implemented, the app falls back to mock data so the demo can still be used.

## Modes

- **Step-by-Step**: One pipeline stage at a time (Ingestion → Embeddings → Similarity Search → Shortcoming → Hybrid & RRF). Use Previous/Next to move.
- **Connected Flow**: All modules visible for an end-to-end walkthrough.

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — run production build
- `npm run lint` — ESLint
