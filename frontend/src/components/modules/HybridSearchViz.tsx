"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "../GlassPanel";
import { searchCompare } from "@/lib/api";
import { FuturisticLoader } from "../ui/FuturisticLoader";
import { ChunkPreviewTooltip } from "../ui/Tooltip";
import type { CompareResponse, DeltaAnalysis, EmbeddingModelId, HybridCompareResponse } from "@/types";

const RRF_K = 60;

interface HybridSearchPersistedState {
  query: string;
  results: HybridCompareResponse | null;
}

interface HybridSearchVizProps {
  active: boolean;
  useApi?: boolean;
  isIndexed?: boolean;
  indexedModel?: EmbeddingModelId;
  persistedState?: HybridSearchPersistedState;
  onStateChange?: (state: HybridSearchPersistedState) => void;
}

function ChangeIndicator({ change }: { change: DeltaAnalysis["change"] }) {
  const config = {
    PROMOTED: { icon: "↑", color: "text-green-400", bg: "bg-green-500/20", label: "PROMOTED" },
    DEMOTED: { icon: "↓", color: "text-red-400", bg: "bg-red-500/20", label: "DEMOTED" },
    NEW: { icon: "★", color: "text-cyan-400", bg: "bg-cyan-500/20", label: "NEW" },
    UNCHANGED: { icon: "=", color: "text-gray-400", bg: "bg-gray-500/20", label: "SAME" },
  };
  const c = config[change] || config.UNCHANGED;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold ${c.color} ${c.bg}`}>
      {c.icon} {c.label}
    </span>
  );
}

function RRFExplainer() {
  return (
    <div className="rounded-2xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-900/20 to-gray-900/50 p-6 space-y-5">
      <h4 className="text-lg font-bold text-purple-400 flex items-center gap-3">
        <span className="text-2xl">📐</span> Reciprocal Rank Fusion (RRF) Algorithm
      </h4>
      <div className="space-y-4">
        <motion.div 
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className="rounded-xl bg-gray-900/70 border border-purple-500/30 p-5 font-mono text-xl text-cyan-400 text-center"
        >
          RRF_score = Σ ( 1 / (k + rank) )
        </motion.div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-gray-800/60 border border-purple-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400 text-base">k =</span>
              <span className="text-2xl text-purple-400 font-bold">{RRF_K}</span>
            </div>
            <p className="text-sm text-gray-500">Smoothing constant to prevent over-weighting top results</p>
          </div>
          <div className="rounded-xl bg-gray-800/60 border border-purple-500/20 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400 text-base">rank =</span>
              <span className="text-xl text-purple-400 font-bold">position</span>
            </div>
            <p className="text-sm text-gray-500">Position in the result list (1-indexed)</p>
          </div>
        </div>
        
        <div className="rounded-xl bg-cyan-900/20 border border-cyan-500/30 p-4">
          <h5 className="text-sm font-bold text-cyan-400 mb-2">How It Works</h5>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 mt-0.5">▸</span>
              Each retriever (dense, sparse) produces a ranked list
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 mt-0.5">▸</span>
              RRF calculates 1/(k+rank) for each document in each list
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 mt-0.5">▸</span>
              Final score is the sum across all lists
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500 mt-0.5">▸</span>
              Documents appearing in both lists get boosted
            </li>
          </ul>
        </div>
        
        <div className="rounded-xl bg-purple-900/20 border border-purple-500/30 p-4">
          <h5 className="text-sm font-bold text-purple-400 mb-3">Example Calculation</h5>
          <div className="font-mono text-sm space-y-2">
            <p className="text-gray-400">Document in Dense rank #2, Sparse rank #3:</p>
            <p className="text-cyan-400">RRF = 1/(60+2) + 1/(60+3) = 0.0161 + 0.0159 = <span className="text-green-400 font-bold">0.0320</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HybridSearchViz({ 
  active, 
  useApi = true,
  isIndexed = false,
  indexedModel = "azure-openai",
  persistedState,
  onStateChange,
}: HybridSearchVizProps) {
  const [query, setQuery] = useState(persistedState?.query ?? "secure API authentication");
  const [compareData, setCompareData] = useState<CompareResponse | null>(persistedState?.results ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"compare" | "results" | "formula">("compare");

  // Sync state changes to parent for persistence
  useEffect(() => {
    onStateChange?.({ query, results: compareData });
  }, [query, compareData]); // eslint-disable-line react-hooks/exhaustive-deps

  const runComparison = async () => {
    if (!isIndexed) {
      setError("No data indexed. Please complete Steps 1 and 2 first.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await searchCompare(query, 5, indexedModel);
      setCompareData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Comparison search failed");
    } finally {
      setLoading(false);
    }
  };

  const promotedCount = compareData?.delta_analysis?.filter(d => d.change === "PROMOTED" || d.change === "NEW").length || 0;
  const demotedCount = compareData?.delta_analysis?.filter(d => d.change === "DEMOTED").length || 0;

  const conceptInfo = {
    title: "Hybrid Search & RRF",
    description: "Combining dense (semantic) and sparse (keyword) search for better retrieval.",
    details: [
      "Dense search: Uses embeddings to find semantically similar content",
      "Sparse search (BM25): Uses keyword matching with TF-IDF weights",
      "RRF (Reciprocal Rank Fusion): Combines rankings from multiple retrievers",
      "Formula: RRF_score = Σ(1 / (k + rank)) where k=60",
      "Promoted results: Chunks boosted by hybrid fusion",
      "Demoted results: Chunks that dropped in hybrid ranking"
    ]
  };

  return (
    <GlassPanel title="Module E: Hybrid Search & RRF Fusion Analysis" active={active} conceptInfo={conceptInfo}>
      <div className="space-y-6">
        {!isIndexed ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-amber-900/20 to-gray-900/50 p-8 text-center"
          >
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="mb-4 text-5xl"
            >
              ⚠️
            </motion.div>
            <h3 className="text-xl font-bold text-amber-400 mb-3">No Data Indexed</h3>
            <p className="text-base text-gray-400 max-w-md mx-auto">
              Complete Step 1 (Chunking) and Step 2 (Embeddings) to index your data before comparing search methods.
            </p>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center gap-4 rounded-xl border border-green-500/40 bg-green-900/20 p-4">
              <div className="relative">
                <div className="h-4 w-4 rounded-full bg-green-400" />
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-full bg-green-400"
                />
              </div>
              <span className="text-base text-green-400">
                Ready to compare search methods using <strong className="font-mono">{indexedModel}</strong>
              </span>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-gray-900/50 p-5">
              <label className="mb-3 block text-sm font-bold text-purple-400 uppercase tracking-wider">
                🔄 Hybrid Search Query
              </label>
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runComparison()}
                    className="w-full rounded-xl border-2 border-purple-500/30 bg-gray-800/80 px-5 py-4 text-base focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30 transition-all"
                    placeholder="Enter query to compare dense vs hybrid search..."
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    Press Enter ↵
                  </div>
                </div>
                <button
                  onClick={runComparison}
                  disabled={loading}
                  className="button-cyber px-8 py-4 text-base disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, rgba(147, 51, 234, 0.9) 0%, rgba(59, 130, 246, 0.7) 100%)" }}
                >
                  {loading ? (
                    <span className="flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      ANALYZING...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span>⚖️</span> COMPARE METHODS
                    </span>
                  )}
                </button>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-4">
            <div className="flex items-center gap-2">
              <span className="text-red-400">✕</span>
              <span className="text-sm text-red-400">{error}</span>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {compareData && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-4 gap-3">
                <div className="rounded-lg border border-cyan-500/20 bg-gray-900/50 p-3 text-center">
                  <div className="text-2xl font-bold text-cyan-400">{compareData.dense_results?.length || 0}</div>
                  <div className="text-xs text-gray-500">Dense Results</div>
                </div>
                <div className="rounded-lg border border-orange-500/20 bg-gray-900/50 p-3 text-center">
                  <div className="text-2xl font-bold text-orange-400">{compareData.sparse_results?.length || 0}</div>
                  <div className="text-xs text-gray-500">Sparse Results</div>
                </div>
                <div className="rounded-lg border border-green-500/20 bg-gray-900/50 p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{promotedCount}</div>
                  <div className="text-xs text-gray-500">Promoted by RRF</div>
                </div>
                <div className="rounded-lg border border-red-500/20 bg-gray-900/50 p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{demotedCount}</div>
                  <div className="text-xs text-gray-500">Demoted by RRF</div>
                </div>
              </div>

              <div className="flex gap-2 border-b border-gray-700 pb-2">
                {[
                  { id: "compare", label: "Delta Analysis", icon: "📊" },
                  { id: "results", label: "Side-by-Side", icon: "⚖️" },
                  { id: "formula", label: "RRF Formula", icon: "📐" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setViewMode(tab.id as typeof viewMode)}
                    className={`flex items-center gap-2 rounded px-4 py-2 text-xs font-medium transition ${
                      viewMode === tab.id
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {viewMode === "compare" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-4"
                >
                  <div className="overflow-hidden rounded-lg border border-cyan-500/30">
                    <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/40 px-4 py-3 flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                        <span>🔄</span> RRF Rank Change Analysis
                      </h4>
                      <span className="text-xs text-gray-400">
                        Showing how RRF changed rankings vs Dense-only search
                      </span>
                    </div>
                    <div className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto custom-scrollbar">
                      {compareData.delta_analysis?.map((delta, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex items-start gap-4 p-4 hover:bg-gray-800/30 ${
                            delta.change === "PROMOTED" || delta.change === "NEW" ? "bg-green-900/10" :
                            delta.change === "DEMOTED" ? "bg-red-900/10" : ""
                          }`}
                        >
                          <div className="flex-shrink-0 w-20 text-center">
                            <div className="text-3xl font-bold text-green-400">
                              #{delta.hybrid_rank}
                            </div>
                            <div className="text-xs text-green-400/70">HYBRID</div>
                          </div>
                          
                          <div className="flex-shrink-0 flex items-center justify-center w-12">
                            <div className={`text-2xl ${
                              delta.change === "PROMOTED" ? "text-green-400" :
                              delta.change === "DEMOTED" ? "text-red-400" :
                              delta.change === "NEW" ? "text-cyan-400" :
                              "text-gray-500"
                            }`}>
                              {delta.change === "PROMOTED" ? "←" :
                               delta.change === "DEMOTED" ? "→" :
                               delta.change === "NEW" ? "★" : "="}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 w-20 text-center">
                            {delta.dense_rank !== null ? (
                              <>
                                <div className="text-3xl font-bold text-blue-400">
                                  #{delta.dense_rank}
                                </div>
                                <div className="text-xs text-blue-400/70">DENSE</div>
                              </>
                            ) : (
                              <>
                                <div className="text-xl text-gray-500">—</div>
                                <div className="text-xs text-gray-500">Not in Top</div>
                              </>
                            )}
                          </div>
                          
                          <div className="min-w-0 flex-1 border-l border-gray-700 pl-4">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <ChangeIndicator change={delta.change} />
                              <span className="text-xs text-gray-400">
                                {delta.change_detail}
                              </span>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-2">
                              {delta.content}
                            </p>
                            <div className="mt-2 flex gap-4 text-xs">
                              <span className="rounded bg-green-500/10 px-2 py-1 text-green-300">
                                Hybrid: {delta.hybrid_score?.toFixed(4) || "N/A"}
                              </span>
                              {delta.dense_score !== null && (
                                <span className="rounded bg-blue-500/10 px-2 py-1 text-blue-300">
                                  Dense: {delta.dense_score.toFixed(3)}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border border-green-500/30 bg-green-900/10 p-4">
                      <h5 className="mb-3 text-xs font-bold uppercase text-green-400 flex items-center gap-2">
                        <span>✓</span> RRF Improvements
                      </h5>
                      <ul className="space-y-2">
                        {compareData.delta_analysis
                          ?.filter((d) => d.change === "PROMOTED" || d.change === "NEW")
                          .slice(0, 4)
                          .map((d, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs">
                              <span className="text-green-400 mt-0.5">
                                {d.change === "NEW" ? "★" : "↑"}
                              </span>
                              <span className="text-gray-300">
                                {d.content.slice(0, 60)}...
                              </span>
                            </li>
                          )) || (
                          <li className="text-gray-500">No promotions in this search</li>
                        )}
                      </ul>
                    </div>

                    <div className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-4">
                      <h5 className="mb-3 text-xs font-bold uppercase text-amber-400 flex items-center gap-2">
                        <span>💡</span> Why RRF Works
                      </h5>
                      <p className="text-xs text-gray-300 mb-2">
                        {compareData.explanation?.benefit || "RRF combines the strengths of semantic and keyword search."}
                      </p>
                      <div className="rounded bg-gray-900/50 p-2 font-mono text-xs text-cyan-400">
                        {compareData.explanation?.formula || "Score = Σ(1/(k+rank))"}
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        k = {compareData.explanation?.rrf_k || RRF_K}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {viewMode === "results" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid gap-5 lg:grid-cols-3"
                >
                  {[
                    { title: "Dense (Semantic)", color: "blue", icon: "🧠", description: "Vector similarity", results: compareData.dense_results },
                    { title: "Sparse (BM25)", color: "orange", icon: "📝", description: "Keyword matching", results: compareData.sparse_results },
                    { title: "Hybrid (RRF)", color: "green", icon: "🔄", description: "Fused ranking", results: compareData.hybrid_results },
                  ].map((column) => {
                    const colorClasses = {
                      blue: { border: "border-blue-500/40", bg: "bg-blue-900/10", text: "text-blue-400", resultBg: "bg-blue-900/20", bar: "bg-gradient-to-r from-blue-600 to-blue-400" },
                      orange: { border: "border-orange-500/40", bg: "bg-orange-900/10", text: "text-orange-400", resultBg: "bg-orange-900/20", bar: "bg-gradient-to-r from-orange-600 to-orange-400" },
                      green: { border: "border-green-500/40", bg: "bg-green-900/10", text: "text-green-400", resultBg: "bg-green-900/20", bar: "bg-gradient-to-r from-green-600 to-green-400" },
                    }[column.color] || { border: "border-gray-500/30", bg: "bg-gray-900/10", text: "text-gray-400", resultBg: "bg-gray-900/20", bar: "bg-gray-500" };

                    return (
                      <div key={column.title} className={`rounded-2xl border-2 ${colorClasses.border} ${colorClasses.bg} p-5 backdrop-blur-sm`}>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{column.icon}</span>
                          <div>
                            <h4 className={`text-base font-bold uppercase tracking-wider ${colorClasses.text}`}>
                              {column.title}
                            </h4>
                            <p className="text-xs text-gray-500">{column.description}</p>
                          </div>
                        </div>
                        <div className="space-y-3 mt-4">
                          {column.results?.length > 0 ? (
                            column.results.map((r, i) => (
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
                                  className={`rounded-xl border border-gray-700/60 ${colorClasses.resultBg} p-4 cursor-pointer hover:border-cyan-500/50 transition-all group`}
                                >
                                  <div className={`flex justify-between items-center ${colorClasses.text} mb-2`}>
                                    <span className="font-bold text-lg">#{r.rank}</span>
                                    <span className="font-mono text-base font-bold">{r.score?.toFixed(4) || "N/A"}</span>
                                  </div>
                                  <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden mb-3">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min((r.score || 0) * 100, 100)}%` }}
                                      transition={{ duration: 0.5, ease: "easeOut" }}
                                      className={`h-full rounded-full ${colorClasses.bar}`}
                                    />
                                  </div>
                                  <p className="text-sm text-gray-300 line-clamp-2">{r.text}</p>
                                  <p className="text-xs text-gray-500 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    👆 click to view full content
                                  </p>
                                </motion.div>
                              </ChunkPreviewTooltip>
                            ))
                          ) : (
                            <div className="text-center py-8 border border-dashed border-gray-700 rounded-xl">
                              <span className="text-4xl opacity-30">∅</span>
                              <p className="text-sm text-gray-500 mt-2">No results</p>
                            </div>
                          )}
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-700/50">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Retrieved</span>
                            <span className={`font-mono font-bold ${colorClasses.text}`}>{column.results?.length || 0} chunks</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {viewMode === "formula" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <RRFExplainer />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isIndexed && !compareData && !loading && !error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border-2 border-dashed border-gray-700 bg-gray-800/20 p-12 text-center"
          >
            <motion.div 
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="mb-4 text-6xl opacity-60 inline-block"
            >
              🔄
            </motion.div>
            <h4 className="text-xl font-bold text-gray-300 mb-2">Ready to Compare Search Methods</h4>
            <p className="text-base text-gray-500 max-w-md mx-auto">
              Enter a query above to see how RRF (Reciprocal Rank Fusion) combines semantic and keyword search for better results.
            </p>
            <div className="mt-6 flex justify-center gap-6">
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-gray-500">Dense</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                <span className="text-gray-500">Sparse</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-gray-500">Hybrid RRF</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </GlassPanel>
  );
}
