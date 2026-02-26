"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ModeToggle } from "@/components/ModeToggle";
import { PipelineStages } from "@/components/PipelineStages";
import {
  ChunkingViz,
  EmbeddingsViz,
  SimilaritySearchViz,
  ShortcomingViz,
  HybridSearchViz,
  LLMAnswerViz,
} from "@/components/modules";
import type { EmbeddingModelId, TrapDemoResponse, HybridCompareResponse, RAGResponse, DenseSearchResult } from "@/types";

const STAGE_IDS = ["ingest", "embed", "search", "shortcoming", "hybrid", "answer"] as const;

export default function Home() {
  const [mode, setMode] = useState<"step" | "flow">("step");
  const [activeStep, setActiveStep] = useState(0);
  const [chunks, setChunks] = useState<string[]>([]);
  const [isIndexed, setIsIndexed] = useState(false);
  const [indexedModel, setIndexedModel] = useState<EmbeddingModelId>("azure-openai");
  const [indexedChunkCount, setIndexedChunkCount] = useState(0);
  const [sessionId, setSessionId] = useState(() => Date.now());

  // Module state persistence - only reset on session reset
  const [similaritySearchState, setSimilaritySearchState] = useState<{
    query: string;
    results: DenseSearchResult[] | null;
  }>({ query: "", results: null });
  
  const [shortcomingState, setShortcomingState] = useState<{
    query: string;
    results: TrapDemoResponse | null;
  }>({ query: "How to secure an API", results: null });
  
  const [hybridSearchState, setHybridSearchState] = useState<{
    query: string;
    results: HybridCompareResponse | null;
  }>({ query: "", results: null });
  
  const [llmAnswerState, setLlmAnswerState] = useState<{
    query: string;
    results: RAGResponse | null;
  }>({ query: "", results: null });

  const activeStage = mode === "step" ? STAGE_IDS[activeStep] ?? null : null;

  const handleChunksReady = useCallback((c: string[]) => {
    setChunks(c);
    setIsIndexed(false);
    setIndexedChunkCount(0);
  }, []);

  const handleIndexed = useCallback((indexed: boolean, model: EmbeddingModelId) => {
    setIsIndexed(indexed);
    setIndexedModel(model);
    if (indexed) {
      setIndexedChunkCount(chunks.length);
    }
  }, [chunks.length]);

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setChunks([]);
    setIsIndexed(false);
    setIndexedModel("azure-openai");
    setIndexedChunkCount(0);
    setSessionId(Date.now());
    // Reset all module states
    setSimilaritySearchState({ query: "", results: null });
    setShortcomingState({ query: "How to secure an API", results: null });
    setHybridSearchState({ query: "", results: null });
    setLlmAnswerState({ query: "", results: null });
  }, []);

  return (
    <div className="min-h-screen classified-bg">
      <header className="border-b border-cyan-500/20 bg-gray-900/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
                <span className="text-xl">🔐</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight text-white">
                    ARIS
                  </h1>
                  <span className="classified-badge">CLASSIFIED</span>
                </div>
                <p className="text-sm text-gray-400">
                  Advanced Retrieval Intelligence System — RAG Pipeline Demo
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {isIndexed && (
                <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-900/20 px-3 py-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-green-400 font-medium">
                    {indexedChunkCount} chunks indexed
                  </span>
                </div>
              )}
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-900/40 hover:border-red-500/50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                RESET SESSION
              </button>
              <ModeToggle mode={mode} onModeChange={setMode} />
            </div>
          </div>
          <div className="mt-4">
            <PipelineStages activeStage={activeStage} mode={mode} />
            {mode === "step" && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                  disabled={activeStep === 0}
                  className="rounded-lg border border-cyan-500/30 bg-gray-800/50 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-gray-700/50 hover:border-cyan-400/50 disabled:opacity-40"
                >
                  ← PREV
                </button>
                <div className="flex-1 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gray-800/50 border border-cyan-500/20">
                    {STAGE_IDS.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveStep(i)}
                        className={`h-2.5 w-2.5 rounded-full transition-all ${
                          i === activeStep 
                            ? "bg-cyan-400 scale-125 shadow-lg shadow-cyan-400/50" 
                            : i < activeStep 
                              ? "bg-green-500" 
                              : "bg-gray-600 hover:bg-gray-500"
                        }`}
                      />
                    ))}
                    <span className="ml-3 text-sm text-gray-400 font-mono">
                      {activeStep + 1}/{STAGE_IDS.length}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setActiveStep((s) =>
                      s >= STAGE_IDS.length - 1 ? s : s + 1
                    )
                  }
                  disabled={activeStep >= STAGE_IDS.length - 1}
                  className="rounded-lg border border-cyan-500/30 bg-gray-800/50 px-4 py-2 text-sm font-medium text-cyan-300 transition hover:bg-gray-700/50 hover:border-cyan-400/50 disabled:opacity-40"
                >
                  NEXT →
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {mode === "step" ? (
            <motion.div
              key={`step-${activeStep}-${sessionId}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {activeStep === 0 && (
                <ChunkingViz
                  key={`chunk-${sessionId}`}
                  active={true}
                  onChunksReady={handleChunksReady}
                />
              )}
              {activeStep === 1 && (
                <EmbeddingsViz
                  key={`embed-${sessionId}`}
                  active={true}
                  chunks={chunks}
                  onIndexed={handleIndexed}
                />
              )}
              {activeStep === 2 && (
                <SimilaritySearchViz 
                  key={`search-${sessionId}`}
                  active={true} 
                  isIndexed={isIndexed}
                  indexedModel={indexedModel}
                  chunkCount={indexedChunkCount}
                  persistedState={similaritySearchState}
                  onStateChange={setSimilaritySearchState}
                />
              )}
              {activeStep === 3 && (
                <ShortcomingViz 
                  key={`shortcoming-${sessionId}`}
                  active={true}
                  isIndexed={isIndexed}
                  indexedModel={indexedModel}
                  persistedState={shortcomingState}
                  onStateChange={setShortcomingState}
                />
              )}
              {activeStep === 4 && (
                <HybridSearchViz 
                  key={`hybrid-${sessionId}`}
                  active={true}
                  isIndexed={isIndexed}
                  indexedModel={indexedModel}
                  persistedState={hybridSearchState}
                  onStateChange={setHybridSearchState}
                />
              )}
              {activeStep === 5 && (
                <LLMAnswerViz 
                  key={`llm-${sessionId}`}
                  active={true}
                  isIndexed={isIndexed}
                  indexedModel={indexedModel}
                  persistedState={llmAnswerState}
                  onStateChange={setLlmAnswerState}
                />
              )}
            </motion.div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <ChunkingViz
                key={`chunk-flow-${sessionId}`}
                active={activeStage === "ingest"}
                onChunksReady={handleChunksReady}
              />
              <EmbeddingsViz
                key={`embed-flow-${sessionId}`}
                active={activeStage === "embed"}
                chunks={chunks}
                onIndexed={handleIndexed}
              />
              <SimilaritySearchViz 
                key={`search-flow-${sessionId}`}
                active={activeStage === "search"}
                isIndexed={isIndexed}
                indexedModel={indexedModel}
                chunkCount={indexedChunkCount}
                persistedState={similaritySearchState}
                onStateChange={setSimilaritySearchState}
              />
              <ShortcomingViz 
                key={`shortcoming-flow-${sessionId}`}
                active={activeStage === "shortcoming"}
                isIndexed={isIndexed}
                indexedModel={indexedModel}
                persistedState={shortcomingState}
                onStateChange={setShortcomingState}
              />
              <HybridSearchViz 
                key={`hybrid-flow-${sessionId}`}
                active={activeStage === "hybrid"}
                isIndexed={isIndexed}
                indexedModel={indexedModel}
                persistedState={hybridSearchState}
                onStateChange={setHybridSearchState}
              />
              <div className="lg:col-span-2">
                <LLMAnswerViz 
                  key={`llm-flow-${sessionId}`}
                  active={activeStage === "answer"}
                  isIndexed={isIndexed}
                  indexedModel={indexedModel}
                  persistedState={llmAnswerState}
                  onStateChange={setLlmAnswerState}
                />
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
