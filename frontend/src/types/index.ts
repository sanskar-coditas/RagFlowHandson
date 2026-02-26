export type ChunkStrategy = "character" | "recursive" | "semantic";

export type EmbeddingModelId =
  | "azure-openai"
  | "cohere-embed-english-v3"
  | "nvidia-nv-embed-v1";

export type SimilarityMetric = "cosine" | "dot_product" | "euclidean";

export type SearchType = "dense" | "sparse" | "hybrid";

export type FormatStyle = "intelligence_report" | "summary" | "detailed";

export interface ChunkResponse {
  chunks: string[];
  strategy: ChunkStrategy;
}

export interface EmbedResponse {
  embeddings: number[][];
  dimensions: number;
  model: string;
}

export interface EmbeddingModelInfo {
  id: EmbeddingModelId;
  dimension: number;
  dimensions?: number;
  provider: string;
  label: string;
}

export interface SearchResult {
  text: string;
  score: number;
  rank?: number;
  index?: number;
  content?: string;
}

export interface DenseSearchResponse {
  results: SearchResult[];
  metric: SimilarityMetric;
  query?: string;
}

export interface HybridSearchResponse {
  denseResults: SearchResult[];
  sparseResults: SearchResult[];
  fusedResults: SearchResult[];
  query: string;
  rrf_k?: number;
}

export interface RAGSource {
  text: string;
  score: number;
  rank: number;
  index?: number;
}

export interface RAGResponse {
  answer: string;
  sources: RAGSource[];
  search_type: SearchType;
  confidence: "HIGH" | "MEDIUM" | "LOW" | "ERROR" | "UNKNOWN";
  model: string;
  format_style: FormatStyle;
  tokens_used?: number;
  comparison?: {
    analysis?: string;
    dense_count?: number;
    hybrid_count?: number;
    error?: string;
  };
}

export interface DeltaAnalysis {
  content: string;
  hybrid_rank: number;
  dense_rank: number | null;
  change: "PROMOTED" | "DEMOTED" | "NEW" | "UNCHANGED";
  change_detail: string;
  hybrid_score: number;
  dense_score: number | null;
}

export interface CompareResponse {
  query: string;
  dense_results: SearchResult[];
  sparse_results: SearchResult[];
  hybrid_results: SearchResult[];
  delta_analysis: DeltaAnalysis[];
  explanation: {
    rrf_k: number;
    formula: string;
    benefit: string;
  };
}

export interface TrapDemoResponse {
  query: string;
  dense_results: SearchResult[];
  sparse_results: SearchResult[];
  hybrid_results: SearchResult[];
  trap_analysis: {
    rank: number;
    is_potential_trap: boolean;
    similarity_score: number;
    keyword_overlap: number;
    warning: string | null;
  }[];
  explanation: string;
}

export interface DenseSearchResult {
  content: string;
  index: number;
  score: number;
}

export interface HybridCompareResponse {
  query: string;
  dense_results: SearchResult[];
  sparse_results: SearchResult[];
  hybrid_results: SearchResult[];
  delta_analysis: DeltaAnalysis[];
  explanation: {
    rrf_k: number;
    formula: string;
    benefit: string;
  };
}
