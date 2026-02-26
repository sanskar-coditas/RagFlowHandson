const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ApiOptions = {
  method?: string;
  headers?: HeadersInit;
  body?: object;
};

async function fetchApi<T>(path: string, options?: ApiOptions): Promise<T> {
  const { body, method = "GET", headers = {} } = options || {};
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(headers as Record<string, string>),
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

import type {
  ChunkResponse,
  ChunkStrategy,
  EmbedResponse,
  EmbeddingModelId,
  EmbeddingModelInfo,
  DenseSearchResponse,
  HybridSearchResponse,
  SimilarityMetric,
  SearchType,
  FormatStyle,
  RAGResponse,
  CompareResponse,
  TrapDemoResponse,
} from "@/types";

const DEFAULT_MODEL: EmbeddingModelId = "azure-openai";

export async function chunkDocument(
  text: string,
  strategy: ChunkStrategy,
  chunkSize: number = 512,
  chunkOverlap: number = 50
): Promise<ChunkResponse & { chunk_size: number; chunk_overlap: number }> {
  const backendStrategy =
    strategy === "recursive" ? "recursive_character" : strategy;
  const res = await fetchApi<{
    chunks: { content: string; index: number }[];
    strategy: string;
    chunk_size: number;
    chunk_overlap: number;
  }>("/chunk", {
    method: "POST",
    body: { text, strategy: backendStrategy, chunk_size: chunkSize, chunk_overlap: chunkOverlap },
  });
  return {
    chunks: res.chunks.map((c) => c.content),
    strategy,
    chunk_size: res.chunk_size,
    chunk_overlap: res.chunk_overlap,
  };
}

export async function listEmbeddingModels(): Promise<{
  models: EmbeddingModelInfo[];
  dimensions: Record<string, number>;
}> {
  return fetchApi("/embed/models");
}

export async function embedChunks(
  chunks: string[],
  modelId?: EmbeddingModelId
): Promise<EmbedResponse> {
  return fetchApi<EmbedResponse>("/embed", {
    method: "POST",
    body: { chunks, model_id: modelId ?? DEFAULT_MODEL },
  });
}

export async function upsertChunks(
  chunks: { content: string; index: number }[],
  model?: EmbeddingModelId
): Promise<{ status: string; count: number }> {
  return fetchApi("/search/upsert", {
    method: "POST",
    body: { chunks, model: model ?? DEFAULT_MODEL },
  });
}

export async function clearIndex(): Promise<{ status: string; storage: string }> {
  return fetchApi("/search/clear", { method: "DELETE" });
}

export async function searchDense(
  query: string,
  limit?: number,
  metric?: SimilarityMetric,
  model?: EmbeddingModelId
): Promise<DenseSearchResponse> {
  return fetchApi<DenseSearchResponse>("/search/dense", {
    method: "POST",
    body: { query, limit: limit ?? 5, metric: metric ?? "cosine", model: model ?? DEFAULT_MODEL },
  });
}

export async function searchSparse(
  query: string,
  limit?: number
): Promise<{ results: { text: string; score: number }[] }> {
  return fetchApi("/search/sparse", {
    method: "POST",
    body: { query, limit: limit ?? 5 },
  });
}

export async function searchHybrid(
  query: string,
  limit?: number,
  model?: EmbeddingModelId,
  rrfK?: number
): Promise<HybridSearchResponse> {
  return fetchApi<HybridSearchResponse>("/search/hybrid", {
    method: "POST",
    body: { query, limit: limit ?? 5, model: model ?? DEFAULT_MODEL, rrf_k: rrfK ?? 60 },
  });
}

export async function searchCompare(
  query: string,
  topK?: number,
  model?: EmbeddingModelId
): Promise<CompareResponse> {
  return fetchApi<CompareResponse>("/search/compare", {
    method: "POST",
    body: { query, top_k: topK ?? 5, model: model ?? DEFAULT_MODEL },
  });
}

export async function ragAnswer(
  query: string,
  searchType?: SearchType,
  model?: EmbeddingModelId,
  formatStyle?: FormatStyle,
  topK?: number,
  includeComparison?: boolean
): Promise<RAGResponse> {
  return fetchApi<RAGResponse>("/rag/answer", {
    method: "POST",
    body: {
      query,
      search_type: searchType ?? "hybrid",
      model: model ?? DEFAULT_MODEL,
      format_style: formatStyle ?? "intelligence_report",
      top_k: topK ?? 5,
      include_comparison: includeComparison ?? false,
    },
  });
}

export async function trapDemo(
  query: string,
  model?: EmbeddingModelId,
  topK?: number
): Promise<TrapDemoResponse> {
  return fetchApi<TrapDemoResponse>("/rag/trap-demo", {
    method: "POST",
    body: { query, model: model ?? DEFAULT_MODEL, top_k: topK ?? 5 },
  });
}

export async function getIndexedChunks(): Promise<{ chunks: { content: string; index: number }[] }> {
  return fetchApi("/search/chunks");
}

export { API_URL };
