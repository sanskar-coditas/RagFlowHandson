"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "../GlassPanel";
import { ragAnswer } from "@/lib/api";
import { InfoTooltip } from "../ui/Tooltip";
import type { RAGResponse, SearchType, FormatStyle, EmbeddingModelId } from "@/types";

interface LLMAnswerPersistedState {
  query: string;
  results: RAGResponse | null;
}

interface LLMAnswerVizProps {
  active: boolean;
  isIndexed?: boolean;
  indexedModel?: EmbeddingModelId;
  persistedState?: LLMAnswerPersistedState;
  onStateChange?: (state: LLMAnswerPersistedState) => void;
}

function ConfidenceBadge({ confidence }: { confidence: RAGResponse["confidence"] }) {
  const config = {
    HIGH: { color: "text-green-400", bg: "bg-green-500/20", border: "border-green-500/50", icon: "✓" },
    MEDIUM: { color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/50", icon: "◐" },
    LOW: { color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/50", icon: "!" },
    ERROR: { color: "text-red-400", bg: "bg-red-500/20", border: "border-red-500/50", icon: "✕" },
    UNKNOWN: { color: "text-gray-400", bg: "bg-gray-500/20", border: "border-gray-500/50", icon: "?" },
  };
  const c = config[confidence] || config.UNKNOWN;
  return (
    <span className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-bold ${c.color} ${c.bg} ${c.border}`}>
      <span className={`flex h-4 w-4 items-center justify-center rounded-full text-xs ${confidence === "HIGH" ? "animate-pulse bg-green-400 text-green-900" : confidence === "MEDIUM" ? "bg-amber-400 text-amber-900" : "bg-red-400 text-red-900"}`}>
        {c.icon}
      </span>
      CONFIDENCE: {confidence}
    </span>
  );
}

function ProcessingAnimation() {
  const stages = [
    "INITIALIZING NEURAL PATHWAYS...",
    "QUERYING VECTOR DATABASE...",
    "ANALYZING SEMANTIC RELATIONSHIPS...",
    "FUSING RETRIEVAL RESULTS...",
    "GENERATING INTELLIGENCE REPORT...",
  ];
  const [stageIndex, setStageIndex] = useState(0);

  useState(() => {
    const interval = setInterval(() => {
      setStageIndex((i) => (i + 1) % stages.length);
    }, 1500);
    return () => clearInterval(interval);
  });

  return (
    <div className="rounded-lg border border-cyan-500/30 bg-gray-900/80 p-8 text-center">
      <div className="mb-4 flex justify-center">
        <div className="relative h-16 w-16">
          <div className="absolute inset-0 animate-ping rounded-full bg-cyan-500/20" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-cyan-500/40" />
          <div className="absolute inset-4 rounded-full bg-cyan-500 flex items-center justify-center">
            <span className="text-xl">🧠</span>
          </div>
        </div>
      </div>
      <div className="h-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={stageIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="font-mono text-sm text-cyan-400"
          >
            {stages[stageIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex justify-center gap-1">
        {stages.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
              i <= stageIndex ? "bg-cyan-500" : "bg-gray-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Helper to render inline markdown (bold, italic, code)
function renderInlineMarkdown(text: string): React.ReactNode {
  // Process **bold**, *italic*, and `code`
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  
  while (remaining.length > 0) {
    // Check for **bold**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Check for *italic* (but not **)
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);
    // Check for `code`
    const codeMatch = remaining.match(/`([^`]+)`/);
    
    // Find the earliest match
    const matches = [
      boldMatch ? { match: boldMatch, type: 'bold', index: boldMatch.index! } : null,
      italicMatch ? { match: italicMatch, type: 'italic', index: italicMatch.index! } : null,
      codeMatch ? { match: codeMatch, type: 'code', index: codeMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);
    
    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }
    
    const first = matches[0]!;
    
    // Add text before the match
    if (first.index > 0) {
      parts.push(remaining.substring(0, first.index));
    }
    
    // Add the formatted element
    if (first.type === 'bold') {
      parts.push(<strong key={key++} className="text-cyan-300 font-bold">{first.match[1]}</strong>);
    } else if (first.type === 'italic') {
      parts.push(<em key={key++} className="text-gray-200 italic">{first.match[1]}</em>);
    } else if (first.type === 'code') {
      parts.push(<code key={key++} className="bg-gray-800 text-cyan-400 px-1.5 py-0.5 rounded text-xs font-mono">{first.match[1]}</code>);
    }
    
    remaining = remaining.substring(first.index + first.match[0].length);
  }
  
  return parts.length === 1 && typeof parts[0] === 'string' ? parts[0] : <>{parts}</>;
}

function FormattedAnswer({ answer }: { answer: string }) {
  const sections = useMemo(() => {
    const parts: { type: string; content: string; level?: number }[] = [];
    const lines = answer.split('\n');
    let currentSection = { type: 'text', content: '' };

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // Check for headings (####, ###, ##, #)
      if (trimmedLine.startsWith('#### ')) {
        if (currentSection.content.trim()) parts.push(currentSection);
        parts.push({ type: 'heading', content: trimmedLine.replace('#### ', ''), level: 4 });
        currentSection = { type: 'text', content: '' };
      } else if (trimmedLine.startsWith('### ')) {
        if (currentSection.content.trim()) parts.push(currentSection);
        parts.push({ type: 'heading', content: trimmedLine.replace('### ', ''), level: 3 });
        currentSection = { type: 'text', content: '' };
      } else if (trimmedLine.startsWith('## ')) {
        if (currentSection.content.trim()) parts.push(currentSection);
        parts.push({ type: 'heading', content: trimmedLine.replace('## ', ''), level: 2 });
        currentSection = { type: 'text', content: '' };
      } else if (trimmedLine.startsWith('# ')) {
        if (currentSection.content.trim()) parts.push(currentSection);
        parts.push({ type: 'heading', content: trimmedLine.replace('# ', ''), level: 1 });
        currentSection = { type: 'text', content: '' };
      } 
      // Check for bullet lists (-, *, •)
      else if (/^[-*•]\s+/.test(trimmedLine)) {
        if (currentSection.type !== 'list') {
          if (currentSection.content.trim()) parts.push(currentSection);
          currentSection = { type: 'list', content: '' };
        }
        currentSection.content += trimmedLine + '\n';
      }
      // Check for numbered lists (1., 2., etc.)
      else if (/^\d+\.\s+/.test(trimmedLine)) {
        if (currentSection.type !== 'numbered-list') {
          if (currentSection.content.trim()) parts.push(currentSection);
          currentSection = { type: 'numbered-list', content: '' };
        }
        currentSection.content += trimmedLine + '\n';
      }
      // Check for horizontal rule (---, ***)
      else if (/^[-*_]{3,}$/.test(trimmedLine)) {
        if (currentSection.content.trim()) parts.push(currentSection);
        parts.push({ type: 'hr', content: '' });
        currentSection = { type: 'text', content: '' };
      }
      // Regular text
      else {
        if ((currentSection.type === 'list' || currentSection.type === 'numbered-list') && currentSection.content) {
          parts.push(currentSection);
          currentSection = { type: 'text', content: '' };
        }
        currentSection.content += line + '\n';
      }
    });
    if (currentSection.content.trim()) parts.push(currentSection);
    return parts;
  }, [answer]);

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        if (section.type === 'heading') {
          const headingClasses = {
            1: "text-xl font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 mt-6",
            2: "text-lg font-bold text-cyan-400 border-b border-cyan-500/30 pb-2 mt-5",
            3: "text-base font-bold text-cyan-300 mt-4",
            4: "text-sm font-bold text-amber-400 mt-3",
          }[section.level || 2];
          
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={headingClasses}
            >
              {renderInlineMarkdown(section.content)}
            </motion.div>
          );
        }
        
        if (section.type === 'list') {
          return (
            <motion.ul
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="space-y-2 pl-4"
            >
              {section.content.split('\n').filter(Boolean).map((item, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-cyan-500 mt-0.5 flex-shrink-0">▸</span>
                  <span className="leading-relaxed">{renderInlineMarkdown(item.replace(/^[-*•]\s+/, ''))}</span>
                </li>
              ))}
            </motion.ul>
          );
        }
        
        if (section.type === 'numbered-list') {
          return (
            <motion.ol
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="space-y-2 pl-4"
            >
              {section.content.split('\n').filter(Boolean).map((item, j) => {
                const match = item.match(/^(\d+)\.\s+(.+)/);
                return (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-amber-500 font-mono font-bold flex-shrink-0 min-w-[1.5rem]">{match?.[1] || j + 1}.</span>
                    <span className="leading-relaxed">{renderInlineMarkdown(match?.[2] || item)}</span>
                  </li>
                );
              })}
            </motion.ol>
          );
        }
        
        if (section.type === 'hr') {
          return (
            <motion.hr
              key={i}
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: i * 0.03 }}
              className="border-t border-gray-700 my-4"
            />
          );
        }
        
        // Regular text - handle paragraphs
        const paragraphs = section.content.split(/\n\n+/).filter(p => p.trim());
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="space-y-2"
          >
            {paragraphs.map((para, j) => (
              <p key={j} className="text-sm text-gray-300 leading-relaxed">
                {renderInlineMarkdown(para.trim().replace(/\n/g, ' '))}
              </p>
            ))}
          </motion.div>
        );
      })}
    </div>
  );
}

