"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "../GlassPanel";
import { chunkDocument } from "@/lib/api";
import { InfoTooltip, ChunkPreviewTooltip } from "../ui/Tooltip";
import { FuturisticLoader } from "../ui/FuturisticLoader";
import type { ChunkStrategy } from "@/types";

const STRATEGIES: { 
  id: ChunkStrategy; 
  label: string; 
  description: string;
  icon: string;
  details: string[];
}[] = [
  { 
    id: "character", 
    label: "Fixed Size", 
    description: "Uniform chunk length with overlap",
    icon: "📏",
    details: [
      "Splits text at exact character positions",
      "May break mid-word or mid-sentence",
      "Fastest but least semantic awareness",
      "Best for: Uniform content like logs"
    ]
  },
  { 
    id: "recursive", 
    label: "Specialized", 
    description: "Splits based on document structure",
    icon: "🔄",
    details: [
      "Tries to split at natural boundaries",
      "Falls back to smaller separators if needed",
      "Preserves sentence/paragraph integrity",
      "Best for: General documents"
    ]
  },
  { 
    id: "semantic", 
    label: "Semantic", 
    description: "Preserves meaning and context",
    icon: "🧠",
    details: [
      "Uses embedding similarity to group text",
      "Chunks have coherent meaning",
      "Slower but best retrieval quality",
      "Best for: Technical/complex content"
    ]
  },
];

function ChunkingDiagram({ strategy }: { strategy: ChunkStrategy }) {
  // Sample text snippets to show in chunk visualizations
  const fixedChunks = [
    "RAG is an AI",
    " architectur",
    "e that comb",
    "ines retrie",
    "val systems",
    " with langu",
    "age models ",
    "to provide ",
  ];

  const recursiveChunks = [
    { text: "RAG is an AI architecture that combines retrieval...", size: "large" },
    { text: "1. Document Ingestion", size: "small" },
    { text: "RAG solves the hallucination problem by grounding...", size: "large" },
    { text: "2. Chunking: Documents are split", size: "small" },
  ];

  const semanticSentences = [
    "RAG is an AI architecture",
    "combines retrieval systems", 
    "with language models",
    "provide accurate responses",
  ];

  const diagrams = {
    character: (
      <div className="space-y-2">
        <div className="text-center text-sm font-bold text-cyan-400 mb-3">Fixed Size Chunking</div>
        <div className="relative h-32 rounded-lg border border-orange-500/30 bg-orange-500/10 overflow-hidden p-2">
          <div className="grid grid-cols-4 gap-1 h-full">
            {fixedChunks.map((chunk, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="bg-blue-500/60 rounded border border-blue-400/50 flex items-center justify-center p-1 overflow-hidden"
              >
                <span className="text-[9px] font-mono text-blue-100 text-center leading-tight break-all">
                  {chunk}
                </span>
              </motion.div>
            ))}
          </div>
          {/* Overlap indicators */}
          <div className="absolute bottom-1 left-1/4 right-1/4 flex justify-around">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 + i * 0.1 }}
                className="text-[8px] text-orange-400"
              >
                ↔
              </motion.div>
            ))}
          </div>
        </div>
        <p className="text-center text-xs text-gray-400">
          Each chunk = exact 12 chars (may split mid-word)
        </p>
      </div>
    ),
    recursive: (
      <div className="space-y-2">
        <div className="text-center text-sm font-bold text-cyan-400 mb-3">Specialized Chunking</div>
        <div className="relative h-32 rounded-lg border border-orange-500/30 bg-orange-500/10 overflow-hidden p-2">
          <div className="grid grid-cols-3 gap-2 h-full">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-blue-500/60 rounded border border-blue-400/50 row-span-2 flex items-center justify-center p-2 overflow-hidden"
            >
              <span className="text-[8px] font-mono text-blue-100 text-center leading-tight">
                {recursiveChunks[0].text}
              </span>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-blue-500/60 rounded border border-blue-400/50 flex items-center justify-center p-1 overflow-hidden"
            >
              <span className="text-[8px] font-mono text-blue-100 text-center leading-tight">
                {recursiveChunks[1].text}
              </span>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-blue-500/60 rounded border border-blue-400/50 row-span-2 flex items-center justify-center p-2 overflow-hidden"
            >
              <span className="text-[8px] font-mono text-blue-100 text-center leading-tight">
                {recursiveChunks[2].text}
              </span>
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-blue-500/60 rounded border border-blue-400/50 flex items-center justify-center p-1 overflow-hidden"
            >
              <span className="text-[8px] font-mono text-blue-100 text-center leading-tight">
                {recursiveChunks[3].text}
              </span>
            </motion.div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400">
          Splits at paragraphs/sentences (varies by structure)
        </p>
      </div>
    ),
    semantic: (
      <div className="space-y-2">
        <div className="text-center text-sm font-bold text-cyan-400 mb-3">Semantic Chunking</div>
        <div className="relative h-32 rounded-lg border border-orange-500/30 bg-orange-500/10 overflow-hidden p-2">
          <div className="flex gap-2 h-full">
            {/* Input sentences */}
            <div className="flex-1 flex flex-col gap-1">
              {semanticSentences.map((sentence, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, x: -10 }}
                  animate={{ scale: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-1 bg-orange-400/40 rounded flex items-center justify-center px-1 overflow-hidden"
                >
                  <span className="text-[7px] font-mono text-orange-100 text-center leading-tight truncate">
                    {sentence}
                  </span>
                </motion.div>
              ))}
            </div>
            {/* Arrow */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center text-cyan-400 text-lg"
            >
              →
            </motion.div>
            {/* Grouped semantic chunk */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 }}
              className="flex-[1.5] bg-blue-500/60 rounded border border-blue-400/50 flex flex-col items-center justify-center p-2 overflow-hidden"
            >
              <span className="text-[8px] font-mono text-cyan-300 mb-1">Related meaning →</span>
              <span className="text-[8px] font-mono text-blue-100 text-center leading-tight">
                "RAG is an AI architecture that combines retrieval systems with language models to provide accurate responses"
              </span>
            </motion.div>
          </div>
        </div>
        <p className="text-center text-xs text-gray-400">
          Groups by meaning (similar topics stay together)
        </p>
      </div>
    ),
  };

  return diagrams[strategy];
}

