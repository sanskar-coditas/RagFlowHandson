"use client";

import { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "../GlassPanel";
import { searchDense } from "@/lib/api";
import { InfoTooltip, ChunkPreviewTooltip } from "../ui/Tooltip";
import { FuturisticLoader } from "../ui/FuturisticLoader";
import type { SimilarityMetric, EmbeddingModelId, DenseSearchResult } from "@/types";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const METRICS: { 
  id: SimilarityMetric; 
  label: string; 
  description: string; 
  formula: string;
  details: string[];
}[] = [
  { 
    id: "cosine", 
    label: "Cosine Similarity", 
    description: "Measures angle between vectors (0-1)",
    formula: "cos(θ) = A·B / (||A|| × ||B||)",
    details: [
      "Ignores vector magnitude, focuses on direction",
      "Range: 0 (orthogonal) to 1 (identical direction)",
      "Best for: Most text similarity use cases",
      "Not affected by document length"
    ]
  },
  { 
    id: "dot_product", 
    label: "Dot Product", 
    description: "Sum of element-wise products",
    formula: "A·B = Σ(Ai × Bi)",
    details: [
      "Considers both direction and magnitude",
      "Range: -∞ to +∞ (unbounded)",
      "Best for: When vector length matters",
      "Faster computation than cosine"
    ]
  },
  { 
    id: "euclidean", 
    label: "Euclidean Distance", 
    description: "Straight-line distance in vector space",
    formula: "d = √Σ(Ai - Bi)²",
    details: [
      "Lower distance = more similar",
      "Range: 0 to +∞",
      "Best for: Clustering and k-NN",
      "Sensitive to vector magnitude"
    ]
  },
];

interface SimilaritySearchPersistedState {
  query: string;
  results: DenseSearchResult[] | null;
}

interface SimilaritySearchVizProps {
  active: boolean;
  useApi?: boolean;
  isIndexed?: boolean;
  indexedModel?: EmbeddingModelId;
  chunkCount?: number;
  persistedState?: SimilaritySearchPersistedState;
  onStateChange?: (state: SimilaritySearchPersistedState) => void;
}

export function SimilaritySearchViz({
  active,
  useApi = true,
  isIndexed = false,
  indexedModel = "azure-openai",
  chunkCount = 0,
  persistedState,
  onStateChange,
}: SimilaritySearchVizProps) {
  const [query, setQuery] = useState(persistedState?.query ?? "How to secure an API");
  const [metric, setMetric] = useState<SimilarityMetric>("cosine");
  const [results, setResults] = useState<{ text: string; score: number; index?: number }[]>(
    persistedState?.results?.map((r, i) => ({ text: r.content, score: r.score, index: r.index ?? i })) ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTime, setSearchTime] = useState<number | null>(null);

  // Sync state changes to parent for persistence
  useEffect(() => {
    const persistedResults: DenseSearchResult[] | null = results.length > 0 
      ? results.map((r, i) => ({ content: r.text, score: r.score, index: r.index ?? i }))
      : null;
    onStateChange?.({ query, results: persistedResults });
  }, [query, results]); // eslint-disable-line react-hooks/exhaustive-deps

  const runSearch = async () => {
    if (!isIndexed) {
      setError("No data indexed. Please complete Step 2 first.");
      return;
    }
    setError(null);
    setLoading(true);
    setSearchTime(null);
    const startTime = Date.now();
    try {
      if (useApi) {
        const res = await searchDense(query, 5, metric, indexedModel);
        setResults(res.results.map((r, i) => ({ ...r, index: i })));
        setSearchTime(Date.now() - startTime);
      } else {
        setResults([
          { text: "Secure your API with authentication and rate limiting.", score: 0.92, index: 0 },
          { text: "API security best practices include HTTPS and tokens.", score: 0.88, index: 1 },
          { text: "Use OAuth2 or API keys for access control.", score: 0.85, index: 2 },
        ]);
        setSearchTime(Date.now() - startTime);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectedMetric = METRICS.find(m => m.id === metric);

  const plotData = useMemo(() => {
    if (results.length === 0) return null;
    const scores = results.map(r => r.score);
    const maxScore = Math.max(...scores);
    
    return {
      data: [
        {
          x: results.map((_, i) => `Chunk ${i + 1}`),
          y: scores,
          type: "bar" as const,
          marker: {
            color: scores.map(s => {
              const ratio = s / maxScore;
              if (ratio > 0.8) return "#00d4ff";
              if (ratio > 0.6) return "#0099cc";
              if (ratio > 0.4) return "#006699";
              return "#003366";
            }),
            line: { color: "#00d4ff", width: 1 },
          },
          text: scores.map(s => s.toFixed(3)),
          textposition: "outside" as const,
          textfont: { color: "#00d4ff", size: 11 },
        },
      ],
      layout: {
        margin: { t: 30, r: 20, b: 60, l: 50 },
        paper_bgcolor: "rgba(0,0,0,0)",
        plot_bgcolor: "rgba(0,0,0,0)",
        font: { color: "#e5e7eb", size: 11 },
        xaxis: { 
          title: { text: "Retrieved Chunks", font: { color: "#9ca3af" } },
          tickangle: -45,
          gridcolor: "rgba(255,255,255,0.05)",
        },
        yaxis: { 
          title: { text: "Similarity Score", font: { color: "#9ca3af" } },
          range: [0, 1.1],
          gridcolor: "rgba(255,255,255,0.1)",
        },
        height: 280,
        bargap: 0.3,
      },
      config: { responsive: true, displayModeBar: false },
    };
  }, [results]);

  const conceptInfo = {
    title: "Dense Vector Search",
    description: "Finding similar documents by comparing their embedding vectors in high-dimensional space.",
    details: [
      "Query text is embedded using the same model as indexed documents",
      "Similarity is computed between query vector and all stored vectors",
      "Results ranked by similarity score (higher = more similar)",
      "Different metrics capture different aspects of similarity",
      "Approximate Nearest Neighbor (ANN) algorithms enable fast search at scale"
    ]
  };

  return (
    <GlassPanel title="Module C: Dense Similarity Search" active={active} conceptInfo={conceptInfo}>
      <div className="space-y-4">
        {!isIndexed ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-6 text-center">
            <div className="mb-3 text-4xl">⚠️</div>
            <h3 className="text-lg font-bold text-amber-400 mb-2">No Data Indexed</h3>
            <p className="text-sm text-gray-400">
              Complete Step 1 (Chunking) and Step 2 (Embeddings) to index your data before searching.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-green-500/30 bg-green-900/20 p-3">
              <div className="h-3 w-3 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm text-green-400">
                <strong>{chunkCount}</strong> chunks indexed with <strong>{indexedModel}</strong>
              </span>
            </div>

            <div>
              <label className="mb-2 block text-xs text-gray-400 uppercase tracking-wider">Search Query</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                className="w-full rounded-lg border border-cyan-500/30 bg-gray-900/50 px-4 py-3 text-sm focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                placeholder="Enter search query..."
              />
            </div>

            <div>
              <label className="mb-2 block text-xs text-gray-400 uppercase tracking-wider">Distance Metric</label>
              <div className="grid grid-cols-3 gap-2">
                {METRICS.map((m) => (
                  <InfoTooltip
                    key={m.id}
                    title={m.label}
                    description={m.description}
                    details={m.details}
                  >
                    <button
                      onClick={() => setMetric(m.id)}
                      className={`rounded-lg border p-3 text-left transition w-full ${
                        metric === m.id
                          ? "border-cyan-400 bg-cyan-500/20 text-cyan-400"
                          : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                      }`}
                    >
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="mt-1 text-xs text-gray-500">{m.description}</div>
                    </button>
                  </InfoTooltip>
                ))}
              </div>
            </div>

            {selectedMetric && (
              <div className="rounded-lg border border-cyan-500/20 bg-gray-900/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400 uppercase">Formula</span>
                  <span className="font-mono text-sm text-cyan-400">{selectedMetric.formula}</span>
                </div>
              </div>
            )}

            <button
              onClick={runSearch}
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 button-cyber"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                  SEARCHING VECTOR SPACE...
                </span>
              ) : (
                "EXECUTE DENSE SEARCH"
              )}
            </button>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {searchTime !== null && (
                <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-gray-900/50 p-3">
                  <span className="text-xs text-gray-400">Search completed</span>
                  <span className="font-mono text-sm text-cyan-400">{searchTime}ms</span>
                </div>
              )}

              {plotData && Plot && (
                <div className="rounded-lg border border-cyan-500/20 bg-gray-900/50 p-3">
                  <h4 className="mb-2 text-xs text-gray-400 uppercase tracking-wider">Score Distribution</h4>
                  <Plot
                    data={plotData.data}
                    layout={plotData.layout}
                    config={plotData.config}
                    style={{ width: "100%" }}
                  />
                </div>
              )}

              <div className="rounded-xl border border-cyan-500/20 bg-gray-900/50 p-4">
                <h4 className="mb-4 text-sm font-bold text-gray-300 uppercase tracking-wider">
                  Retrieved Chunks ({results.length})
                </h4>
                <div className="space-y-3">
                  {results.map((r, i) => (
                    <ChunkPreviewTooltip
                      key={i}
                      content={r.text}
                      index={i}
                      wordCount={r.text.split(/\s+/).length}
                      charCount={r.text.length}
                    >
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 cursor-pointer hover:border-cyan-500/50 hover:bg-gray-800/80 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="rounded-lg bg-cyan-500/20 px-3 py-1 text-sm font-mono font-bold text-cyan-400">
                                #{i + 1}
                              </span>
                              <span className={`rounded-lg px-3 py-1 text-sm font-bold ${
                                r.score > 0.8 ? "bg-green-500/20 text-green-400" :
                                r.score > 0.6 ? "bg-yellow-500/20 text-yellow-400" :
                                "bg-red-500/20 text-red-400"
                              }`}>
                                {(r.score * 100).toFixed(1)}%
                              </span>
                              <span className="text-xs text-gray-500">👆 click to view full content</span>
                            </div>
                            <p className="text-base text-gray-300 leading-relaxed line-clamp-2">
                              {r.text}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-mono text-2xl font-bold text-cyan-400">
                              {r.score.toFixed(4)}
                            </div>
                            <div className="text-sm text-gray-500">score</div>
                          </div>
                        </div>
                      </motion.div>
                    </ChunkPreviewTooltip>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isIndexed && results.length === 0 && !loading && !error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border-2 border-dashed border-gray-700 bg-gray-800/20 p-12 text-center"
          >
            <motion.div 
              animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-4 text-6xl opacity-60"
            >
              🔍
            </motion.div>
            <h4 className="text-xl font-bold text-gray-300 mb-2">Ready to Search Vector Space</h4>
            <p className="text-base text-gray-500 max-w-md mx-auto">
              Enter a query and click &quot;Execute Dense Search&quot; to find semantically similar chunks using {metric === "cosine" ? "cosine similarity" : metric === "dot_product" ? "dot product" : "Euclidean distance"}.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-sm text-cyan-500/70 bg-cyan-500/10 px-4 py-2 rounded-lg">
              <span>📊</span> {chunkCount} vectors indexed
            </div>
          </motion.div>
        )}
      </div>
    </GlassPanel>
  );
}