export function LLMAnswerViz({ 
  active, 
  isIndexed = false,
  indexedModel = "azure-openai",
  persistedState,
  onStateChange,
}: LLMAnswerVizProps) {
  const [query, setQuery] = useState(persistedState?.query ?? "What are the best practices for securing an API?");
  const [searchType, setSearchType] = useState<SearchType>("hybrid");
  const [formatStyle, setFormatStyle] = useState<FormatStyle>("intelligence_report");
  const [model, setModel] = useState<EmbeddingModelId>(indexedModel);
  const [includeComparison, setIncludeComparison] = useState(false);
  const [result, setResult] = useState<RAGResponse | null>(persistedState?.results ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state changes to parent for persistence
  useEffect(() => {
    onStateChange?.({ query, results: result });
  }, [query, result]); // eslint-disable-line react-hooks/exhaustive-deps

  const runRAG = async () => {
    if (!isIndexed) {
      setError("No data indexed. Please complete Steps 1 and 2 first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await ragAnswer(query, searchType, model, formatStyle, 5, includeComparison);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "RAG pipeline failed");
    } finally {
      setLoading(false);
    }
  };

  const conceptInfo = {
    title: "RAG Answer Generation",
    description: "Using retrieved context to generate accurate, grounded responses with the LLM.",
    details: [
      "Retrieved chunks are injected as context into the LLM prompt",
      "System prompt defines tone, format, and refusal logic",
      "Source citations link answers back to retrieved documents",
      "Confidence based on source coverage and relevance scores",
      "Structured output with headings, bullets, and summaries"
    ]
  };

  return (
    <GlassPanel title="Module F: ARIS Intelligence Analysis System" active={active} conceptInfo={conceptInfo}>
      <div className="space-y-4">
        {!isIndexed ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-6 text-center">
            <div className="mb-3 text-4xl">⚠️</div>
            <h3 className="text-lg font-bold text-amber-400 mb-2">No Data Indexed</h3>
            <p className="text-sm text-gray-400">
              Complete Step 1 (Chunking) and Step 2 (Embeddings) to index your data before generating intelligence reports.
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-cyan-500/20 bg-gradient-to-r from-cyan-900/20 to-green-900/20 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/20">
                  <span className="text-2xl">🔐</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-300">
                    Advanced Retrieval Intelligence System
                  </h3>
                  <p className="text-xs text-gray-400">
                    RAG-powered analysis with source-aware citations and structured formatting
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-2 block text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Intelligence Query
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-cyan-500/30 bg-gray-900/50 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
                  placeholder="Enter your intelligence query..."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Retrieval Method
                  </label>
                  <select
                    value={searchType}
                    onChange={(e) => setSearchType(e.target.value as SearchType)}
                    className="w-full rounded-lg border border-cyan-500/30 bg-gray-900/50 px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="hybrid">Hybrid (RRF Fusion)</option>
                    <option value="dense">Dense (Semantic)</option>
                    <option value="sparse">Sparse (BM25)</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Output Format
                  </label>
                  <select
                    value={formatStyle}
                    onChange={(e) => setFormatStyle(e.target.value as FormatStyle)}
                    className="w-full rounded-lg border border-cyan-500/30 bg-gray-900/50 px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="intelligence_report">Intelligence Report</option>
                    <option value="summary">Executive Summary</option>
                    <option value="detailed">Detailed Analysis</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Embedding Model
                  </label>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as EmbeddingModelId)}
                    className="w-full rounded-lg border border-cyan-500/30 bg-gray-900/50 px-3 py-2.5 text-sm text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="azure-openai">Azure OpenAI (1536d)</option>
                    <option value="cohere-embed-english-v3">Cohere v3 (1024d)</option>
                    <option value="nvidia-nv-embed-v1">NVIDIA NV-Embed (4096d)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-gray-900/50 px-3 py-2.5 cursor-pointer hover:bg-gray-800/50 transition">
                    <input
                      type="checkbox"
                      checked={includeComparison}
                      onChange={(e) => setIncludeComparison(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                    />
                    <span className="text-xs text-gray-400">Include Method Comparison</span>
                  </label>
                </div>
              </div>

              <button
                onClick={runRAG}
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-green-600 to-cyan-600 px-4 py-4 text-sm font-bold uppercase tracking-wider text-white transition hover:from-green-500 hover:to-cyan-500 disabled:opacity-50 shadow-lg shadow-cyan-500/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    PROCESSING INTELLIGENCE...
                  </span>
                ) : (
                  "GENERATE INTELLIGENCE REPORT"
                )}
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="text-sm font-bold text-red-400">SYSTEM ERROR</h4>
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ProcessingAnimation />
            </motion.div>
          )}

          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="overflow-hidden rounded-lg border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
                <div className="flex items-center justify-between bg-gradient-to-r from-cyan-900/50 to-green-900/50 px-6 py-4 border-b border-cyan-500/30">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/30">
                      <span className="text-2xl">🔐</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold uppercase tracking-wider text-cyan-300">
                        Intelligence Analysis Report
                      </h3>
                      <p className="text-xs text-gray-400">
                        Classification: CLASSIFIED • Generated via {result.search_type.toUpperCase()} retrieval
                      </p>
                    </div>
                  </div>
                  <ConfidenceBadge confidence={result.confidence} />
                </div>

                <div className="grid lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-cyan-900/50">
                  <div className="lg:col-span-2 p-6 bg-gray-900/50">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="text-cyan-400">📋</span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Analysis Report
                      </h4>
                    </div>
                    <div className="prose-intel max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                      <FormattedAnswer answer={result.answer} />
                    </div>
                  </div>

                  <div className="p-6 bg-gray-900/30">
                    <div className="mb-4 flex items-center gap-2">
                      <span className="text-cyan-400">📚</span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                        Sources ({result.sources.length})
                      </h4>
                    </div>
                    <div className="space-y-3 max-h-[450px] overflow-y-auto custom-scrollbar">
                      {result.sources.map((source, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="rounded-lg border border-gray-700 bg-gray-800/50 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <span className="rounded bg-cyan-900/50 px-2 py-0.5 text-xs font-bold text-cyan-300">
                              [{source.rank}]
                            </span>
                            <div className="flex items-center gap-1">
                              <div className={`h-2 w-2 rounded-full ${
                                source.score > 0.8 ? "bg-green-400" :
                                source.score > 0.6 ? "bg-yellow-400" : "bg-red-400"
                              }`} />
                              <span className="text-xs text-gray-400">
                                {(source.score * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed">
                            {source.text}
                          </p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-cyan-900/50 bg-gray-900/20 px-6 py-3">
                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">SEARCH:</span>
                      <span className="text-cyan-400 font-mono">{result.search_type.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">FORMAT:</span>
                      <span className="text-cyan-400 font-mono">{result.format_style.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">MODEL:</span>
                      <span className="text-cyan-400 font-mono">{result.model}</span>
                    </div>
                    {result.tokens_used && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500">TOKENS:</span>
                        <span className="text-cyan-400 font-mono">{result.tokens_used}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {result.comparison && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-amber-500/30 bg-amber-900/10 p-4"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-amber-400">📊</span>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      Search Method Comparison Analysis
                    </h4>
                  </div>
                  {result.comparison.analysis ? (
                    <div className="prose-intel text-sm text-gray-300">
                      <FormattedAnswer answer={result.comparison.analysis} />
                    </div>
                  ) : result.comparison.error ? (
                    <p className="text-sm text-red-400">{result.comparison.error}</p>
                  ) : null}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {isIndexed && !result && !loading && !error && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border-2 border-dashed border-gray-700 bg-gray-800/20 p-12 text-center"
          >
            <div className="relative inline-block mb-6">
              <motion.div
                animate={{ 
                  boxShadow: [
                    "0 0 20px rgba(0, 212, 255, 0.2)",
                    "0 0 40px rgba(0, 212, 255, 0.4)",
                    "0 0 20px rgba(0, 212, 255, 0.2)"
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="text-6xl p-4 bg-gradient-to-br from-cyan-500/20 to-green-500/20 rounded-2xl"
              >
                🧠
              </motion.div>
            </div>
            <h4 className="text-xl font-bold text-gray-300 mb-3">Ready for Intelligence Analysis</h4>
            <p className="text-base text-gray-500 max-w-lg mx-auto">
              Enter your query and generate a comprehensive intelligence report using the RAG pipeline
              with hybrid retrieval, LLM analysis, and source-cited answers.
            </p>
            <div className="mt-8 flex justify-center gap-6 flex-wrap">
              <div className="flex items-center gap-2 text-sm bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-green-400"></span>
                <span className="text-green-400">Hybrid Search</span>
              </div>
              <div className="flex items-center gap-2 text-sm bg-blue-500/10 border border-blue-500/30 px-4 py-2 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span className="text-blue-400">LLM Analysis</span>
              </div>
              <div className="flex items-center gap-2 text-sm bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="text-amber-400">Source Citations</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </GlassPanel>
  );
}
