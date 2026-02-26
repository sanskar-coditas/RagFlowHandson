"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "../GlassPanel";
import { trapDemo } from "@/lib/api";
import { FuturisticLoader } from "../ui/FuturisticLoader";
import { ChunkPreviewTooltip } from "../ui/Tooltip";
import type { TrapDemoResponse, EmbeddingModelId } from "@/types";

const DEFAULT_TRAP_QUERY = "How to secure an API";

interface ShortcomingPersistedState {
  query: string;
  results: TrapDemoResponse | null;
}

interface ShortcomingVizProps {
  active: boolean;
  isIndexed?: boolean;
  indexedModel?: EmbeddingModelId;
  persistedState?: ShortcomingPersistedState;
  onStateChange?: (state: ShortcomingPersistedState) => void;
}

function ScoreBar({ score, maxScore = 1, color }: { score: number; maxScore?: number; color: string }) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  return (
    <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`h-full rounded-full ${color}`}
      />
    </div>
  );
}

export function ShortcomingViz({ 
  active, 
  isIndexed = false,
  indexedModel = "azure-openai",
  persistedState,
  onStateChange,
}: ShortcomingVizProps) {
  const [query, setQuery] = useState(persistedState?.query ?? DEFAULT_TRAP_QUERY);
  const [results, setResults] = useState<TrapDemoResponse | null>(persistedState?.results ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state changes to parent for persistence
  useEffect(() => {
    onStateChange?.({ query, results });
  }, [query, results]); // eslint-disable-line react-hooks/exhaustive-deps

  const runTrapDemo = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await trapDemo(query, indexedModel);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to run trap demo");
    } finally {
      setLoading(false);
    }
  };

  const ResultColumn = ({ 
    title, 
    color, 
    results: columnResults,
    icon,
    description
  }: { 
    title: string; 
    color: string; 
    results: Array<{ text: string; score: number; rank: number }>;
    icon: string;
    description: string;
  }) => {
    const colorClasses = {
      blue: { border: "border-blue-500/40", bg: "bg-blue-900/10", text: "text-blue-400", badge: "bg-blue-500/30", bar: "bg-gradient-to-r from-blue-600 to-blue-400" },
      orange: { border: "border-orange-500/40", bg: "bg-orange-900/10", text: "text-orange-400", badge: "bg-orange-500/30", bar: "bg-gradient-to-r from-orange-600 to-orange-400" },
      green: { border: "border-green-500/40", bg: "bg-green-900/10", text: "text-green-400", badge: "bg-green-500/30", bar: "bg-gradient-to-r from-green-600 to-green-400" },
    }[color] || { border: "border-gray-500/30", bg: "bg-gray-900/20", text: "text-gray-400", badge: "bg-gray-500/20", bar: "bg-gray-500" };

    return (
      <div className={`rounded-2xl border-2 ${colorClasses.border} ${colorClasses.bg} p-5 flex flex-col h-full backdrop-blur-sm`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{icon}</span>
          <div>
            <h4 className={`text-base font-bold uppercase tracking-wider ${colorClasses.text}`}>
              {title}
            </h4>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        
        <div className="space-y-3 flex-1 mt-4">
          {columnResults.length > 0 ? (
            columnResults.map((r, i) => (
              <ChunkPreviewTooltip
                key={i}
                content={r.text}
                index={r.rank - 1}
                wordCount={r.text.split(/\s+/).length}
                charCount={r.text.length}
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="rounded-xl border border-gray-700/60 bg-gray-800/60 p-4 cursor-pointer hover:border-cyan-500/50 hover:bg-gray-800/80 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-lg ${colorClasses.badge} px-3 py-1.5 text-base font-mono font-bold ${colorClasses.text}`}>
                        #{r.rank}
                      </span>
                      <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        👆 click to expand
                      </span>
                    </div>
                    <span className={`font-mono text-xl font-bold ${colorClasses.text}`}>
                      {r.score.toFixed(3)}
                    </span>
                  </div>
                  <ScoreBar score={r.score} color={colorClasses.bar} />
                  <p className="text-sm text-gray-300 leading-relaxed mt-3 line-clamp-2">
                    {r.text}
                  </p>
                </motion.div>
              </ChunkPreviewTooltip>
            ))
          ) : (
            <div className="text-center py-12 border border-dashed border-gray-700 rounded-xl">
              <span className="text-5xl opacity-30">∅</span>
              <p className="text-base text-gray-500 mt-4">No results found</p>
            </div>
          )}
        </div>
        
        <div className="mt-5 pt-4 border-t border-gray-700/50">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">Retrieved</span>
            <span className={`font-mono text-lg font-bold ${colorClasses.text}`}>
              {columnResults.length} chunks
            </span>
          </div>
        </div>
      </div>
    );
  };

  const conceptInfo = {
    title: "Similarity ≠ Relevance",
    description: "Understanding why high semantic similarity doesn't always mean relevant results.",
    details: [
      "Embeddings capture semantic meaning, not factual relevance",
      "Documents can be topically similar but not answer the query",
      "Dense search alone may miss keyword-exact matches",
      "Hybrid search (dense + sparse) helps mitigate this issue",
      "This is why we need both semantic and lexical matching"
    ]
  };

  return (
    <GlassPanel title="Module D: Similarity vs Relevance — The Trap Analysis" active={active} conceptInfo={conceptInfo}>
      <div className="space-y-6">
        {/* Warning Banner */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-900/20 via-orange-900/20 to-red-900/20 p-5"
        >
          <div className="flex items-start gap-4">
            <div className="relative">
              <span className="text-4xl">⚠️</span>
              <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 rounded-full bg-amber-500/20 blur-xl"
              />
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-bold text-amber-400 mb-2">CRITICAL INSIGHT: The Similarity Trap</h4>
              <p className="text-base text-gray-300 leading-relaxed">
                High semantic similarity <span className="text-amber-400 font-bold">≠</span> actual relevance. 
                Documents can be <span className="text-cyan-400">topically similar</span> but fail to answer your query.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span className="text-gray-400">Dense = Semantic meaning</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                  <span className="text-gray-400">Sparse = Exact keywords</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Query Input */}
        <div className="rounded-2xl border border-cyan-500/30 bg-gray-900/50 p-5">
          <label className="mb-3 block text-sm font-bold text-cyan-400 uppercase tracking-wider">
            🔍 Test Query Input
          </label>
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runTrapDemo()}
                placeholder="Enter query to test similarity vs relevance..."
                className="w-full rounded-xl border-2 border-cyan-500/30 bg-gray-800/80 px-5 py-4 text-base text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                Press Enter ↵
              </div>
            </div>
            <button
              onClick={runTrapDemo}
              disabled={loading}
              className="button-cyber px-8 py-4 text-base font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-3">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ANALYZING...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>🎯</span> RUN ANALYSIS
                </span>
              )}
            </button>
          </div>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-xl border-2 border-red-500/50 bg-red-500/10 p-5"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">❌</span>
              <span className="text-base font-medium text-red-400">{error}</span>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-cyan-500/30 bg-gray-900/50 p-8"
            >
              <div className="flex flex-col items-center justify-center gap-4">
                <FuturisticLoader variant="circuit" size="lg" />
                <div className="text-center">
                  <p className="text-lg font-bold text-cyan-400">Executing Trap Analysis</p>
                  <p className="text-sm text-gray-500 mt-1">Comparing dense, sparse, and hybrid search methods...</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {results && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Query Info Bar */}
              <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-gray-900/60 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl text-cyan-400">🔍</span>
                  <div>
                    <span className="text-sm text-gray-500">Query:</span>
                    <span className="ml-2 text-lg font-bold text-cyan-400">&quot;{results.query}&quot;</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2">
                  <span className="text-sm text-gray-500">Model:</span>
                  <span className="text-sm font-mono font-bold text-green-400">{indexedModel}</span>
                </div>
              </div>

              {/* Trap Detection Panel */}
              {results.trap_analysis && results.trap_analysis.length > 0 && (
                <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-900/20 to-gray-900/50 p-5">
                  <h4 className="mb-4 text-base font-bold uppercase tracking-wider text-red-400 flex items-center gap-3">
                    <motion.span 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="text-2xl"
                    >
                      🚨
                    </motion.span>
                    TRAP DETECTION SCANNER
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {results.trap_analysis.map((analysis, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`rounded-xl p-4 ${
                          analysis.is_potential_trap
                            ? "border-2 border-red-500/60 bg-red-900/30"
                            : "border border-green-500/40 bg-green-900/10"
                        }`}
                      >
                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-lg font-bold ${analysis.is_potential_trap ? "text-red-400" : "text-green-400"}`}>
                              Rank #{analysis.rank}
                            </span>
                            {analysis.is_potential_trap ? (
                              <motion.span 
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="rounded-lg bg-red-500/30 px-3 py-1 text-sm font-bold text-red-400 border border-red-500/50"
                              >
                                ⚠ TRAP DETECTED
                              </motion.span>
                            ) : (
                              <span className="rounded-lg bg-green-500/30 px-3 py-1 text-sm font-bold text-green-400 border border-green-500/50">
                                ✓ VALID
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-center">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Similarity</div>
                            <div className="font-mono text-xl font-bold text-amber-400 mt-1">
                              {analysis.similarity_score.toFixed(3)}
                            </div>
                          </div>
                          <div className="rounded-xl bg-cyan-500/10 border border-cyan-500/30 p-3 text-center">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">Keyword Match</div>
                            <div className="font-mono text-xl font-bold text-cyan-400 mt-1">
                              {(analysis.keyword_overlap * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        {analysis.warning && (
                          <p className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3 mt-3 border border-red-500/30">
                            ⚠ {analysis.warning}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Three Column Results */}
              <div className="grid gap-5 lg:grid-cols-3">
                <ResultColumn
                  title="Dense Search"
                  color="blue"
                  icon="🧠"
                  description="Semantic similarity matching"
                  results={results.dense_results || []}
                />
                <ResultColumn
                  title="Sparse Search"
                  color="orange"
                  icon="📝"
                  description="BM25 keyword matching"
                  results={results.sparse_results || []}
                />
                <ResultColumn
                  title="Hybrid RRF"
                  color="green"
                  icon="🔄"
                  description="Reciprocal rank fusion"
                  results={results.hybrid_results || []}
                />
              </div>

              {/* Insight Panel */}
              {results.explanation && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-5"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">💡</span>
                    <div>
                      <h4 className="text-lg font-bold text-cyan-400 mb-2">Analysis Insight</h4>
                      <p className="text-base text-gray-300 leading-relaxed">
                        {results.explanation}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Ready State */}
        {!results && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border-2 border-dashed border-gray-700 bg-gray-800/20 p-12 text-center"
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-4 text-6xl opacity-60"
            >
              🎯
            </motion.div>
            <h4 className="text-xl font-bold text-gray-300 mb-2">Ready for Trap Analysis</h4>
            <p className="text-base text-gray-500 max-w-md mx-auto">
              Enter a query above to compare semantic similarity vs actual relevance across different search methods.
            </p>
            <div className="mt-6 flex justify-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span> Dense
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Sparse
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Hybrid
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </GlassPanel>
  );
}
