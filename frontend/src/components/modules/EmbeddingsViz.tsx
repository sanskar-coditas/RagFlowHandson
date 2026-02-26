"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "../GlassPanel";
import { embedChunks, listEmbeddingModels, upsertChunks } from "@/lib/api";
import { InfoTooltip } from "../ui/Tooltip";
import { ChunkProcessingLoader } from "../ui/FuturisticLoader";
import type { EmbeddingModelId, EmbeddingModelInfo } from "@/types";

const MODEL_INFO = {
  "azure-openai": {
    title: "Azure OpenAI (APIM)",
    description: "Microsoft's text-embedding-ada-002 model via Azure API Management",
    details: [
      "Dimension: 1536 vectors",
      "Fast inference with enterprise SLA",
      "Best for: General purpose embeddings",
      "Good balance of speed and quality"
    ]
  },
  "cohere-embed-english-v3": {
    title: "Cohere Embed v3 (Bedrock)",
    description: "Cohere's latest embedding model optimized for search",
    details: [
      "Dimension: 1024 vectors", 
      "Optimized for search and retrieval",
      "Best for: Semantic search applications",
      "Strong performance on MTEB benchmarks"
    ]
  },
  "nvidia-nv-embed-v1": {
    title: "NVIDIA NV-Embed v1",
    description: "NVIDIA's free embedding model for high-dimensional vectors",
    details: [
      "Dimension: 4096 vectors",
      "Highest dimensionality option",
      "Best for: Maximum semantic resolution",
      "Free tier available"
    ]
  }
};

type ProcessStage = "idle" | "embedding" | "storing" | "complete" | "error";

interface EmbeddingsVizProps {
  active: boolean;
  chunks: string[];
  onEmbeddingsReady?: (embeddings: number[][], dimensions: number) => void;
  onIndexed?: (indexed: boolean, model: EmbeddingModelId) => void;
  useApi?: boolean;
}