const SAMPLE_DOC = `RAG (Retrieval-Augmented Generation) is an AI architecture that combines retrieval systems with language models to provide accurate, up-to-date responses.

The process involves several key steps:
1. Document Ingestion: Raw documents are processed and prepared for chunking
2. Chunking: Documents are split into smaller, meaningful segments
3. Embedding: Each chunk is converted to a vector representation
4. Indexing: Vectors are stored in a vector database for efficient retrieval
5. Retrieval: When a query arrives, similar chunks are retrieved
6. Generation: The LLM uses retrieved context to generate a response

RAG solves the hallucination problem by grounding responses in actual data. It also enables knowledge updates without retraining the model.`;

interface ChunkingVizProps {
  active: boolean;
  onChunksReady?: (chunks: string[]) => void;
  useApi?: boolean;
}

export function ChunkingViz({
  active,
  onChunksReady,
  useApi = true,
}: ChunkingVizProps) {
  const [strategy, setStrategy] = useState<ChunkStrategy>("recursive");
  const [text, setText] = useState(SAMPLE_DOC);
  const [chunkSize, setChunkSize] = useState(512);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [chunks, setChunks] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingIndex, setProcessingIndex] = useState(-1);
  const [showChunks, setShowChunks] = useState(false);

  const selectedStrategy = STRATEGIES.find(s => s.id === strategy);
  
  // Calculate overlap percentage for display
  const overlapPercentage = chunkSize > 0 ? Math.round((chunkOverlap / chunkSize) * 100) : 0;

  useEffect(() => {
    if (chunks.length > 0 && !showChunks) {
      let idx = 0;
      setProcessingIndex(0);
      const interval = setInterval(() => {
        idx++;
        if (idx >= chunks.length) {
          clearInterval(interval);
          setProcessingIndex(-1);
          setShowChunks(true);
        } else {
          setProcessingIndex(idx);
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [chunks, showChunks]);

  const runChunking = async () => {
    setError(null);
    setLoading(true);
    setChunks([]);
    setShowChunks(false);
    setProcessingIndex(-1);
    try {
      if (useApi) {
        const res = await chunkDocument(text, strategy, chunkSize, chunkOverlap);
        setChunks(res.chunks);
        onChunksReady?.(res.chunks);
      } else {
        const mockChunks = text.split(/\n\n/).filter(Boolean);
        setChunks(mockChunks);
        onChunksReady?.(mockChunks);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chunking failed");
      const fallback = text.split(/\n\n/).filter(Boolean);
      setChunks(fallback);
      onChunksReady?.(fallback);
    } finally {
      setLoading(false);
    }
  };

  const wordCount = text.trim().split(/\s+/).length;
  const charCount = text.length;

  const conceptInfo = {
    title: "Document Chunking",
    description: "Breaking documents into smaller, semantically coherent pieces for embedding and retrieval.",
    details: [
      "Chunks must fit within embedding model context windows (typically 512-8192 tokens)",
      "Too small: loses context and meaning",
      "Too large: dilutes specific information retrieval",
      "Overlap between chunks helps maintain context across boundaries",
      "Strategy choice significantly impacts retrieval quality"
    ]
  };

  return (
    <GlassPanel title="Module A: Document Ingestion & Chunking" active={active} conceptInfo={conceptInfo}>
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label className="mb-3 block text-sm font-bold text-gray-300 uppercase tracking-wider">
              Select Chunking Strategy
            </label>
            <div className="grid grid-cols-3 gap-3">
              {STRATEGIES.map((s) => (
                <InfoTooltip
                  key={s.id}
                  title={s.label}
                  description={s.description}
                  details={s.details}
                >
                  <button
                    onClick={() => setStrategy(s.id)}
                    className={`rounded-lg border p-4 text-center transition w-full ${
                      strategy === s.id
                        ? "border-cyan-400 bg-cyan-500/20"
                        : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-2xl block mb-2">{s.icon}</span>
                    <span className={`text-sm font-bold block ${strategy === s.id ? "text-cyan-400" : "text-gray-300"}`}>
                      {s.label}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{s.description}</p>
                  </button>
                </InfoTooltip>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-3 block text-sm font-bold text-gray-300 uppercase tracking-wider">
              Visual Representation
            </label>
            <div className="rounded-lg border border-gray-700 bg-gray-800/30 p-4">
              <ChunkingDiagram strategy={strategy} />
            </div>
          </div>
        </div>

        {/* Chunk Size and Overlap Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-cyan-500/30 bg-gray-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <span className="text-lg">📏</span> Chunk Size
              </label>
              <span className="font-mono text-lg font-bold text-cyan-400">{chunkSize} chars</span>
            </div>
            <input
              type="range"
              min={100}
              max={2000}
              step={50}
              value={chunkSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                setChunkSize(newSize);
                // Ensure overlap doesn't exceed chunk size
                if (chunkOverlap >= newSize) {
                  setChunkOverlap(Math.floor(newSize * 0.2));
                }
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>100 (small)</span>
              <span>1000 (medium)</span>
              <span>2000 (large)</span>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              <span className="text-cyan-400">Tip:</span> Smaller chunks = more precise retrieval. Larger chunks = more context per result.
            </p>
          </div>

          <div className="rounded-xl border border-orange-500/30 bg-gray-900/50 p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <span className="text-lg">🔗</span> Chunk Overlap
              </label>
              <div className="text-right">
                <span className="font-mono text-lg font-bold text-orange-400">{chunkOverlap} chars</span>
                <span className="text-xs text-gray-500 ml-2">({overlapPercentage}%)</span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={Math.min(chunkSize - 50, 500)}
              step={10}
              value={chunkOverlap}
              onChange={(e) => setChunkOverlap(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>0 (none)</span>
              <span>~10-20% (recommended)</span>
              <span>max</span>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              <span className="text-orange-400">Why overlap?</span> Prevents losing context at chunk boundaries. Adjacent chunks share some text.
            </p>
          </div>
        </div>

        {/* Overlap Visualization */}
        {chunkOverlap > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="rounded-xl border border-purple-500/30 bg-purple-900/10 p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-purple-400">💡</span>
              <span className="text-sm font-bold text-purple-400">Overlap Visualization</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <div className="h-8 rounded-lg bg-blue-500/40 border border-blue-400/50 flex items-center justify-center">
                  <span className="text-xs text-blue-200 font-mono">Chunk N</span>
                </div>
                <div 
                  className="absolute top-0 right-0 h-8 rounded-r-lg bg-orange-500/60 border-y border-r border-orange-400/50 flex items-center justify-center"
                  style={{ width: `${overlapPercentage}%`, minWidth: '30px' }}
                >
                  <span className="text-[10px] text-orange-200 font-mono">↔</span>
                </div>
              </div>
              <div className="flex-1 relative">
                <div 
                  className="absolute top-0 left-0 h-8 rounded-l-lg bg-orange-500/60 border-y border-l border-orange-400/50 flex items-center justify-center"
                  style={{ width: `${overlapPercentage}%`, minWidth: '30px' }}
                >
                  <span className="text-[10px] text-orange-200 font-mono">↔</span>
                </div>
                <div className="h-8 rounded-lg bg-green-500/40 border border-green-400/50 flex items-center justify-center">
                  <span className="text-xs text-green-200 font-mono">Chunk N+1</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              The <span className="text-orange-400 font-bold">{chunkOverlap} characters</span> of overlap ensure context isn&apos;t lost between chunks
            </p>
          </motion.div>
        )}

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-gray-300 uppercase tracking-wider">
              Document Text
            </label>
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="font-mono">{wordCount} words</span>
              <span>•</span>
              <span className="font-mono">{charCount} chars</span>
            </div>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full rounded-lg border border-cyan-500/30 bg-gray-900/50 px-4 py-3 text-base focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50"
            placeholder="Paste or type document content..."
          />
        </div>

        <button
          onClick={runChunking}
          disabled={loading || text.trim().length === 0}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-4 text-base font-bold uppercase tracking-wider text-white transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 button-cyber"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <motion.span
                className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              ANALYZING DOCUMENT STRUCTURE...
            </span>
          ) : (
            `CHUNK DOCUMENT (${selectedStrategy?.label})`
          )}
        </button>

        {loading && (
          <FuturisticLoader 
            text="Segmenting document into chunks..."
            variant="circuit"
          />
        )}

        {error && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-3">
            <p className="text-xs text-amber-400">
              ⚠ API unavailable, using fallback chunking. {error}
            </p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {chunks.length > 0 && !showChunks && processingIndex >= 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4 rounded-lg border border-cyan-500/30 bg-gray-900/50 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-cyan-400">
                  Processing Chunks...
                </span>
                <span className="text-xs font-mono text-gray-500">
                  {processingIndex + 1} / {chunks.length}
                </span>
              </div>
              
              <div className="relative h-2 overflow-hidden rounded-full bg-gray-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400"
                  animate={{ width: `${((processingIndex + 1) / chunks.length) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              
              <div className="flex gap-1.5 flex-wrap">
                {chunks.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-6 w-6 rounded flex items-center justify-center text-xs font-mono transition-all ${
                      i < processingIndex
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : i === processingIndex
                        ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400/50 animate-pulse"
                        : "bg-gray-800 text-gray-600 border border-gray-700"
                    }`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    {i + 1}
                  </motion.div>
                ))}
              </div>
              
              {chunks[processingIndex] && (
                <motion.div
                  key={processingIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-cyan-500/20 bg-gray-800/50 p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <motion.div
                      className="h-2 w-2 rounded-full bg-cyan-400"
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                    />
                    <span className="text-xs font-mono text-cyan-400">
                      Chunk #{processingIndex + 1}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">
                    {chunks[processingIndex].substring(0, 120)}...
                  </p>
                </motion.div>
              )}
            </motion.div>
          )}

          {chunks.length > 0 && showChunks && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.span 
                    className="text-2xl text-cyan-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring" }}
                  >
                    ✓
                  </motion.span>
                  <p className="text-lg font-bold text-cyan-400">
                    {chunks.length} Chunks Created
                  </p>
                </div>
                <span className="text-sm text-gray-400 font-mono">
                  Avg: {Math.round(charCount / chunks.length)} chars/chunk
                </span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {chunks.map((c, i) => (
                  <ChunkPreviewTooltip
                    key={i}
                    content={c}
                    index={i}
                    wordCount={c.split(/\s+/).length}
                    charCount={c.length}
                  >
                    <motion.div
                      layout
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="rounded-xl border border-cyan-500/30 bg-gray-900/50 p-4 cursor-pointer hover:border-cyan-400/60 hover:bg-gray-800/60 transition-all group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="rounded-lg bg-cyan-500/20 px-3 py-1 text-sm font-mono font-bold text-cyan-400">
                          #{i + 1}
                        </span>
                        <span className="text-xs text-gray-500 group-hover:text-cyan-400 transition-colors">
                          👆 hover
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 line-clamp-2 leading-relaxed">
                        {c.substring(0, 80)}...
                      </p>
                      <div className="mt-3 flex items-center gap-3 text-sm text-gray-500">
                        <span>{c.length} chars</span>
                        <span>•</span>
                        <span>{c.split(/\s+/).length} words</span>
                      </div>
                    </motion.div>
                  </ChunkPreviewTooltip>
                ))}
              </div>

              <div className="rounded-xl border border-green-500/30 bg-green-900/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl text-green-400">✓</span>
                  <span className="text-base font-bold text-green-400">
                    Chunks ready for embedding
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-400">
                  Proceed to Step 2 to generate embeddings and store in the vector database
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {chunks.length === 0 && !loading && (
          <div className="rounded-xl border border-gray-700 bg-gray-800/30 p-8 text-center">
            <div className="mb-4 text-5xl opacity-50">📑</div>
            <h4 className="text-lg font-bold text-gray-300 mb-2">Ready to Chunk</h4>
            <p className="text-sm text-gray-500">
              Select a strategy above and click "Chunk Document" to split your text into processable segments
            </p>
          </div>
        )}
      </div>
    </GlassPanel>
  );
}