export function EmbeddingsViz({
  active,
  chunks,
  onEmbeddingsReady,
  onIndexed,
  useApi = true,
}: EmbeddingsVizProps) {
  const [models, setModels] = useState<EmbeddingModelInfo[]>([]);
  const [modelId, setModelId] = useState<EmbeddingModelId>("azure-openai");
  const [targetDimensions, setTargetDimensions] = useState(0);
  const [dimensions, setDimensions] = useState(0);
  const [displayVector, setDisplayVector] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<ProcessStage>("idle");
  const [indexedCount, setIndexedCount] = useState(0);
  const [embeddedChunks, setEmbeddedChunks] = useState<number>(0);
  const [currentProcessingIndex, setCurrentProcessingIndex] = useState(0);

  const currentModelInfo = MODEL_INFO[modelId as keyof typeof MODEL_INFO];

  useEffect(() => {
    listEmbeddingModels()
      .then((res) => {
        setModels(res.models || []);
        if (res.models?.length && !res.models.some((m) => m.id === modelId)) {
          setModelId(res.models[0].id as EmbeddingModelId);
        }
      })
      .catch(() => setModels([]));
  }, []);

  const selectedModel = models.find((m) => m.id === modelId);
  const dims = selectedModel?.dimension ?? selectedModel?.dimensions ?? 1536;

  useEffect(() => {
    if (targetDimensions <= 0) return;
    const target = targetDimensions;
    const step = Math.max(1, Math.floor(target / 40));
    let current = 0;
    const id = setInterval(() => {
      current = Math.min(current + step, target);
      setDimensions(current);
      if (current >= target) clearInterval(id);
    }, 30);
    return () => clearInterval(id);
  }, [targetDimensions]);

  const runEmbedAndStore = async () => {
    if (chunks.length === 0) return;
    setError(null);
    setLoading(true);
    setDimensions(0);
    setTargetDimensions(0);
    setDisplayVector([]);
    setStage("embedding");
    setEmbeddedChunks(0);
    setIndexedCount(0);
    setCurrentProcessingIndex(0);

    let progressInterval: NodeJS.Timeout | null = null;
    
    const startProgress = () => {
      let idx = 0;
      progressInterval = setInterval(() => {
        idx++;
        if (idx >= chunks.length - 1) {
          if (progressInterval) clearInterval(progressInterval);
          setCurrentProcessingIndex(chunks.length - 1);
        } else {
          setCurrentProcessingIndex(idx);
        }
      }, 400);
    };

    const stopProgress = () => {
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
    };

    startProgress();

    try {
      let embeddingsResult;
      
      if (useApi) {
        embeddingsResult = await embedChunks(chunks, modelId);
        setTargetDimensions(embeddingsResult.dimensions);
        setDisplayVector(embeddingsResult.embeddings[0]?.slice(0, 12) ?? []);
        setEmbeddedChunks(embeddingsResult.embeddings.length);
        onEmbeddingsReady?.(embeddingsResult.embeddings, embeddingsResult.dimensions);
      } else {
        setTargetDimensions(dims);
        setDisplayVector(Array.from({ length: 12 }, () => (Math.random() - 0.5) * 2));
        setEmbeddedChunks(chunks.length);
        const mockEmbeddings = chunks.map(() => Array.from({ length: dims }, () => (Math.random() - 0.5) * 2));
        onEmbeddingsReady?.(mockEmbeddings, dims);
      }

      stopProgress();
      setCurrentProcessingIndex(chunks.length - 1);
      setStage("storing");
      
      const chunksToUpsert = chunks.map((content, index) => ({ content, index }));
      const upsertResult = await upsertChunks(chunksToUpsert, modelId);
      
      setIndexedCount(upsertResult.count);
      setStage("complete");
      onIndexed?.(true, modelId);
      
    } catch (e) {
      stopProgress();
      setError(e instanceof Error ? e.message : "Process failed");
      setStage("error");
      setTargetDimensions(dims);
      setDisplayVector(Array.from({ length: 12 }, () => (Math.random() - 0.5) * 2));
      onIndexed?.(false, modelId);
    } finally {
      stopProgress();
      setLoading(false);
    }
  };

  const stageConfig = {
    idle: { color: "text-gray-400", bg: "bg-gray-700/30", label: "Ready" },
    embedding: { color: "text-cyan-400", bg: "bg-cyan-500/20", label: "Embedding..." },
    storing: { color: "text-amber-400", bg: "bg-amber-500/20", label: "Storing in Vector DB..." },
    complete: { color: "text-green-400", bg: "bg-green-500/20", label: "Indexed Successfully" },
    error: { color: "text-red-400", bg: "bg-red-500/20", label: "Error" },
  };

  const currentStage = stageConfig[stage];

  const conceptInfo = {
    title: "Vector Embeddings",
    description: "Converting text chunks into high-dimensional numerical vectors that capture semantic meaning.",
    details: [
      "Embeddings map text to vectors where similar meanings are close together",
      "Dimension count affects precision (higher = more nuanced but slower)",
      "Different models have different strengths (speed vs quality)",
      "Vector databases enable fast similarity search across millions of vectors",
      "The embedding model must match between indexing and query time"
    ]
  };

  return (
    <GlassPanel title="Module B: Embeddings & Vector Storage" active={active} conceptInfo={conceptInfo}>
      <div className="space-y-4">
        <div className={`rounded-lg border ${stage === "complete" ? "border-green-500/50" : "border-cyan-500/30"} ${currentStage.bg} p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-3 w-3 rounded-full ${stage === "embedding" || stage === "storing" ? "animate-pulse" : ""} ${
                stage === "complete" ? "bg-green-400" : 
                stage === "error" ? "bg-red-400" : 
                stage === "idle" ? "bg-gray-500" : "bg-cyan-400"
              }`} />
              <span className={`text-sm font-medium ${currentStage.color}`}>
                {currentStage.label}
              </span>
            </div>
            {stage === "complete" && (
              <span className="text-xs text-green-400">
                {indexedCount} chunks stored
              </span>
            )}
          </div>
          
          {(stage === "embedding" || stage === "storing" || stage === "complete") && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Progress</span>
                <span className={stage === "complete" ? "text-green-400" : "text-cyan-400"}>
                  {stage === "embedding" ? "Step 1/2" : stage === "storing" ? "Step 2/2" : "Complete"}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-700">
                <motion.div
                  className={`h-full ${stage === "complete" ? "bg-green-500" : "bg-cyan-500"}`}
                  initial={{ width: "0%" }}
                  animate={{ 
                    width: stage === "embedding" ? "50%" : 
                           stage === "storing" ? "75%" : 
                           stage === "complete" ? "100%" : "0%" 
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400 uppercase tracking-wider">
              Embedding Model
            </label>
            {currentModelInfo && (
              <InfoTooltip
                title={currentModelInfo.title}
                description={currentModelInfo.description}
                details={currentModelInfo.details}
              >
                <span className="text-xs text-cyan-400 cursor-help flex items-center gap-1">
                  <span>ℹ️</span> Model Info
                </span>
              </InfoTooltip>
            )}
          </div>
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value as EmbeddingModelId)}
            disabled={loading}
            className="w-full rounded-lg border border-cyan-500/30 bg-gray-900/50 px-3 py-2.5 text-sm focus:border-cyan-400 focus:outline-none disabled:opacity-50"
          >
            {models.length > 0
              ? models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))
              : (
                  <>
                    <option value="azure-openai">Azure OpenAI (1536)</option>
                    <option value="cohere-embed-english-v3">Cohere embed-english-v3 (1024)</option>
                    <option value="nvidia-nv-embed-v1">NVIDIA nv-embed-v1 (4096)</option>
                  </>
                )}
          </select>
        </div>

        {currentModelInfo && (
          <div className="rounded-lg border border-purple-500/20 bg-purple-900/10 p-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">🔢</span>
              <div>
                <h4 className="text-xs font-bold text-purple-400">{currentModelInfo.title}</h4>
                <p className="text-xs text-gray-400 mt-1">{currentModelInfo.description}</p>
              </div>
            </div>
          </div>
        )}

        <button
          onClick={runEmbedAndStore}
          disabled={loading || chunks.length === 0}
          className="w-full rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 button-cyber"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <motion.span
                className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              {stage === "embedding" ? "GENERATING EMBEDDINGS..." : "STORING IN VECTOR DB..."}
            </span>
          ) : (
            `EMBED & INDEX ${chunks.length} CHUNKS`
          )}
        </button>

        {loading && chunks.length > 0 && (
          <ChunkProcessingLoader
            chunks={chunks}
            currentIndex={currentProcessingIndex}
            stage={stage === "embedding" ? "embedding" : stage === "storing" ? "storing" : "complete"}
          />
        )}

        {chunks.length === 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 p-3 text-center">
            <p className="text-xs text-amber-400">
              Create chunks in Step 1 first
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-900/20 p-3">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-cyan-500/20 bg-gray-900/50 p-3">
            <p className="mb-1 text-xs text-gray-400">Dimensions</p>
            <motion.span
              key={dimensions}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              className="text-2xl font-mono font-bold text-cyan-400"
            >
              {dimensions}
            </motion.span>
          </div>
          <div className="rounded-lg border border-cyan-500/20 bg-gray-900/50 p-3">
            <p className="mb-1 text-xs text-gray-400">Chunks Embedded</p>
            <span className="text-2xl font-mono font-bold text-cyan-400">
              {embeddedChunks}
            </span>
          </div>
        </div>

        <AnimatePresence>
          {displayVector.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-lg border border-cyan-500/20 bg-gray-900/50 p-3"
            >
              <p className="mb-2 text-xs text-gray-400">Sample vector (first 12 values)</p>
              <p className="font-mono text-xs text-cyan-300">
                [{displayVector.map((v, i) => (
                  <motion.span
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    {v.toFixed(3)}
                    {i < displayVector.length - 1 ? ", " : ""}
                  </motion.span>
                ))}]
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {stage === "complete" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-green-500/30 bg-green-900/20 p-3"
          >
            <div className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-sm font-medium text-green-400">
                Data indexed and ready for search
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Proceed to Step 3 to search your indexed data
            </p>
          </motion.div>
        )}
      </div>
    </GlassPanel>
  );
}
